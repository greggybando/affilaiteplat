import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// User submits a checkpoint
export async function POST(request: NextRequest) {
  console.log('[Checkpoint Submit API] Starting submission...')
  
  try {
    console.log('[Checkpoint Submit API] Getting affiliate...')
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      console.error('[Checkpoint Submit API] No affiliate found - unauthorized')
      return NextResponse.json({ error: 'Unauthorized - please log in again' }, { status: 401 })
    }
    console.log('[Checkpoint Submit API] Affiliate found:', affiliate.id, affiliate.email)

    const body = await request.json()
    console.log('[Checkpoint Submit API] Request body:', {
      checkpointId: body.checkpointId,
      hasSubmissionText: !!body.submissionText,
      textLength: body.submissionText?.length,
      hasScreenshotUrl: !!body.screenshotUrl,
      hasSubmissionUrl: !!body.submissionUrl
    })

    const { checkpointId, submissionText, submissionUrl, screenshotUrl, lockinId } = body

    if (!checkpointId || !submissionText) {
      console.error('[Checkpoint Submit API] Missing required fields:', { checkpointId: !!checkpointId, submissionText: !!submissionText })
      return NextResponse.json(
        { error: 'Missing required fields: checkpointId, submissionText' },
        { status: 400 }
      )
    }

    // Validate submission text length (min 20 chars)
    const textLength = submissionText.trim().length
    if (textLength < 20) {
      console.error('[Checkpoint Submit API] Text too short:', textLength)
      return NextResponse.json(
        { error: `Submission text must be at least 20 characters (you have ${textLength})` },
        { status: 400 }
      )
    }

    console.log('[Checkpoint Submit API] Looking up checkpoint:', checkpointId)
    // Check if checkpoint exists and get its details
    const { data: checkpoint, error: checkpointError } = await supabaseAdmin
      .from('checkpoints')
      .select('*')
      .eq('id', checkpointId)
      .single()

    if (checkpointError) {
      console.error('[Checkpoint Submit API] Checkpoint lookup error:', checkpointError)
      return NextResponse.json(
        { error: 'Checkpoint not found', details: checkpointError.message },
        { status: 404 }
      )
    }

    if (!checkpoint) {
      console.error('[Checkpoint Submit API] Checkpoint not found for ID:', checkpointId)
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      )
    }

    console.log('[Checkpoint Submit API] Checkpoint found:', (checkpoint as any).id, (checkpoint as any).title)

    // Check if user already has a submission for this checkpoint
    console.log('[Checkpoint Submit API] Checking for existing submissions...')
    const { data: existingSubmissions, error: existingError } = await supabaseAdmin
      .from('user_checkpoints')
      .select('id, status')
      .eq('user_id', affiliate.id)
      .eq('checkpoint_id', checkpointId)
      .order('submitted_at', { ascending: false })
      .limit(1)

    if (existingError) {
      console.warn('[Checkpoint Submit API] Error checking existing submissions (continuing):', existingError)
    }

    // Get the first submission if it exists (or null if none)
    const existingSubmission = existingSubmissions && existingSubmissions.length > 0 ? existingSubmissions[0] : null
    console.log('[Checkpoint Submit API] Existing submission:', existingSubmission ? { id: (existingSubmission as any).id, status: (existingSubmission as any).status } : 'none')

    let userCheckpointId: string
    const checkpointData = checkpoint as any
    const existingSubmissionData = existingSubmission as any
    let needsAiReview = checkpointData.ai_review_enabled && !checkpointData.requires_manual_review

    console.log('[Checkpoint Submit API] AI Review needed:', needsAiReview, 'Manual review required:', checkpointData.requires_manual_review)

    // Create or update submission
    if (existingSubmissionData && existingSubmissionData.status === 'denied') {
      console.log('[Checkpoint Submit API] Updating denied submission (resubmission)...')
      // Update existing denied submission (resubmission)
      const { data: updated, error: updateError } = await (supabaseAdmin as any)
        .from('user_checkpoints')
        .update({
          submission_text: submissionText,
          submission_url: submissionUrl || null,
          screenshot_url: screenshotUrl || null,
          status: 'pending',
          ai_status: null,
          ai_reason: null,
          ai_confidence: null,
          admin_feedback: null,
          submitted_at: new Date().toISOString(),
          reviewed_at: null,
          lockin_id: lockinId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubmissionData.id)
        .select('id')
        .single()

      if (updateError) {
        throw updateError
      }

      userCheckpointId = updated.id
      console.log('[Checkpoint Submit API] Submission updated:', userCheckpointId)
    } else {
      // Create new submission
      console.log('[Checkpoint Submit API] Creating new submission...')
      const insertData = {
        user_id: affiliate.id,
        checkpoint_id: checkpointId,
        submission_text: submissionText.trim(),
        submission_url: submissionUrl || null,
        screenshot_url: screenshotUrl || null,
        status: checkpointData.requires_manual_review ? 'needs_review' : 'pending',
        lockin_id: lockinId || null
      }
      console.log('[Checkpoint Submit API] Insert data:', { ...insertData, submission_text: insertData.submission_text.substring(0, 50) + '...' })

      const { data: newSubmission, error: insertError } = await (supabaseAdmin as any)
        .from('user_checkpoints')
        .insert(insertData as any)
        .select('id')
        .single()

      if (insertError) {
        console.error('[Checkpoint Submit API] Insert error:', insertError)
        console.error('[Checkpoint Submit API] Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        })
        throw insertError
      }

      if (!newSubmission || !newSubmission.id) {
        console.error('[Checkpoint Submit API] Insert succeeded but no ID returned')
        throw new Error('Failed to create submission - no ID returned')
      }

      userCheckpointId = newSubmission.id
      console.log('[Checkpoint Submit API] New submission created:', userCheckpointId)
    }

    // If AI review is enabled and not requiring manual review, run AI review
    if (needsAiReview && checkpointData.ai_review_enabled) {
      try {
        const aiResponse = await fetch(`${request.nextUrl.origin}/api/checkpoints/ai-review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkpointId,
            submissionText,
            screenshotUrl,
            requirements: checkpointData.requirements,
            customPrompt: checkpointData.ai_review_prompt,
            checkpointTitle: checkpointData.title  // Pass title for AI context
          })
        })

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json()

          // Update submission with AI results
          const finalStatus = aiResult.status === 'approved' 
            ? 'approved' 
            : aiResult.status === 'denied' 
            ? 'denied' 
            : 'needs_review'

          await (supabaseAdmin as any)
            .from('user_checkpoints')
            .update({
              status: finalStatus,
              ai_status: aiResult.status,
              ai_reason: aiResult.reason,
              ai_confidence: aiResult.confidence,
              reviewed_at: finalStatus === 'approved' ? new Date().toISOString() : null
            })
            .eq('id', userCheckpointId)

          // If approved, unlock next section/video dynamically
          if (finalStatus === 'approved') {
            console.log(`[Checkpoint Submit API] Checkpoint ${checkpointId} approved for user ${affiliate.id}. Calculating next unlock...`)
            
            // Get the checkpoint's section and video info
            const { data: checkpointInfo } = await (supabaseAdmin as any)
              .from('checkpoints')
              .select('section_id, video_id')
              .eq('id', checkpointId)
              .single()

            console.log(`[Checkpoint Submit API] Checkpoint info:`, JSON.stringify(checkpointInfo))
            
            if (checkpointInfo) {
              // Check if this is a VIDEO-LEVEL checkpoint
              if (checkpointInfo.video_id) {
                console.log(`[Checkpoint Submit API] *** VIDEO-LEVEL checkpoint detected (video_id=${checkpointInfo.video_id}) - will NOT unlock section ***`)
                
                // Get the current video's info
                const { data: currentVideo } = await (supabaseAdmin as any)
                  .from('course_videos')
                  .select('id, section_id, display_order')
                  .eq('id', checkpointInfo.video_id)
                  .single()

                if (currentVideo) {
                  // Find the NEXT video in this section
                  const { data: nextVideo } = await (supabaseAdmin as any)
                    .from('course_videos')
                    .select('id, display_order')
                    .eq('section_id', currentVideo.section_id)
                    .gt('display_order', currentVideo.display_order)
                    .order('display_order', { ascending: true })
                    .limit(1)
                    .single()

                  if (nextVideo) {
                    console.log(`[Checkpoint Submit API] Unlocking video ${nextVideo.id}`)
                    
                    // Get course type for the unlock record
                    const { data: sectionData } = await (supabaseAdmin as any)
                      .from('course_sections')
                      .select('course_categories(course_type)')
                      .eq('id', currentVideo.section_id)
                      .single()

                    const courseType = sectionData?.course_categories?.course_type || 'dreamjob'

                    // Save the video unlock
                    const { error: unlockError } = await (supabaseAdmin as any)
                      .from('user_video_unlocks')
                      .upsert({
                        user_id: affiliate.id,
                        course_type: courseType,
                        section_id: currentVideo.section_id,
                        video_id: nextVideo.id,
                        unlocked_at: new Date().toISOString()
                      }, {
                        onConflict: 'user_id,video_id'
                      })
                    
                    if (unlockError) {
                      console.error('[Checkpoint Submit API] Error saving video unlock:', unlockError)
                    } else {
                      console.log(`[Checkpoint Submit API] Video ${nextVideo.id} unlocked successfully`)
                    }
                  }
                }
                // For video-level checkpoints, do NOT unlock sections.
                return NextResponse.json({
                  success: true,
                  status: finalStatus,
                  aiReason: aiResult.reason,
                  missing: aiResult.missing || [],
                  confidence: aiResult.confidence,
                  unlockedVideo: true
                })
              }
              
              // SECTION-LEVEL checkpoint (or video checkpoint at end of section)
              // Get the section details
              const { data: sectionData } = await (supabaseAdmin as any)
                .from('course_sections')
                .select('id, display_order, category_id, course_categories(course_type)')
                .eq('id', checkpointInfo.section_id)
                .single()

              if (sectionData && !checkpointInfo.video_id) {
                const courseType = sectionData.course_categories?.course_type || 'dreamjob'
                const currentDisplayOrder = sectionData.display_order
                
                // Find the NEXT section by display_order
                const { data: nextSection } = await (supabaseAdmin as any)
                  .from('course_sections')
                  .select('id, display_order')
                  .eq('category_id', sectionData.category_id)
                  .gt('display_order', currentDisplayOrder)
                  .order('display_order', { ascending: true })
                  .limit(1)
                  .single()

                if (nextSection) {
                  // Module ID = display_order + 1 (0-indexed to 1-indexed)
                  const nextModuleId = nextSection.display_order + 1
                  
                  console.log(`[Checkpoint Submit API] Unlocking module ${nextModuleId} (display_order: ${nextSection.display_order}) for course ${courseType}`)
                  
                  // Save the unlock
                  const { error: unlockError } = await (supabaseAdmin as any)
                    .from('user_module_unlocks')
                    .upsert({
                      user_id: affiliate.id,
                      course_type: courseType,
                      module_id: nextModuleId,
                      unlocked_at: new Date().toISOString()
                    }, {
                      onConflict: 'user_id,course_type,module_id'
                    })
                  
                  if (unlockError) {
                    console.error('[Checkpoint Submit API] Error saving unlock:', unlockError)
                  } else {
                    console.log(`[Checkpoint Submit API] Module ${nextModuleId} unlocked successfully`)
                  }
                } else {
                  console.log('[Checkpoint Submit API] No next section found - user has completed all sections')
                }
              }
            }
          } else {
            console.log(`[Checkpoint Submit API] Checkpoint status: ${finalStatus} (not approved)`)
          }

          return NextResponse.json({
            success: true,
            status: finalStatus,
            aiReason: aiResult.reason,
            missing: aiResult.missing || [],
            confidence: aiResult.confidence
          })
        }
      } catch (aiError) {
        console.error('AI review error:', aiError)
        // Continue with manual review if AI fails
      }
    }

    // If manual review required or AI review failed, return needs_review status
    console.log('[Checkpoint Submit API] Submission successful, returning needs_review status')
    return NextResponse.json({
      success: true,
      status: 'needs_review',
      message: 'Submitted! Under review, you\'ll be notified within 24 hours.'
    })

  } catch (error: any) {
    console.error('Checkpoint submission error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return NextResponse.json(
      { 
        error: 'Failed to submit checkpoint', 
        message: error.message || 'An unexpected error occurred',
        details: error.details,
        hint: error.hint
      },
      { status: 500 }
    )
  }
}

// Helper: Check and unlock content based on approved checkpoint
async function checkAndUnlockContent(userId: string, checkpointId: string) {
  console.log(`[Unlock] Checkpoint ${checkpointId} approved for user ${userId}. Checking unlock rules...`)
  
  // Find all unlock rules that require this checkpoint
  const { data: unlockRules } = await supabaseAdmin
    .from('unlock_rules')
    .select('*')
    .eq('required_checkpoint_id', checkpointId)

  if (!unlockRules || unlockRules.length === 0) {
    console.log(`[Unlock] No explicit unlock rules found. Sequential unlock will be handled by database function.`)
    return
  }

  // For explicit unlock rules, the database function will handle it
  // The is_section_unlocked function checks both explicit rules and sequential unlock
  console.log(`[Unlock] Found ${unlockRules.length} unlock rule(s). Database function will handle unlocking.`)
  
  // The actual unlock check happens when the frontend calls /api/user/unlocks
  // which uses the is_section_unlocked database function
}

