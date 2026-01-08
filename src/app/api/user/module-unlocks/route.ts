import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Helper: Get course sections ordered by display_order
async function getCourseSections(courseType: string) {
  let { data: category } = await (supabaseAdmin as any)
    .from('course_categories')
    .select('id')
    .eq('course_type', courseType)
    .single()

  // Try alternate name if not found
  if (!category && courseType === 'mindset') {
    const result = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id')
      .eq('course_type', 'lifedesign')
      .single()
    category = result.data
  }
  if (!category && courseType === 'lifedesign') {
    const result = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id')
      .eq('course_type', 'mindset')
      .single()
    category = result.data
  }

  if (!category) {
    console.log('[Module Unlocks] Course not found:', courseType)
    return []
  }

  const { data: sections } = await (supabaseAdmin as any)
    .from('course_sections')
    .select('id, title, display_order')
    .eq('category_id', category.id)
    .order('display_order', { ascending: true })

  return sections || []
}

// Helper: Get section-level checkpoints (video_id IS NULL)
async function getSectionCheckpoints(sectionIds: string[]) {
  if (sectionIds.length === 0) return []
  
  const { data: checkpoints } = await (supabaseAdmin as any)
    .from('checkpoints')
    .select('id, section_id')
    .in('section_id', sectionIds)
    .is('video_id', null)

  return checkpoints || []
}

// Helper: Get video-level checkpoints (video_id IS NOT NULL)
async function getVideoCheckpoints(sectionIds: string[]) {
  if (sectionIds.length === 0) return []
  
  const { data: checkpoints } = await (supabaseAdmin as any)
    .from('checkpoints')
    .select('id, section_id, video_id')
    .in('section_id', sectionIds)
    .not('video_id', 'is', null)

  return checkpoints || []
}

// Helper: Calculate which modules should be unlocked based on approved checkpoints
async function calculateUnlockedModules(userId: string, courseType: string) {
  const sections = await getCourseSections(courseType)
  if (sections.length === 0) return [1] // Default: at least module 1

  const sectionIds = sections.map((s: any) => s.id)
  const checkpoints = await getSectionCheckpoints(sectionIds) // section-level
  const videoCheckpoints = await getVideoCheckpoints(sectionIds) // video-level

  // Get user's approved checkpoints (section-level)
  const checkpointIds = checkpoints.map((c: any) => c.id)
  const { data: approvedCheckpoints } = await (supabaseAdmin as any)
    .from('user_checkpoints')
    .select('checkpoint_id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .in('checkpoint_id', checkpointIds)

  const approvedCheckpointIds = new Set(
    (approvedCheckpoints || []).map((ac: any) => ac.checkpoint_id)
  )

  // Get user's approved video checkpoints
  const videoCheckpointIds = videoCheckpoints.map((c: any) => c.id)
  const { data: approvedVideoCheckpoints } = await (supabaseAdmin as any)
    .from('user_checkpoints')
    .select('checkpoint_id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .in('checkpoint_id', videoCheckpointIds.length ? videoCheckpointIds : ['none'])

  const approvedVideoCheckpointIds = new Set(
    (approvedVideoCheckpoints || []).map((ac: any) => ac.checkpoint_id)
  )

  // Build map of section_id -> has approved checkpoint (section-level OR all video-level)
  const sectionHasApprovedCheckpoint: Record<string, boolean> = {}
  const sectionHasCheckpoint: Record<string, boolean> = {}
  const sectionHasVideoCheckpoint: Record<string, boolean> = {}

  // Section-level checkpoints
  checkpoints.forEach((cp: any) => {
    sectionHasCheckpoint[cp.section_id] = true
    if (approvedCheckpointIds.has(cp.id)) {
      sectionHasApprovedCheckpoint[cp.section_id] = true
    }
  })

  // Video-level checkpoints: require ALL video checkpoints in that section to be approved
  const videoBySection: Record<string, string[]> = {}
  videoCheckpoints.forEach((cp: any) => {
    sectionHasCheckpoint[cp.section_id] = true
    sectionHasVideoCheckpoint[cp.section_id] = true
    if (!videoBySection[cp.section_id]) videoBySection[cp.section_id] = []
    videoBySection[cp.section_id].push(cp.id)
  })

  // IMPORTANT: Video-level checkpoints do NOT unlock sections.
  // They only unlock the next video. So we deliberately do NOT
  // set sectionHasApprovedCheckpoint based on video checkpoints.

  // Calculate unlocked modules
  // Module N+1 is unlocked if:
  // 1. It's the first module (always unlocked)
  // 2. Previous module has NO checkpoint (auto-unlocked)
  // 3. Previous module's section-level checkpoint is approved (video checkpoints don't count)
  const unlockedModules: number[] = []

  console.log('[Module Unlocks] Section checkpoint map:', sectionHasCheckpoint)
  console.log('[Module Unlocks] Video checkpoint map:', sectionHasVideoCheckpoint)
  console.log('[Module Unlocks] Approved section checkpoints:', sectionHasApprovedCheckpoint)

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    const moduleId = section.display_order + 1 // Convert 0-indexed to 1-indexed

    if (i === 0) {
      // First module is always unlocked
      console.log(`[Module Unlocks] Module ${moduleId} (${section.title}): UNLOCKED (first module)`)
      unlockedModules.push(moduleId)
    } else {
      const prevSection = sections[i - 1]
      const prevSectionId = prevSection.id
      const prevHasAnyCheckpoint = sectionHasCheckpoint[prevSectionId] === true
      const prevHasVideoCheckpoint = sectionHasVideoCheckpoint[prevSectionId] === true
      const prevHasSectionCheckpointApproved = sectionHasApprovedCheckpoint[prevSectionId] === true

      console.log(`[Module Unlocks] Module ${moduleId} (${section.title}): prev="${prevSection.title}", hasAnyCP=${prevHasAnyCheckpoint}, hasVideoCP=${prevHasVideoCheckpoint}, sectionCPApproved=${prevHasSectionCheckpointApproved}`)

      if (!prevHasAnyCheckpoint) {
        // Previous section has no checkpoint at all - auto-unlock
        console.log(`[Module Unlocks] Module ${moduleId}: UNLOCKED (prev has no checkpoint)`)
        unlockedModules.push(moduleId)
      } else if (prevHasVideoCheckpoint) {
        // Previous section uses video-level checkpoints
        // DO NOT auto-unlock - video checkpoints don't unlock sections
        console.log(`[Module Unlocks] Module ${moduleId}: LOCKED (prev has video checkpoints)`)
      } else if (prevHasSectionCheckpointApproved) {
        // Previous section's section-level checkpoint is approved - unlock
        console.log(`[Module Unlocks] Module ${moduleId}: UNLOCKED (prev section checkpoint approved)`)
        unlockedModules.push(moduleId)
      } else {
        console.log(`[Module Unlocks] Module ${moduleId}: LOCKED (prev section checkpoint not approved)`)
      }
    }
  }

  return unlockedModules
}

// GET: Fetch user's unlocked modules for a course (fully dynamic)
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courseType = request.nextUrl.searchParams.get('course') || 'dreamjob'

    console.log(`[Module Unlocks] Calculating unlocks for user ${affiliate.id}, course: ${courseType}`)

    // Calculate unlocked modules dynamically
    const calculatedUnlocks = await calculateUnlockedModules(affiliate.id, courseType)

    // Also get any manually saved unlocks from user_module_unlocks table
    const { data: manualUnlocks } = await (supabaseAdmin as any)
      .from('user_module_unlocks')
      .select('module_id')
      .eq('user_id', affiliate.id)
      .eq('course_type', courseType)

    const manualModuleIds = (manualUnlocks || []).map((u: any) => u.module_id)

    // Combine both sources
    const allUnlocked = Array.from(new Set([...calculatedUnlocks, ...manualModuleIds]))
    allUnlocked.sort((a, b) => a - b)

    console.log(`[Module Unlocks] User ${affiliate.id} unlocked modules:`, allUnlocked)

    return NextResponse.json({ unlockedModules: allUnlocked })

  } catch (error: any) {
    console.error('[Module Unlocks] Error:', error)
    return NextResponse.json({ unlockedModules: [1] }) // Default on error
  }
}

// POST: Manually unlock a module for a user
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { moduleId, courseType = 'dreamjob' } = await request.json()

    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId is required' }, { status: 400 })
    }

    console.log(`[Module Unlocks] Manually unlocking module ${moduleId} for user ${affiliate.id}`)

    const { error } = await (supabaseAdmin as any)
      .from('user_module_unlocks')
      .upsert({
        user_id: affiliate.id,
        course_type: courseType,
        module_id: moduleId,
        unlocked_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,course_type,module_id'
      })

    if (error) {
      console.error('[Module Unlocks] Error saving:', error)
      return NextResponse.json({ success: false, error: error.message })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[Module Unlocks] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
