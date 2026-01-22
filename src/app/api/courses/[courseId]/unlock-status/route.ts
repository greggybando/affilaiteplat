import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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
    const { data: modules, error: modulesError } = await supabaseAdmin
      .from('course_modules')
      .select('id, title, sort_order')
      .eq('course_id', params.courseId)
      .order('sort_order', { ascending: true })

    if (modulesError) {
      console.error('[Unlock Status] Error fetching modules:', modulesError)
      return NextResponse.json({ error: modulesError.message }, { status: 500 })
    }

    if (!modules || modules.length === 0) {
      return NextResponse.json({
        courseId: params.courseId,
        modules: []
      })
    }

    const moduleIds = modules.map((m: any) => m.id)

    // Step 2: Get all checkpoints for these modules
    const { data: checkpoints, error: checkpointsError } = await supabaseAdmin
      .from('checkpoints')
      .select('id, module_id, title')
      .in('module_id', moduleIds)

    if (checkpointsError) {
      console.error('[Unlock Status] Error fetching checkpoints:', checkpointsError)
      return NextResponse.json({ error: checkpointsError.message }, { status: 500 })
    }

    // Create checkpoint map by module_id
    const checkpointMap = new Map<string, any>()
    checkpoints?.forEach((cp: any) => {
      if (cp.module_id) {
        checkpointMap.set(cp.module_id, cp)
      }
    })

    const checkpointIds = checkpoints?.map((cp: any) => cp.id) || []

    // Step 3: Get user_checkpoints for current user
    const { data: userCheckpoints, error: userCheckpointsError } = checkpointIds.length > 0
      ? await supabaseAdmin
          .from('user_checkpoints')
          .select('checkpoint_id, status')
          .eq('user_id', userId)
          .in('checkpoint_id', checkpointIds)
      : { data: [], error: null }

    if (userCheckpointsError) {
      console.error('[Unlock Status] Error fetching user checkpoints:', userCheckpointsError)
      return NextResponse.json({ error: userCheckpointsError.message }, { status: 500 })
    }

    // Create user checkpoint status map
    const userCheckpointStatusMap = new Map<string, string>()
    userCheckpoints?.forEach((ucp: any) => {
      userCheckpointStatusMap.set(ucp.checkpoint_id, ucp.status)
    })

    // Step 4: Get unlock_rules for these modules
    const { data: unlockRules, error: unlockRulesError } = await supabaseAdmin
      .from('unlock_rules')
      .select('target_id_uuid, required_checkpoint_id')
      .eq('target_type', 'module')
      .in('target_id_uuid', moduleIds)

    if (unlockRulesError) {
      console.error('[Unlock Status] Error fetching unlock rules:', unlockRulesError)
      return NextResponse.json({ error: unlockRulesError.message }, { status: 500 })
    }

    // Create unlock rule map by module_id
    const unlockRuleMap = new Map<string, string>()
    unlockRules?.forEach((rule: any) => {
      if (rule.target_id_uuid) {
        unlockRuleMap.set(rule.target_id_uuid, rule.required_checkpoint_id)
      }
    })

    // Step 5: Build response for each module
    const modulesWithStatus = modules.map((module: any, index: number) => {
      const checkpoint = checkpointMap.get(module.id)
      const checkpointStatus = checkpoint
        ? (userCheckpointStatusMap.get(checkpoint.id) || 'not_started')
        : null

      // Determine if module is locked
      let isLocked = false
      let lockReason: string | null = null

      // a. Module with sort_order = 1 (first) is always unlocked
      if (module.sort_order === 1 || index === 0) {
        isLocked = false
      } else {
        // b. Check unlock_rules for this module
        const requiredCheckpointId = unlockRuleMap.get(module.id)

        if (requiredCheckpointId) {
          // Custom unlock rule exists - check if required checkpoint is approved
          const requiredStatus = userCheckpointStatusMap.get(requiredCheckpointId)
          if (requiredStatus !== 'approved') {
            isLocked = true
            const requiredCheckpoint = checkpoints?.find((cp: any) => cp.id === requiredCheckpointId)
            lockReason = requiredCheckpoint
              ? `Complete "${requiredCheckpoint.title}" to unlock this module`
              : 'Complete the required checkpoint to unlock this module'
          }
        } else {
          // No custom rule - check if previous module's checkpoint (if any) is approved
          const previousModule = modules[index - 1]
          if (previousModule) {
            const previousCheckpoint = checkpointMap.get(previousModule.id)
            if (previousCheckpoint) {
              const previousStatus = userCheckpointStatusMap.get(previousCheckpoint.id)
              if (previousStatus !== 'approved') {
                isLocked = true
                lockReason = `Complete "${previousCheckpoint.title}" to unlock this module`
              }
            }
          }
        }
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

