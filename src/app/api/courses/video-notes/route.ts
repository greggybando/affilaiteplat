import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch notes for a video (public access - all users can view)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const videoId = searchParams.get('videoId')
    const courseType = searchParams.get('courseType') // 'mindset' or 'dreamjob'

    if (!videoId || !courseType) {
      return NextResponse.json({ error: 'Missing videoId or courseType' }, { status: 400 })
    }

    // Fetch notes for this video (public - all users can view)
    const { data: note, error } = await supabaseAdmin
      .from('video_notes')
      .select('id, notes, updated_at')
      .eq('video_id', videoId)
      .eq('course_type', courseType)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return NextResponse.json({ 
      notes: (note as any)?.notes || '',
      updatedAt: (note as any)?.updated_at || null
    })
  } catch (error: any) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// PUT - Save notes for a video (admin only)
export async function PUT(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId, courseType, notes } = await request.json()

    if (!videoId || !courseType) {
      return NextResponse.json({ error: 'Missing videoId or courseType' }, { status: 400 })
    }

    // Use upsert with proper conflict handling
    // First try to get existing note
    const { data: existing } = await supabaseAdmin
      .from('video_notes')
      .select('id, created_by')
      .eq('video_id', videoId)
      .eq('course_type', courseType)
      .maybeSingle()

    const upsertData: any = {
      video_id: videoId,
      course_type: courseType,
      notes: notes || '',
      updated_at: new Date().toISOString()
    }

    // Preserve created_by if note exists, otherwise set it
    if (existing && existing.created_by) {
      upsertData.created_by = existing.created_by
    } else {
      upsertData.created_by = affiliate.id
    }

    const { data: note, error } = await supabaseAdmin
      .from('video_notes')
      .upsert(upsertData, {
        onConflict: 'video_id,course_type'
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error saving notes:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Video ID:', videoId, 'Course Type:', courseType, 'Affiliate ID:', affiliate.id)
      return NextResponse.json({ 
        error: 'Failed to save notes',
        details: error.message || error.code || 'Unknown error',
        hint: 'Make sure the video_notes table exists with UNIQUE constraint on (video_id, course_type). Run the SQL migration if needed.'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, notes: (note as any)?.notes || '' })
  } catch (error: any) {
    console.error('Error saving notes:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

