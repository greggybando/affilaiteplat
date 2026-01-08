import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

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

// AI Review endpoint - Called when user submits checkpoint
export async function POST(request: NextRequest) {
  try {
    const { checkpointId, submissionText, screenshotUrl, requirements, customPrompt, checkpointTitle } = await request.json()

    if (!checkpointId || !submissionText || !requirements) {
      return NextResponse.json(
        { error: 'Missing required fields: checkpointId, submissionText, requirements' },
        { status: 400 }
      )
    }

    // Fetch screenshot image if provided
    let imageBase64: string | undefined
    if (screenshotUrl) {
      try {
        // Since it's a public URL, fetch directly via HTTP
        const response = await fetch(screenshotUrl)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          imageBase64 = buffer.toString('base64')
        } else {
          console.error('Failed to fetch screenshot, status:', response.status)
        }
      } catch (error) {
        console.error('Error fetching screenshot:', error)
        // Continue without image if fetch fails
      }
    }

    // Build prompt - use checkpoint title for context
    const moduleName = checkpointTitle || 'this module'
    
    // Check if this is a simple "explain what you learned" checkpoint
    const isSimpleCheckpoint = requirements?.toLowerCase().includes('sentence explaining what you learned') ||
                               requirements?.toLowerCase().includes('write a sentence')
    
    const prompt = customPrompt || (isSimpleCheckpoint 
      ? `Review this checkpoint submission for "${moduleName}".

Checkpoint requirement: ${requirements}

User submitted:
- Text: ${submissionText}
${imageBase64 ? '- Screenshot: [attached image]' : ''}

The requirement is simple: the user should submit a sentence explaining what they learned.

Respond with JSON only:
{
  "status": "approved" | "denied" | "needs_review",
  "reason": "brief explanation shown to user",
  "missing": ["list of missing items if denied"],
  "confidence": 0-100
}

Rules:
- approved: User submitted a sentence (even a short one) explaining what they learned (confidence > 70)
- denied: Submission is completely unrelated or empty
- needs_review: Unclear or edge case, flag for admin

Be lenient - if they wrote anything that relates to learning from the module, approve it.`
      : `Review this checkpoint submission for "${moduleName}".

Checkpoint requirement: ${requirements}

User submitted:
- Text: ${submissionText}
${imageBase64 ? '- Screenshot: [attached image]' : ''}

Analyze if the submission shows proof of completing the requirements.

Respond with JSON only:
{
  "status": "approved" | "denied" | "needs_review",
  "reason": "brief explanation shown to user",
  "missing": ["list of missing items if denied"],
  "confidence": 0-100
}

Rules:
- approved: Clear evidence of completion (confidence > 80)
- denied: Clearly missing key requirements
- needs_review: Unclear or edge case, flag for admin`)

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
      // Determine image type from URL or default to png
      const imageType = screenshotUrl.includes('.jpg') || screenshotUrl.includes('.jpeg') 
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

    // Extract response text
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''

    // Parse JSON response
    let aiResult: {
      status: 'approved' | 'denied' | 'needs_review'
      reason: string
      missing?: string[]
      confidence: number
    }

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : responseText
      aiResult = JSON.parse(jsonText)
    } catch (error) {
      console.error('Error parsing AI response:', error, 'Response:', responseText)
      // Fallback to needs_review if parsing fails
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

    return NextResponse.json({
      status: aiResult.status,
      reason: aiResult.reason || 'No reason provided',
      missing: aiResult.missing || [],
      confidence: aiResult.confidence
    })

  } catch (error: any) {
    console.error('AI review error:', error)
    return NextResponse.json(
      { 
        error: 'AI review failed',
        message: error.message || 'Failed to process AI review'
      },
      { status: 500 }
    )
  }
}

