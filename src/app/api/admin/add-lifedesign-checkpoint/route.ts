import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Add a VIDEO-level checkpoint for the first video in Life Design Process
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || affiliate.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find The Life Design Process section
    const { data: section } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, title')
      .eq('title', 'The Life Design Process')
      .single()

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Find the first video (Diagnosis process)
    const { data: video } = await (supabaseAdmin as any)
      .from('course_videos')
      .select('id, title, video_id')
      .eq('section_id', section.id)
      .order('display_order', { ascending: true })
      .limit(1)
      .single()

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Check if video checkpoint already exists
    const { data: existingCheckpoint } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id, title')
      .eq('section_id', section.id)
      .eq('video_id', video.id)
      .single()

    if (existingCheckpoint) {
      return NextResponse.json({ 
        message: 'Video checkpoint already exists',
        checkpoint: existingCheckpoint,
        video: { id: video.id, title: video.title }
      })
    }

    // Create the VIDEO-level checkpoint
    const { data: newCheckpoint, error } = await (supabaseAdmin as any)
      .from('checkpoints')
      .insert({
        section_id: section.id,
        video_id: video.id,  // This makes it a VIDEO-level checkpoint
        title: 'Complete Diagnosis Process',
        description: 'Share what you learned from the Diagnosis process video',
        requirements: 'Write a sentence explaining what you learned from this video',
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
      message: 'VIDEO checkpoint created for Diagnosis Process',
      checkpoint: newCheckpoint,
      video: { id: video.id, title: video.title }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

