import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Module {
  id: string
  title: string
  sort_order: number
}

interface Checkpoint {
  id: string
  module_id: string
  title: string
}

interface UserCheckpoint {
  checkpoint_id: string
  status: string
}

interface UnlockRule {
  target_id_uuid: string
  required_checkpoint_id: string
}

// GET - Fetch unlock status for all modules in a course
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = affiliate.id

    // Step 1: Get all modules for courseId, ordered by sort_order
    const { data: modulesData, error: modulesError } = await (supabaseAdmin as any)
      .from('course_modules')
      .select('id, title, sort_order')
      .eq('course_id', params.courseId)
      .order('sort_order', { ascending: true })

    if (modulesError) {
      console.error('[Unlock Status] Error fetching modules:', modulesError)
      return NextResponse.json({ error: modulesError.message }, { status: 500 })
    }

    const modules = (modulesData || []) as Module[]

    if (modules.length === 0) {
      return NextResponse.json({
        courseId: params.courseId,
        modules: []
      })
    }

    const moduleIds = modules.map((m) => m.id)

    // Step 2: Get all checkpoints for these modules
    const { data: checkpointsData, error: checkpointsError } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id, module_id, title')
      .in('module_id', moduleIds)

    if (checkpointsError) {
      console.error('[Unlock Status] Error fetching checkpoints:', checkpointsError)
      return NextResponse.json({ error: checkpointsError.message }, { status: 500 })
    }

    const checkpoints = (checkpointsData || []) as Checkpoint[]

    // Create checkpoint map by module_id
    const checkpointMap = new Map<string, Checkpoint>()
    checkpoints.forEach((cp) => {
      if (cp.module_id) {
        checkpointMap.set(cp.module_id, cp)
      }
    })

    const checkpointIds = checkpoints.map((cp) => cp.id)

    // Step 3: Get user_checkpoints for current user
    const { data: userCheckpointsData, error: userCheckpointsError } = checkpointIds.length > 0
      ? await (supabaseAdmin as any)
          .from('user_checkpoints')
          .select('checkpoint_id, status')
          .eq('user_id', userId)
          .in('checkpoint_id', checkpointIds)
      : { data: [], error: null }

    if (userCheckpointsError) {
      console.error('[Unlock Status] Error fetching user checkpoints:', userCheckpointsError)
      return NextResponse.json({ error: userCheckpointsError.message }, { status: 500 })
    }

    const userCheckpoints = (userCheckpointsData || []) as UserCheckpoint[]

    // Create user checkpoint status map
    const userCheckpointStatusMap = new Map<string, string>()
    userCheckpoints.forEach((ucp) => {
      userCheckpointStatusMap.set(ucp.checkpoint_id, ucp.status)
    })

    // Step 4: Get unlock_rules for these modules
    const { data: unlockRulesData, error: unlockRulesError } = await (supabaseAdmin as any)
      .from('unlock_rules')
      .select('target_id_uuid, required_checkpoint_id')
      .eq('target_type', 'module')
      .in('target_id_uuid', moduleIds)

    if (unlockRulesError) {
      console.error('[Unlock Status] Error fetching unlock rules:', unlockRulesError)
      return NextResponse.json({ error: unlockRulesError.message }, { status: 500 })
    }

    const unlockRules = (unlockRulesData || []) as UnlockRule[]

    // Create unlock rule map by module_id
    const unlockRuleMap = new Map<string, string>()
    unlockRules.forEach((rule) => {
      if (rule.target_id_uuid) {
        unlockRuleMap.set(rule.target_id_uuid, rule.required_checkpoint_id)
      }
    })

    // Step 5: Build response for each module
    const modulesWithStatus = modules.map((module, index: number) => {
      const checkpoint = checkpointMap.get(module.id)
      const checkpointStatus = checkpoint
        ? (userCheckpointStatusMap.get(checkpoint.id) || 'not_started')
        : null

      // Determine if module is locked
      // Default: unlocked (modules unlock by default unless explicitly locked)
      let isLocked = false
      let lockReason: string | null = null

      // Debug logging for "The Game of Capitalism"
      const isDebugModule = module.title.toLowerCase().includes('game of capitalism')
      if (isDebugModule) {
        console.log('[Unlock Status] ===== DEBUGGING MODULE =====')
        console.log('[Unlock Status] Title:', module.title)
        console.log('[Unlock Status] ID:', module.id)
        console.log('[Unlock Status] sort_order:', module.sort_order)
        console.log('[Unlock Status] index:', index)
        console.log('[Unlock Status] Has checkpoint:', !!checkpoint)
        console.log('[Unlock Status] Checkpoint status:', checkpointStatus)
        console.log('[Unlock Status] All modules:', modules.map(m => ({ title: m.title, sort_order: m.sort_order })))
        console.log('[Unlock Status] Unlock rules:', Array.from(unlockRuleMap.entries()))
      }

      // a. First module (index 0 or sort_order 0) is always unlocked
      if (index === 0 || module.sort_order === 0) {
        isLocked = false
        if (isDebugModule) {
          console.log('[Unlock Status] ✓ Module is first, unlocked')
        }
      } else {
        // b. Check unlock_rules for this module FIRST (explicit rules take precedence)
        const requiredCheckpointId = unlockRuleMap.get(module.id)

        if (requiredCheckpointId) {
          // Custom unlock rule exists - check if required checkpoint is approved
          const requiredStatus = userCheckpointStatusMap.get(requiredCheckpointId)
          if (isDebugModule) {
            console.log('[Unlock Status] Has unlock rule:', {
              requiredCheckpointId,
              requiredStatus,
              allUserCheckpoints: Array.from(userCheckpointStatusMap.entries())
            })
          }
          if (requiredStatus !== 'approved') {
            isLocked = true
            const requiredCheckpoint = checkpoints.find((cp) => cp.id === requiredCheckpointId)
            lockReason = requiredCheckpoint
              ? `Complete "${requiredCheckpoint.title}" to unlock this module`
              : 'Complete the required checkpoint to unlock this module'
            if (isDebugModule) {
              console.log('[Unlock Status] ✗ LOCKED: Required checkpoint not approved')
            }
          } else {
            // Required checkpoint is approved, module is unlocked
            isLocked = false
            if (isDebugModule) {
              console.log('[Unlock Status] ✓ UNLOCKED: Required checkpoint approved')
            }
          }
        } else {
          // No custom rule - check sequential progression
          // Only lock if previous module has a checkpoint AND it's not approved
          const previousModule = modules[index - 1]
          if (previousModule) {
            const previousCheckpoint = checkpointMap.get(previousModule.id)
            if (isDebugModule) {
              console.log('[Unlock Status] Checking previous module:', {
                previousTitle: previousModule.title,
                previousId: previousModule.id,
                previousSortOrder: previousModule.sort_order,
                hasPreviousCheckpoint: !!previousCheckpoint,
                previousCheckpointId: previousCheckpoint?.id,
                previousCheckpointTitle: previousCheckpoint?.title,
                previousCheckpointStatus: previousCheckpoint ? userCheckpointStatusMap.get(previousCheckpoint.id) : null,
                allCheckpoints: Array.from(checkpointMap.entries()).map(([id, cp]) => ({ moduleId: id, checkpointTitle: cp.title }))
              })
            }
            if (previousCheckpoint) {
              // Previous module has a checkpoint - check status
              const previousStatus = userCheckpointStatusMap.get(previousCheckpoint.id) || 'not_started'
              if (isDebugModule) {
                console.log('[Unlock Status] Previous checkpoint status:', previousStatus, '(raw:', userCheckpointStatusMap.get(previousCheckpoint.id), ')')
              }
              // Only lock if status is explicitly NOT approved (denied, pending, needs_review)
              // If status is 'not_started' or null/undefined, unlock (allow progression)
              if (previousStatus === 'approved') {
                // Previous checkpoint is approved, module is unlocked
                isLocked = false
                if (isDebugModule) {
                  console.log('[Unlock Status] ✓ UNLOCKED: Previous checkpoint approved')
                }
              } else if (previousStatus === 'denied' || previousStatus === 'pending' || previousStatus === 'needs_review') {
                // Checkpoint exists but not approved - lock the module
                isLocked = true
                lockReason = `Complete "${previousCheckpoint.title}" to unlock this module`
                if (isDebugModule) {
                  console.log('[Unlock Status] ✗ LOCKED: Previous checkpoint not approved. Status:', previousStatus)
                }
              } else {
                // Status is 'not_started' or null/undefined - unlock to allow progression
                isLocked = false
                if (isDebugModule) {
                  console.log('[Unlock Status] ✓ UNLOCKED: Previous checkpoint not started (allowing progression)')
                }
              }
            } else {
              // If previous module has no checkpoint, this module is unlocked (sequential progression)
              isLocked = false
              if (isDebugModule) {
                console.log('[Unlock Status] ✓ UNLOCKED: Previous module has no checkpoint')
              }
            }
          } else {
            // No previous module (shouldn't happen if index > 0, but be safe)
            isLocked = false
            if (isDebugModule) {
              console.log('[Unlock Status] ✓ UNLOCKED: No previous module found')
            }
          }
        }
      }

      if (isDebugModule) {
        console.log('[Unlock Status] FINAL RESULT:', { isLocked, lockReason })
        console.log('[Unlock Status] ===== END DEBUG =====')
      }

      // Map checkpoint status to response format
      let checkpointStatusFormatted: 'none' | 'not_started' | 'pending' | 'approved' | 'denied' | 'needs_review' | null = null
      
      if (checkpoint) {
        if (checkpointStatus === 'pending') {
          checkpointStatusFormatted = 'pending'
        } else if (checkpointStatus === 'approved') {
          checkpointStatusFormatted = 'approved'
        } else if (checkpointStatus === 'denied') {
          checkpointStatusFormatted = 'denied'
        } else if (checkpointStatus === 'needs_review') {
          checkpointStatusFormatted = 'needs_review'
        } else {
          checkpointStatusFormatted = 'not_started'
        }
      } else {
        checkpointStatusFormatted = 'none'
      }

      return {
        id: module.id,
        title: module.title,
        sort_order: module.sort_order,
        isLocked,
        lockReason,
        checkpoint: checkpoint
          ? {
              id: checkpoint.id,
              title: checkpoint.title,
              status: checkpointStatusFormatted
            }
          : null
      }
    })

    return NextResponse.json({
      courseId: params.courseId,
      modules: modulesWithStatus
    })
  } catch (error: any) {
    console.error('[Unlock Status] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

