import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Debug endpoint to see all checkpoints and their section/video links
export async function GET(request: NextRequest) {
  try {
    // Get all checkpoints
    const { data: checkpoints } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('*')

    // Get all sections to resolve names
    const { data: sections } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, title, section_id, category_id')

    const sectionMap = new Map<string, any>()
    for (const s of (sections || [])) {
      sectionMap.set(s.id, s)
    }

    // Get all videos to resolve names
    const { data: videos } = await (supabaseAdmin as any)
      .from('course_videos')
      .select('id, title, video_id, section_id')

    const videoMap = new Map<string, any>()
    for (const v of (videos || [])) {
      videoMap.set(v.id, v)
    }

    // Get categories
    const { data: categories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id, course_type, category_id, title')

    const categoryMap = new Map<string, any>()
    for (const c of (categories || [])) {
      categoryMap.set(c.id, c)
    }

    // Build checkpoint info with resolved names
    const checkpointInfo = (checkpoints || []).map((cp: any) => {
      const section = sectionMap.get(cp.section_id)
      const category = section ? categoryMap.get(section.category_id) : null
      const video = cp.video_id ? videoMap.get(cp.video_id) : null
      return {
        id: cp.id,
        title: cp.title,
        section_id: cp.section_id,
        sectionTitle: section?.title || 'NOT FOUND (orphaned!)',
        sectionNumericId: section?.section_id,
        categoryId: category?.category_id,
        categoryTitle: category?.title,
        courseType: category?.course_type,
        video_id: cp.video_id,
        videoTitle: video?.title || (cp.video_id ? 'NOT FOUND (orphaned!)' : null),
        videoDisplayId: video?.video_id,
        ai_review_enabled: cp.ai_review_enabled,
        isVideoCheckpoint: !!cp.video_id
      }
    })

    // Find orphaned checkpoints (linked to non-existent sections/videos)
    const orphanedCheckpoints = checkpointInfo.filter((cp: any) => 
      cp.sectionTitle === 'NOT FOUND (orphaned!)' || 
      (cp.video_id && cp.videoTitle === 'NOT FOUND (orphaned!)')
    )

    // Find Life Design sections and videos
    const lifeDesignSections = (sections || []).filter((s: any) => {
      const cat = categoryMap.get(s.category_id)
      return cat?.category_id === 'lifedesign'
    }).map((s: any) => ({
      id: s.id,
      title: s.title,
      section_id: s.section_id,
      hasCheckpoint: checkpoints?.some((cp: any) => cp.section_id === s.id && !cp.video_id)
    }))

    const lifeDesignVideos = (videos || []).filter((v: any) => {
      const section = sectionMap.get(v.section_id)
      const cat = section ? categoryMap.get(section.category_id) : null
      return cat?.category_id === 'lifedesign'
    }).map((v: any) => ({
      id: v.id,
      video_id: v.video_id,
      title: v.title,
      sectionTitle: sectionMap.get(v.section_id)?.title,
      hasCheckpoint: checkpoints?.some((cp: any) => cp.video_id === v.id)
    }))

    return NextResponse.json({
      totalCheckpoints: checkpoints?.length || 0,
      totalSections: sections?.length || 0,
      totalVideos: videos?.length || 0,
      orphanedCount: orphanedCheckpoints.length,
      orphanedCheckpoints,
      allCheckpoints: checkpointInfo,
      lifeDesignSections,
      lifeDesignVideos: lifeDesignVideos.slice(0, 10) // First 10
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

