import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Debug version of checkpoints/by-course - no auth required
export async function GET(request: NextRequest) {
  try {
    const requestedCourse = request.nextUrl.searchParams.get('course') || 'mindset'

    // Get ALL categories
    const { data: allCategories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id, course_type, title, category_id')

    // Filter for mindset world
    const normalizedRequested = requestedCourse.toLowerCase()
    const includeBoth = normalizedRequested === 'mindset' || normalizedRequested === 'lifedesign'

    let categoriesForCourse = allCategories?.filter((c: any) => {
      const ct = (c.course_type || '').toLowerCase()
      if (includeBoth) return ct === 'mindset' || ct === 'lifedesign'
      return ct === normalizedRequested
    }) || []

    const categoryIdsForCourse = categoriesForCourse.map((c: any) => c.id)

    // Get ALL sections
    const { data: allSections } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, title, section_id, category_id')

    const sections = allSections?.filter((s: any) => categoryIdsForCourse.includes(s.category_id)) || []

    // Fetch videos for these sections
    const sectionUuids = sections.map((s: any) => s.id)
    const { data: courseVideos } = await (supabaseAdmin as any)
      .from('course_videos')
      .select('id, video_id, section_id')
      .in('section_id', sectionUuids.length ? sectionUuids : ['00000000-0000-0000-0000-000000000000'])

    const videoUuidToDisplayId = new Map<string, string | number>(
      (courseVideos || []).map((v: any) => [v.id, v.video_id])
    )

    // Get ALL checkpoints with all fields (matching the real API)
    const { data: allCheckpoints } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id, section_id, video_id, title, description, requirements, ai_review_enabled')

    // Filter checkpoints to those in our sections
    const checkpointsForCourse = allCheckpoints?.filter((cp: any) => 
      sections.some((s: any) => s.id === cp.section_id)
    ) || []

    // Build video checkpoint maps
    const videoCheckpointMap: Record<string, any> = {}
    const videoCheckpointByDisplayId: Record<string, any> = {}
    const sectionsWithVideoLocking: string[] = []

    checkpointsForCourse.forEach((cp: any) => {
      if (cp.video_id) {
        videoCheckpointMap[cp.video_id] = cp
        const displayId = videoUuidToDisplayId.get(cp.video_id)
        if (displayId) {
          videoCheckpointByDisplayId[String(displayId)] = cp
        }
        if (!sectionsWithVideoLocking.includes(cp.section_id)) {
          sectionsWithVideoLocking.push(cp.section_id)
        }
      }
    })

    // Find Life Design Process section specifically
    const lifeDesignSection = sections.find((s: any) => s.title === 'The Life Design Process')
    const lifeDesignCheckpoint = allCheckpoints?.find((cp: any) => 
      cp.section_id === lifeDesignSection?.id
    )

    return NextResponse.json({
      requestedCourse,
      categoriesForCourse: categoriesForCourse.map((c: any) => ({ id: c.id, category_id: c.category_id, course_type: c.course_type, title: c.title })),
      sectionsCount: sections.length,
      videosCount: courseVideos?.length || 0,
      allCheckpointsCount: allCheckpoints?.length || 0,
      checkpointsForCourseCount: checkpointsForCourse.length,
      videoCheckpointMap,
      videoCheckpointByDisplayId,
      sectionsWithVideoLocking,
      lifeDesignSection: lifeDesignSection ? { id: lifeDesignSection.id, title: lifeDesignSection.title } : null,
      lifeDesignCheckpoint: lifeDesignCheckpoint || 'NOT FOUND'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

