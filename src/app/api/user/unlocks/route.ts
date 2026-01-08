import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Get unlock status for user (sections and courses)
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const courseType = searchParams.get('courseType') as 'mindset' | 'dreamjob' | 'lifedesign' | null
    const sectionId = searchParams.get('sectionId')

    // If specific section requested
    if (sectionId) {
      const { data: result } = await (supabaseAdmin as any).rpc('is_section_unlocked', {
        p_user_id: affiliate.id,
        p_section_id: sectionId
      })

      return NextResponse.json({
        unlocked: result === true
      })
    }

    // If course type requested, get all sections and their unlock status
    if (courseType) {
      // Get all sections for this course - try both mindset and lifedesign
      let { data: categories } = await supabaseAdmin
        .from('course_categories')
        .select('id')
        .eq('course_type', courseType)

      // Try alternate name if not found
      if ((!categories || categories.length === 0) && courseType === 'mindset') {
        console.log('[Unlocks API] "mindset" not found, trying "lifedesign"...')
        const result = await supabaseAdmin
          .from('course_categories')
          .select('id')
          .eq('course_type', 'lifedesign')
        categories = result.data
      }
      if ((!categories || categories.length === 0) && courseType === 'lifedesign') {
        console.log('[Unlocks API] "lifedesign" not found, trying "mindset"...')
        const result = await supabaseAdmin
          .from('course_categories')
          .select('id')
          .eq('course_type', 'mindset')
        categories = result.data
      }

      if (!categories || categories.length === 0) {
        console.log('[Unlocks API] No categories found for course type:', courseType)
        return NextResponse.json({ sections: [], courseUnlocked: true })
      }
      
      console.log('[Unlocks API] Found', categories.length, 'categories for course')

      const categoryIds = (categories as any[]).map((c: any) => c.id)
      const { data: sections } = await supabaseAdmin
        .from('course_sections')
        .select('id, title, display_order')
        .in('category_id', categoryIds)
        .order('display_order', { ascending: true })

      if (!sections) {
        return NextResponse.json({ sections: [], courseUnlocked: true })
      }

      // Get all user's approved checkpoints first
      const { data: userApprovedCheckpoints } = await supabaseAdmin
        .from('user_checkpoints')
        .select('checkpoint_id, status')
        .eq('user_id', affiliate.id)
        .eq('status', 'approved')

      console.log(`[Unlocks API] User ${affiliate.id} has ${userApprovedCheckpoints?.length || 0} approved checkpoints`)

      // Get checkpoint -> section mapping (ONLY section-level checkpoints, NOT video checkpoints)
      const { data: checkpointSectionMap } = await supabaseAdmin
        .from('checkpoints')
        .select('id, section_id, video_id')

      // Create a set of section IDs that have approved SECTION-LEVEL checkpoints
      // Video checkpoints do NOT unlock sections - they only unlock the next video
      const sectionsWithApprovedCheckpoints = new Set<string>()
      userApprovedCheckpoints?.forEach((uc: any) => {
        const checkpoint = (checkpointSectionMap as any[])?.find((c: any) => c.id === uc.checkpoint_id)
        // Only count if it's a SECTION-level checkpoint (video_id is null)
        if (checkpoint && !checkpoint.video_id) {
          sectionsWithApprovedCheckpoints.add(checkpoint.section_id)
          console.log(`[Unlocks API] Section ${checkpoint.section_id} has approved SECTION checkpoint`)
        } else if (checkpoint && checkpoint.video_id) {
          console.log(`[Unlocks API] Ignoring VIDEO checkpoint ${checkpoint.id} for section unlock calculation`)
        }
      })

      console.log(`[Unlocks API] Sections with approved SECTION checkpoints:`, Array.from(sectionsWithApprovedCheckpoints))

      // Check unlock status for each section using the DATABASE FUNCTION
      // The database function is_section_unlocked is the SINGLE SOURCE OF TRUTH
      // It properly handles video vs section checkpoints
      const sectionsList = sections as any[]
      const sectionsWithStatus = await Promise.all(
        sectionsList.map(async (section: any, index: number) => {
          const { data: dbUnlocked, error: unlockError } = await (supabaseAdmin as any).rpc('is_section_unlocked', {
            p_user_id: affiliate.id,
            p_section_id: section.id
          })

          if (unlockError) {
            console.error(`[Unlocks API] Error checking unlock for section ${section.id}:`, unlockError)
          }
          
          console.log(`[Unlocks API] Section ${index} "${section.title}": ${dbUnlocked ? 'UNLOCKED' : 'LOCKED'} (from DB function)`)

          return {
            id: section.id,
            title: section.title,
            displayOrder: section.display_order,
            unlocked: dbUnlocked === true
          }
        })
      )

      // Check course unlock status
      const { data: courseUnlocked } = await (supabaseAdmin as any).rpc('is_course_unlocked', {
        p_user_id: affiliate.id,
        p_course_type: courseType
      })

      // Get SECTION-LEVEL checkpoint statuses for each section (exclude video checkpoints)
      const { data: sectionCheckpoints } = await supabaseAdmin
        .from('checkpoints')
        .select('id, section_id')
        .is('video_id', null)

      console.log(`[Unlocks API] Found ${sectionCheckpoints?.length || 0} section-level checkpoints`)

      const sectionCheckpointMap = new Map(
        (sectionCheckpoints || []).map((cp: any) => [cp.section_id, cp.id])
      )

      // Get user checkpoint submissions
      const checkpointIds = Array.from(sectionCheckpointMap.values())
      const { data: userCheckpoints } = await supabaseAdmin
        .from('user_checkpoints')
        .select('checkpoint_id, status')
        .eq('user_id', affiliate.id)
        .in('checkpoint_id', checkpointIds)

      console.log(`[Unlocks API] User ${affiliate.id} checkpoints:`, userCheckpoints)

      const userCheckpointStatusMap = new Map(
        (userCheckpoints || []).map((uc: any) => [uc.checkpoint_id, uc.status])
      )

      // Add checkpoint status to sections
      // Also include section_id (numeric) for mapping to UI
      const sectionsWithCheckpoints = await Promise.all(
        sectionsWithStatus.map(async (section) => {
          const checkpointId = sectionCheckpointMap.get(section.id)
          const checkpointStatus = checkpointId ? userCheckpointStatusMap.get(checkpointId) : null

          // Get the numeric section_id from database
          const { data: sectionData } = await supabaseAdmin
            .from('course_sections')
            .select('section_id')
            .eq('id', section.id)
            .single()

          const sectionDataTyped = sectionData as any

          return {
            ...section,
            section_id: sectionDataTyped?.section_id || null, // Numeric ID for UI mapping
            checkpointId,
            checkpointStatus: checkpointStatus || 'not_started'
          }
        })
      )

      // Count completed sections
      const completedCount = sectionsWithCheckpoints.filter(
        s => s.checkpointStatus === 'approved'
      ).length

      return NextResponse.json({
        sections: sectionsWithCheckpoints,
        courseUnlocked: courseUnlocked === true,
        progress: {
          completed: completedCount,
          total: sectionsWithCheckpoints.length
        }
      })
    }

    return NextResponse.json({ error: 'Missing courseType or sectionId' }, { status: 400 })

  } catch (error: any) {
    console.error('Unlock status error:', error)
    return NextResponse.json(
      { error: 'Failed to get unlock status', message: error.message },
      { status: 500 }
    )
  }
}
