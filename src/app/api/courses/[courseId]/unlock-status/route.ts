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

    // Step 1: Get course info (including globally_unlocked flag)
    const { data: courseData, error: courseError } = await (supabaseAdmin as any)
      .from('courses')
      .select('id, title, slug, globally_unlocked')
      .eq('id', params.courseId)
      .single()

    if (courseError) {
      console.error('[Unlock Status] Error fetching course:', courseError)
      return NextResponse.json({ error: courseError.message }, { status: 500 })
    }

    const course = courseData as { id: string; title: string; slug: string; globally_unlocked: boolean }

    // Step 2: Get all modules for courseId, ordered by sort_order
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

    // Step 3: Get user-specific unlocks (course-level and module-level)
    const { data: userCourseUnlocksData } = await (supabaseAdmin as any)
      .from('user_course_unlocks')
      .select('course_id')
      .eq('user_id', userId)
      .eq('course_id', params.courseId)
      .single()
      .catch(() => ({ data: null }))

    const { data: userModuleUnlocksData } = await (supabaseAdmin as any)
      .from('user_module_unlocks')
      .select('module_id')
      .eq('user_id', userId)
      .in('module_id', moduleIds)

    const userModuleUnlocks = new Set<string>()
    if (userModuleUnlocksData) {
      userModuleUnlocksData.forEach((u: any) => {
        if (u.module_id) userModuleUnlocks.add(u.module_id)
      })
    }

    // Step 4: Get all checkpoints for these modules
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

    // Step 5: Get user_checkpoints for current user
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

    // Step 6: Get unlock_rules for these modules (explicit rules override default behavior)
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
      // NEW DEFAULT BEHAVIOR: Sequential unlocking - all sections locked except first
      let isLocked = true // Default: LOCKED (changed from false)
      let lockReason: string | null = null

      // Check 1: Is course globally unlocked?
      if (course.globally_unlocked) {
        isLocked = false
        lockReason = null
      }
      // Check 2: Is this module user-unlocked?
      else if (userCourseUnlocksData || userModuleUnlocks.has(module.id)) {
        isLocked = false
        lockReason = null
      }
      // Check 3: Is this the first section (lowest sort_order)?
      else if (index === 0 || module.sort_order === 0) {
        isLocked = false
        lockReason = null
      }
      // Check 4: Explicit unlock rule (overrides default sequential behavior)
      else {
        const requiredCheckpointId = unlockRuleMap.get(module.id)
        
        if (requiredCheckpointId) {
          // Custom unlock rule exists - check if required checkpoint is approved
          const requiredStatus = userCheckpointStatusMap.get(requiredCheckpointId)
          if (requiredStatus !== 'approved') {
            isLocked = true
            const requiredCheckpoint = checkpoints.find((cp) => cp.id === requiredCheckpointId)
            lockReason = requiredCheckpoint
              ? `Complete "${requiredCheckpoint.title}" to unlock this module`
              : 'Complete the required checkpoint to unlock this module'
          } else {
            isLocked = false
            lockReason = null
          }
        }
        // Check 5: Default sequential logic - find previous section WITH a checkpoint
        else {
          // Find the previous section that HAS a checkpoint
          let previousCheckpointSection: Module | null = null
          let previousCheckpoint: Checkpoint | null = null
          
          // Look backwards through modules to find the most recent one with a checkpoint
          for (let i = index - 1; i >= 0; i--) {
            const prevModule = modules[i]
            const prevCheckpoint = checkpointMap.get(prevModule.id)
            if (prevCheckpoint) {
              previousCheckpointSection = prevModule
              previousCheckpoint = prevCheckpoint
              break
            }
          }
          
          if (!previousCheckpointSection || !previousCheckpoint) {
            // No previous section with checkpoint found - unlock this section
            isLocked = false
            lockReason = null
          } else {
            // Previous section has checkpoint - check if it's approved
            const previousStatus = userCheckpointStatusMap.get(previousCheckpoint.id) || 'not_started'
            
            if (previousStatus === 'approved') {
              // Previous checkpoint approved - unlock this section
              isLocked = false
              lockReason = null
            } else {
              // Previous checkpoint not approved - lock this section
              isLocked = true
              lockReason = `Complete "${previousCheckpoint.title}" to unlock this module`
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

