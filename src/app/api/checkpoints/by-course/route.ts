import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Public endpoint to fetch all checkpoints for a course
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestedCourse = request.nextUrl.searchParams.get('course') || 'mindset'

    // Get ALL categories to find the right one
    const { data: allCategories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id, course_type, title')
    
    console.log('[Checkpoints by Course] All categories:', allCategories)

    // IMPORTANT:
    // A "course" can have MULTIPLE categories (e.g. mindset includes starthere, mindset, lifedesign, etc.).
    // So we must fetch ALL matching categories for the requested course_type, not just the first one.
    // Mindset world spans BOTH course types (legacy split in DB).
    // So when requesting either, return checkpoints across both mindset + lifedesign categories.
    const normalizedRequested = requestedCourse.toLowerCase()
    const includeBoth = normalizedRequested === 'mindset' || normalizedRequested === 'lifedesign'

    let categoriesForCourse =
      allCategories?.filter((c: any) => {
        const ct = (c.course_type || '').toLowerCase()
        if (includeBoth) return ct === 'mindset' || ct === 'lifedesign'
        return ct === normalizedRequested
      }) || []

    if (categoriesForCourse.length === 0) {
      console.log('[Checkpoints by Course] No categories found for course!')
      return NextResponse.json({ 
        checkpoints: [], 
        sections: [],
        byTitle: {},
        byUUID: {},
        byNumericId: {},
        debug: {
          requestedCourse,
          availableCourses: allCategories?.map((c: any) => ({ type: c.course_type, title: c.title }))
        }
      })
    }

    const categoryIdsForCourse = categoriesForCourse.map((c: any) => c.id)
    console.log(
      `[Checkpoints by Course] Using categories for course "${requestedCourse}":`,
      categoriesForCourse.map((c: any) => ({ id: c.id, course_type: c.course_type, title: c.title }))
    )

    // Get ALL sections (not filtered) to debug
    const { data: allSections } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, title, display_order, section_id, category_id')
      .order('display_order', { ascending: true })
    
    console.log('[Checkpoints by Course] All sections in DB:', allSections?.length)
    console.log('[Checkpoints by Course] Sections for this course:', 
      allSections?.filter((s: any) => categoryIdsForCourse.includes(s.category_id)).length)

    // Get sections for this course (across ALL matching categories)
    const sections = allSections?.filter((s: any) => categoryIdsForCourse.includes(s.category_id)) || []

    // Fetch videos for these sections so we can map:
    // course_videos.id (UUID stored in checkpoints.video_id) -> course_videos.video_id (display id used by UI)
    const sectionUuids = sections.map((s: any) => s.id)
    const { data: courseVideos } = await (supabaseAdmin as any)
      .from('course_videos')
      .select('id, video_id')
      .in('section_id', sectionUuids.length ? sectionUuids : ['00000000-0000-0000-0000-000000000000'])

    const videoUuidToDisplayId = new Map<string, string | number>(
      (courseVideos || []).map((v: any) => [v.id, v.video_id])
    )

    // Get ALL checkpoints (including video_id for video-level checkpoints)
    const { data: allCheckpoints } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id, section_id, video_id, title, description, requirements, ai_review_enabled')
    
    console.log('[Checkpoints by Course] All checkpoints in DB:', allCheckpoints?.length)

    // Build maps
    const checkpointMap: Record<string, any> = {}  // section_id -> section-level checkpoint
    const checkpointsByNumericId: Record<number, any> = {}
    const checkpointsByTitle: Record<string, any> = {}
    const videoCheckpointMap: Record<string, any> = {}  // video UUID -> video-level checkpoint
    const videoCheckpointByDisplayId: Record<string | number, any> = {} // video_id (display/numeric) -> checkpoint
    const sectionsWithVideoLocking: Set<string> = new Set()  // section_ids that use video-level locking

    // Separate section-level and video-level checkpoints
    allCheckpoints?.forEach((cp: any) => {
      if (cp.video_id) {
        // Video-level checkpoint
        videoCheckpointMap[cp.video_id] = cp
        // Map also by display video_id using course_videos lookup (robust; no join dependency)
        const displayId = videoUuidToDisplayId.get(cp.video_id)
        if (displayId !== undefined && displayId !== null && displayId !== '') {
          videoCheckpointByDisplayId[displayId] = cp
        }
        sectionsWithVideoLocking.add(cp.section_id)
      } else {
        // Section-level checkpoint
        checkpointMap[cp.section_id] = cp
      }
    })

    // For sections in this course, also build numeric and title maps
    sections.forEach((section: any) => {
      const checkpoint = checkpointMap[section.id]
      if (checkpoint) {
        if (section.section_id) {
          checkpointsByNumericId[section.section_id] = checkpoint
        }
        checkpointsByTitle[section.title] = checkpoint
        console.log(`[Checkpoints by Course] ✓ Mapped: "${section.title}" -> checkpoint ${checkpoint.id}`)
      }
    })

    // ALSO map by matching checkpoint title to section title (backup)
    allSections?.forEach((section: any) => {
      const matchingCheckpoint = allCheckpoints?.find((cp: any) => 
        !cp.video_id && // Only section-level checkpoints
        (cp.title?.toLowerCase().includes(section.title?.toLowerCase()) ||
        section.title?.toLowerCase().includes(cp.title?.toLowerCase().replace('complete ', '')))
      )
      if (matchingCheckpoint && !checkpointsByTitle[section.title]) {
        checkpointsByTitle[section.title] = matchingCheckpoint
        console.log(`[Checkpoints by Course] ✓ Mapped by title match: "${section.title}"`)
      }
    })

    console.log(`[Checkpoints by Course] Final byTitle keys:`, Object.keys(checkpointsByTitle))
    console.log(`[Checkpoints by Course] Sections with video locking:`, Array.from(sectionsWithVideoLocking))
    console.log(`[Checkpoints by Course] Video checkpoints:`, Object.keys(videoCheckpointMap).length)

    return NextResponse.json({
      courseType: requestedCourse,
      checkpoints: allCheckpoints?.filter((cp: any) => 
        sections.some((s: any) => s.id === cp.section_id)
      ) || [],
      byUUID: checkpointMap,
      byNumericId: checkpointsByNumericId,
      byTitle: checkpointsByTitle,
      // NEW: Video-level checkpoint data
      videoCheckpoints: videoCheckpointMap,
      videoCheckpointsByDisplayId: videoCheckpointByDisplayId,
      sectionsWithVideoLocking: Array.from(sectionsWithVideoLocking),
      sections: sections.map((s: any) => ({
        uuid: s.id,
        numericId: s.section_id,
        title: s.title,
        displayOrder: s.display_order,
        hasCheckpoint: !!checkpointMap[s.id],
        hasVideoLocking: sectionsWithVideoLocking.has(s.id)
      })),
      debug: {
        categoryIds: categoryIdsForCourse,
        totalSectionsInDb: allSections?.length,
        sectionsForCourse: sections.length,
        totalCheckpointsInDb: allCheckpoints?.length,
        videoCheckpointsCount: Object.keys(videoCheckpointMap).length
      }
    })

  } catch (error: any) {
    console.error('[Checkpoints by Course] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

