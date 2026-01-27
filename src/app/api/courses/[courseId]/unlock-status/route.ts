import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Module {
  id: string
  title: string
  sort_order: number
  globally_unlocked?: boolean
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
  { params }: { params: Promise<{ courseId: string }> | { courseId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params as Promise (Next.js 14)
    const resolvedParams = await Promise.resolve(params)
    const { courseId } = resolvedParams

    const userId = affiliate.id
    const isAdmin = affiliate.role === 'admin' || affiliate.role === 'moderator'

    console.log('[Unlock Status] Request:', { courseId, userId, isAdmin })

    // Step 1: Get course info (including globally_unlocked flag)
    const { data: courseData, error: courseError } = await (supabaseAdmin as any)
      .from('courses')
      .select('id, title, slug, globally_unlocked')
      .eq('id', courseId)
      .single()

    if (courseError) {
      console.error('[Unlock Status] Error fetching course:', courseError)
      return NextResponse.json({ error: courseError.message }, { status: 500 })
    }

    const course = courseData as { id: string; title: string; slug: string; globally_unlocked: boolean }

    // Step 2: Get all modules for courseId, ordered by sort_order (including globally_unlocked flag)
    const { data: modulesData, error: modulesError } = await (supabaseAdmin as any)
      .from('course_modules')
      .select('id, title, sort_order, globally_unlocked')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })

    if (modulesError) {
      console.error('[Unlock Status] Error fetching modules:', modulesError)
      return NextResponse.json({ error: modulesError.message }, { status: 500 })
    }

    const modules = (modulesData || []) as Module[]

    // Debug: Log the modules data to verify globally_unlocked is being fetched
    console.log('[Unlock Status] Fetched modules:', modules.map(m => ({
      id: m.id,
      title: m.title,
      globally_unlocked: m.globally_unlocked,
      globally_unlocked_type: typeof m.globally_unlocked
    })))

    if (modules.length === 0) {
      return NextResponse.json({
        courseId: courseId,
        modules: []
      })
    }

    const moduleIds = modules.map((m) => m.id)

    // Step 3: Get user-specific unlocks (course-level and module-level)
    const { data: userCourseUnlocksData, error: userCourseUnlocksError } = await (supabaseAdmin as any)
      .from('user_course_unlocks')
      .select('course_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()

    if (userCourseUnlocksError && userCourseUnlocksError.code !== 'PGRST116') {
      console.error('[Unlock Status] Error fetching user course unlocks:', userCourseUnlocksError)
    }

    const { data: userModuleUnlocksData, error: userModuleUnlocksError } = await (supabaseAdmin as any)
      .from('user_module_unlocks')
      .select('module_id')
      .eq('user_id', userId)
      .in('module_id', moduleIds.length > 0 ? moduleIds : ['00000000-0000-0000-0000-000000000000'])

    if (userModuleUnlocksError) {
      console.error('[Unlock Status] Error fetching user module unlocks:', userModuleUnlocksError)
      // Don't fail - just continue with empty set
    }

    const userModuleUnlocks = new Set<string>()
    if (userModuleUnlocksData) {
      userModuleUnlocksData.forEach((u: any) => {
        if (u.module_id) userModuleUnlocks.add(u.module_id)
      })
    }

    console.log('[Unlock Status] User unlocks:', {
      courseUnlock: !!userCourseUnlocksData,
      moduleUnlocks: Array.from(userModuleUnlocks),
      moduleIdsCount: moduleIds.length
    })

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
    
    // DEBUG: Log all user checkpoint statuses
    console.log('[Unlock Status] User checkpoint statuses:', Array.from(userCheckpointStatusMap.entries()).map(([cpId, status]) => {
      const cp = checkpoints.find(c => c.id === cpId)
      return {
        checkpointId: cpId,
        checkpointTitle: cp?.title || 'Unknown',
        moduleId: cp?.module_id || 'Unknown',
        status: status
      }
    }))

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

    // Find the first section (lowest sort_order) - this will always be unlocked
    const firstModule = modules.length > 0 
      ? modules.reduce((first, current) => 
          (current.sort_order < first.sort_order) ? current : first
        )
      : null
    const firstModuleId = firstModule?.id || null

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
      let wouldBeLocked = true // Track what the lock status would be for non-admins (for UI display)

      console.log(`[Unlock Status] Checking module "${module.title}": globally_unlocked=${module.globally_unlocked} (type: ${typeof module.globally_unlocked}), sort_order=${module.sort_order}, index=${index}`)

      // Check 0: Is course globally unlocked?
      if (course.globally_unlocked === true) {
        isLocked = false
        wouldBeLocked = false
        lockReason = null
        console.log(`[Unlock Status] Module "${module.title}" UNLOCKED: Course is globally unlocked`)
      }
      // Check 1: Admin explicitly LOCKED this module (globally_unlocked = false)
      else if (module.globally_unlocked === false) {
        isLocked = true
        wouldBeLocked = true
        lockReason = 'This module is locked'
        console.log(`[Unlock Status] Module "${module.title}" LOCKED: Admin locked`)
      }
      // Check 2: Admin explicitly UNLOCKED this module (globally_unlocked = true)
      else if (module.globally_unlocked === true) {
        isLocked = false
        wouldBeLocked = false
        lockReason = null
        console.log(`[Unlock Status] Module "${module.title}" UNLOCKED: Admin unlocked`)
      }
      // Check 3: User-specific unlock
      else if (userCourseUnlocksData || userModuleUnlocks.has(module.id)) {
        isLocked = false
        wouldBeLocked = false
        lockReason = null
        console.log(`[Unlock Status] Module "${module.title}" UNLOCKED: User-specific unlock`)
      }
      // Check 4: First section always unlocked
      // Only check firstModuleId or index=0, NOT sort_order=0 (multiple modules could have sort_order=0)
      else if (module.id === firstModuleId || index === 0) {
        isLocked = false
        wouldBeLocked = false
        lockReason = null
        console.log(`[Unlock Status] Module "${module.title}" UNLOCKED: First section (sort_order=${module.sort_order}, index=${index})`)
      }
      // Check 5: Sequential checkpoint logic (globally_unlocked is NULL - default)
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
        // Check 5: Sequential logic - check IMMEDIATE previous section only
        else {
          // Check IMMEDIATE previous section only
          if (index === 0) {
            // This is the first section, should have been caught by Check 4
            // But if we're here, keep it locked
            isLocked = true
            wouldBeLocked = true
            lockReason = `Complete the required checkpoint to unlock this module`
            console.log(`[Unlock Status] Module "${module.title}" LOCKED: First section but not caught by Check 4`)
          } else {
            const immediatePrevModule = modules[index - 1]
            const immediatePrevCheckpoint = checkpointMap.get(immediatePrevModule.id)

            if (!immediatePrevCheckpoint) {
              // Previous section has NO checkpoint - this section stays LOCKED
              isLocked = true
              wouldBeLocked = true
              lockReason = `Add a checkpoint to "${immediatePrevModule.title}" to unlock this section`
              console.log(`[Unlock Status] Module "${module.title}" LOCKED: Previous section "${immediatePrevModule.title}" has no checkpoint`)
            } else {
              // Previous section has checkpoint - check if approved
              const prevStatus = userCheckpointStatusMap.get(immediatePrevCheckpoint.id) || 'not_started'
              
              console.log(`[Unlock Status] Module "${module.title}" (index=${index}, sort_order=${module.sort_order}):`)
              console.log(`  - Immediate previous module: "${immediatePrevModule.title}" (index=${index - 1}, sort_order=${immediatePrevModule.sort_order})`)
              console.log(`  - Previous checkpoint: "${immediatePrevCheckpoint.title}" (id=${immediatePrevCheckpoint.id})`)
              console.log(`  - Checkpoint status: "${prevStatus}"`)
              console.log(`  - Status in map: ${userCheckpointStatusMap.has(immediatePrevCheckpoint.id) ? 'FOUND' : 'NOT FOUND'}`)
              
              if (prevStatus === 'approved') {
                // Previous checkpoint approved - unlock this section
                isLocked = false
                wouldBeLocked = false
                lockReason = null
                console.log(`  ✓ Module "${module.title}" UNLOCKED: Immediate previous checkpoint "${immediatePrevCheckpoint.title}" is approved`)
              } else {
                // Previous checkpoint not approved - lock this section
                isLocked = true
                wouldBeLocked = true
                lockReason = `Complete "${immediatePrevCheckpoint.title}" to unlock`
                console.log(`  ✗ Module "${module.title}" LOCKED: Immediate previous checkpoint "${immediatePrevCheckpoint.title}" status="${prevStatus}" (needs "approved")`)
              }
            }
          }
        }
      }

      // For admins: Always allow access, but preserve wouldBeLocked for UI display
      if (isAdmin) {
        isLocked = false // Admins can always access
        // Keep wouldBeLocked as-is so UI can show lock symbol
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

      const finalWouldBeLocked = isAdmin ? wouldBeLocked : isLocked
      
      console.log(`[Unlock Status] FINAL for "${module.title}": isLocked=${isLocked}, wouldBeLocked=${wouldBeLocked}, finalWouldBeLocked=${finalWouldBeLocked}, isAdmin=${isAdmin}, globally_unlocked=${module.globally_unlocked}`)

      return {
        id: module.id,
        title: module.title,
        sort_order: module.sort_order,
        isLocked,
        wouldBeLocked: finalWouldBeLocked, // For admins, show what it would be locked for regular users
        lockReason,
        globally_unlocked: module.globally_unlocked, // Preserve null/undefined to distinguish from explicitly false
        checkpoint: checkpoint
          ? {
              id: checkpoint.id,
              title: checkpoint.title,
              status: checkpointStatusFormatted
            }
          : null
      }
    })

    console.log(`[Unlock Status] Returning ${modulesWithStatus.length} modules. Locked count: ${modulesWithStatus.filter(m => m.isLocked).length}`)

    const response = {
      courseId: courseId,
      modules: modulesWithStatus.map((m: any) => ({
        ...m,
        globally_unlocked: modules.find((mod) => mod.id === m.id)?.globally_unlocked // Preserve null/undefined
      }))
    }
    
    console.log('[Unlock Status] Response:', JSON.stringify(response, null, 2))
    
    // DEBUG: Log globally_unlocked values right before returning
    console.log('[Unlock Status] FINAL RESPONSE - Module globally_unlocked values:', 
      modules.map(m => ({ 
        title: m.title, 
        globally_unlocked: m.globally_unlocked, 
        type: typeof m.globally_unlocked 
      }))
    )
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Unlock Status] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

