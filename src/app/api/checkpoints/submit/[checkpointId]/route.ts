import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Get Anthropic client
function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }
  return new Anthropic({ apiKey })
}

// POST - Submit checkpoint
export async function POST(
  request: NextRequest,
  { params }: { params: { checkpointId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { submission_text, screenshot_url } = body

    if (!submission_text || submission_text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Submission text must be at least 50 characters' },
        { status: 400 }
      )
    }

    // Step 1: Get checkpoint details
    const { data: checkpoint, error: checkpointError } = await supabaseAdmin
      .from('checkpoints')
      .select('*')
      .eq('id', params.checkpointId)
      .single()

    if (checkpointError || !checkpoint) {
      return NextResponse.json({ error: 'Checkpoint not found' }, { status: 404 })
    }

    const checkpointData = checkpoint as any

    // Step 2: Create user_checkpoint entry with status 'pending'
    const { data: existingSubmission } = await (supabaseAdmin as any)
      .from('user_checkpoints')
      .select('id, status')
      .eq('user_id', affiliate.id)
      .eq('checkpoint_id', params.checkpointId)
      .single()

    let userCheckpointId: string
    let initialStatus: string

    // Step 2a: If checkpoint.requires_manual_review = true → set status = 'needs_review'
    if (checkpointData.requires_manual_review) {
      initialStatus = 'needs_review'
    } else {
      initialStatus = 'pending'
    }

    if (existingSubmission) {
      const existingSubmissionData = existingSubmission as any
      // Update existing submission (resubmission)
      const { data: updated, error: updateError } = await (supabaseAdmin as any)
        .from('user_checkpoints')
        .update({
          submission_text: submission_text.trim(),
          screenshot_url: screenshot_url || null,
          status: initialStatus,
          ai_review_passed: null,
          ai_review_notes: null,
          ai_confidence: null,
          admin_feedback: null,
          submitted_at: new Date().toISOString(),
          reviewed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubmissionData.id)
        .select('id')
        .single()

      if (updateError) {
        throw updateError
      }

      userCheckpointId = updated.id
    } else {
      // Create new submission
      const { data: newSubmission, error: insertError } = await (supabaseAdmin as any)
        .from('user_checkpoints')
        .insert({
          user_id: affiliate.id,
          checkpoint_id: params.checkpointId,
          submission_text: submission_text.trim(),
          screenshot_url: screenshot_url || null,
          status: initialStatus
        })
        .select('id')
        .single()

      if (insertError) {
        throw insertError
      }

      userCheckpointId = newSubmission.id
    }

    // Step 2b: If requires_manual_review, return early
    if (checkpointData.requires_manual_review) {
      return NextResponse.json({
        status: 'needs_review',
        reason: 'This checkpoint requires manual review. You\'ll be notified when reviewed.',
        message: 'Submitted! Under review, you\'ll be notified within 24 hours.'
      })
    }

    // Step 3: If checkpoint.ai_review_enabled = true → call Claude Vision API
    if (checkpointData.ai_review_enabled) {
      try {
        // Fetch screenshot image if provided
        let imageBase64: string | undefined
        if (screenshot_url) {
          try {
            const response = await fetch(screenshot_url)
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              imageBase64 = buffer.toString('base64')
            }
          } catch (error) {
            console.error('[Checkpoint Submit] Error fetching screenshot:', error)
            // Continue without image if fetch fails
          }
        }

        // Build Claude prompt
        const prompt = `You are reviewing a course checkpoint submission.
CHECKPOINT TITLE: ${checkpointData.title}
REQUIREMENTS: ${checkpointData.requirements}
GRADING INSTRUCTIONS: ${checkpointData.ai_grading_prompt || 'Review the submission and determine if it meets the requirements.'}
USER'S SUBMISSION TEXT:
${submission_text}
${imageBase64 ? '[Screenshot attached]' : ''}

Review the submission and screenshot (if provided). Does it meet the requirements?
Respond with JSON only:
{
  "status": "approved" | "denied" | "needs_review",
  "reason": "1-2 sentence explanation shown to user",
  "missing": ["item 1", "item 2"],
  "confidence": 85
}

Guidelines:
- "approved": Submission clearly meets requirements (confidence > 80)
- "denied": Clearly missing key requirements, user should resubmit
- "needs_review": Unclear, edge case, or low confidence - flag for admin review`

        // Call Claude Vision API
        const anthropic = getAnthropic()
        const messages: any[] = [{
          role: 'user' as const,
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }]

        // Add image if available
        if (imageBase64) {
          const imageType = screenshot_url.includes('.jpg') || screenshot_url.includes('.jpeg')
            ? 'image/jpeg'
            : 'image/png'

          messages[0].content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageType,
              data: imageBase64
            }
          })
        }

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: messages as any,
        })

        // Extract and parse response
        const responseText = response.content[0].type === 'text'
          ? response.content[0].text
          : ''

        let aiResult: {
          status: 'approved' | 'denied' | 'needs_review'
          reason: string
          missing?: string[]
          confidence: number
        }

        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          const jsonText = jsonMatch ? jsonMatch[0] : responseText
          aiResult = JSON.parse(jsonText)
        } catch (error) {
          console.error('[Checkpoint Submit] Error parsing AI response:', error)
          aiResult = {
            status: 'needs_review',
            reason: 'AI review encountered an error. Manual review required.',
            confidence: 0
          }
        }

        // Validate AI result
        if (!['approved', 'denied', 'needs_review'].includes(aiResult.status)) {
          aiResult.status = 'needs_review'
        }
        if (typeof aiResult.confidence !== 'number' || aiResult.confidence < 0 || aiResult.confidence > 100) {
          aiResult.confidence = 50
        }

        // Step 4: Parse Claude response, update user_checkpoint
        const finalStatus = aiResult.status
        const reviewedAt = (finalStatus === 'approved' || finalStatus === 'denied') 
          ? new Date().toISOString() 
          : null

        await (supabaseAdmin as any)
          .from('user_checkpoints')
          .update({
            status: finalStatus,
            ai_review_passed: finalStatus === 'approved',
            ai_review_notes: aiResult.reason,
            ai_confidence: aiResult.confidence,
            reviewed_at: reviewedAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', userCheckpointId)

        // Step 5: Return result to frontend
        return NextResponse.json({
          status: finalStatus,
          reason: aiResult.reason,
          missing: aiResult.missing || [],
          confidence: aiResult.confidence
        })

      } catch (aiError: any) {
        console.error('[Checkpoint Submit] AI review error:', aiError)
        // If AI fails, set status to needs_review
        await (supabaseAdmin as any)
          .from('user_checkpoints')
          .update({
            status: 'needs_review',
            ai_review_notes: 'AI review failed. Manual review required.',
            updated_at: new Date().toISOString()
          })
          .eq('id', userCheckpointId)

        return NextResponse.json({
          status: 'needs_review',
          reason: 'AI review encountered an error. Manual review required.',
          message: 'Submitted! Under review, you\'ll be notified within 24 hours.'
        })
      }
    }

    // If AI review not enabled, return pending status
    return NextResponse.json({
      status: 'pending',
      reason: 'Submission received. Review pending.',
      message: 'Submitted! Under review, you\'ll be notified within 24 hours.'
    })

  } catch (error: any) {
    console.error('[Checkpoint Submit] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit checkpoint' },
      { status: 500 }
    )
  }
}

