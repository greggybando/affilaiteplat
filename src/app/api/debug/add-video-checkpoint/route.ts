import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Debug endpoint to add a video checkpoint for Life Design Process first video
export async function GET(request: NextRequest) {
  try {
    // Find The Life Design Process section
    const { data: allSections } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, title, category_id')

    const { data: categories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id, category_id')

    const lifeDesignCat = categories?.find((c: any) => c.category_id === 'lifedesign')
    if (!lifeDesignCat) {
      return NextResponse.json({ error: 'Life Design category not found' }, { status: 404 })
    }

    const lifeDesignProcessSection = allSections?.find((s: any) => 
      s.category_id === lifeDesignCat.id && s.title === 'The Life Design Process'
    )

    if (!lifeDesignProcessSection) {
      return NextResponse.json({ 
        error: 'The Life Design Process section not found',
        lifeDesignCatId: lifeDesignCat.id,
        availableSections: allSections?.filter((s: any) => s.category_id === lifeDesignCat.id).map((s: any) => s.title)
      }, { status: 404 })
    }

    // Find the first video in this section
    const { data: videos } = await (supabaseAdmin as any)
      .from('course_videos')
      .select('id, title, video_id, display_order')
      .eq('section_id', lifeDesignProcessSection.id)
      .order('display_order', { ascending: true })

    if (!videos || videos.length === 0) {
      return NextResponse.json({ 
        error: 'No videos found in section',
        sectionId: lifeDesignProcessSection.id
      }, { status: 404 })
    }

    const firstVideo = videos[0]

    // Check if checkpoint already exists for this video
    const { data: existingCheckpoint } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id, title')
      .eq('video_id', firstVideo.id)
      .single()

    if (existingCheckpoint) {
      return NextResponse.json({
        message: 'Video checkpoint already exists!',
        checkpoint: existingCheckpoint,
        video: firstVideo,
        section: lifeDesignProcessSection
      })
    }

    // Create the video checkpoint
    const { data: newCheckpoint, error } = await (supabaseAdmin as any)
      .from('checkpoints')
      .insert({
        section_id: lifeDesignProcessSection.id,
        video_id: firstVideo.id,
        title: 'Complete Diagnosis Process',
        description: 'Share what you learned from the Diagnosis process video',
        requirements: 'Write a sentence explaining what you learned',
        ai_review_enabled: true,
        requires_manual_review: false
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'VIDEO checkpoint created!',
      checkpoint: newCheckpoint,
      video: firstVideo,
      section: lifeDesignProcessSection
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


