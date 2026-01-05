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

    // Check if note exists first
    const { data: existingNote, error: checkError } = await supabaseAdmin
      .from('video_notes')
      .select('id')
      .eq('video_id', videoId)
      .eq('course_type', courseType)
      .maybeSingle()

    let note: any
    let error: any

    if (existingNote && !checkError) {
      // Update existing note
      const { data: updatedNote, error: updateError } = await supabaseAdmin
        .from('video_notes')
        .update({
          notes: notes || '',
          updated_at: new Date().toISOString()
        } as any)
        .eq('video_id', videoId)
        .eq('course_type', courseType)
        .select()
        .single()
      
      note = updatedNote
      error = updateError
    } else {
      // Insert new note
      const { data: insertedNote, error: insertError } = await supabaseAdmin
        .from('video_notes')
        .insert({
          video_id: videoId,
          course_type: courseType,
          notes: notes || '',
          created_by: affiliate.id,
          updated_at: new Date().toISOString()
        } as any)
        .select()
        .single()
      
      note = insertedNote
      error = insertError
    }

    if (error) {
      console.error('Error saving notes:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Video ID:', videoId, 'Course Type:', courseType)
      return NextResponse.json({ 
        error: 'Failed to save notes',
        details: error.message || error.code || 'Unknown error',
        hint: 'Make sure the video_notes table exists. Run the SQL migration if needed.'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, notes: (note as any)?.notes || '' })
  } catch (error: any) {
    console.error('Error saving notes:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

