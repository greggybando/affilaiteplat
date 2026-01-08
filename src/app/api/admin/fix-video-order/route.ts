import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Fix video order for Life Design Process section
// Both GET and POST supported for easier access
export async function GET(request: NextRequest) {
  return fixVideoOrder()
}

export async function POST(request: NextRequest) {
  return fixVideoOrder()
}

async function fixVideoOrder() {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || affiliate.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the "Life Design Process" section
    const { data: section } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, title')
      .eq('title', 'The Life Design Process')
      .single()

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Get all videos in this section
    const { data: videos } = await (supabaseAdmin as any)
      .from('course_videos')
      .select('id, video_id, title, display_order')
      .eq('section_id', section.id)
      .order('display_order', { ascending: true })

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: 'No videos found' }, { status: 404 })
    }

    // Find Diagnosis and Survival videos
    const diagnosisVideo = videos.find((v: any) => v.title.toLowerCase().includes('diagnosis'))
    const survivalVideo = videos.find((v: any) => v.title.toLowerCase().includes('survival'))

    if (!diagnosisVideo || !survivalVideo) {
      return NextResponse.json({ 
        error: 'Could not find diagnosis or survival videos',
        videos: videos.map((v: any) => ({ title: v.title, order: v.display_order }))
      }, { status: 404 })
    }

    // Swap their display_order so Diagnosis comes first
    const diagnosisOrder = diagnosisVideo.display_order
    const survivalOrder = survivalVideo.display_order

    // If Diagnosis is already first (lower order), no need to swap
    if (diagnosisOrder < survivalOrder) {
      return NextResponse.json({ 
        message: 'Order is already correct',
        diagnosis: { title: diagnosisVideo.title, order: diagnosisOrder },
        survival: { title: survivalVideo.title, order: survivalOrder }
      })
    }

    // Swap the orders
    await (supabaseAdmin as any)
      .from('course_videos')
      .update({ display_order: survivalOrder })
      .eq('id', diagnosisVideo.id)

    await (supabaseAdmin as any)
      .from('course_videos')
      .update({ display_order: diagnosisOrder })
      .eq('id', survivalVideo.id)

    return NextResponse.json({ 
      success: true,
      message: 'Swapped order - Diagnosis is now first',
      before: {
        diagnosis: { title: diagnosisVideo.title, order: diagnosisOrder },
        survival: { title: survivalVideo.title, order: survivalOrder }
      },
      after: {
        diagnosis: { title: diagnosisVideo.title, order: survivalOrder },
        survival: { title: survivalVideo.title, order: diagnosisOrder }
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

