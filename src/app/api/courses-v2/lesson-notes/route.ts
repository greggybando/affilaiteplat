import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch course-wide notes for a lesson (all authenticated users can view)
export async function GET(request: NextRequest) {
  try {
    // Require authentication but allow all authenticated users (not just admins)
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    }

    // Fetch course-wide notes from lesson_notes table (all authenticated users can view)
    const { data: note, error } = await (supabaseAdmin as any)
      .from('lesson_notes')
      .select('id, notes, updated_at')
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (error) {
      console.error('[lesson-notes GET] Error fetching lesson notes:', error)
      throw error
    }

    const notesText = (note as any)?.notes || ''
    console.log('[lesson-notes GET] Fetched notes:', { 
      lessonId, 
      hasNote: !!note, 
      notesLength: notesText.length,
      affiliateId: affiliate.id 
    })

    return NextResponse.json({ 
      notes: notesText,
      updatedAt: (note as any)?.updated_at || null
    })
  } catch (error: any) {
    console.error('Error fetching lesson notes:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// PUT - Save course-wide notes for a lesson (admin only)
export async function PUT(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lessonId, notes } = await request.json()

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    }

    // Use upsert with proper conflict handling (course-wide notes)
    const { data: note, error } = await (supabaseAdmin as any)
      .from('lesson_notes')
      .upsert({
        lesson_id: lessonId,
        notes: notes || '',
        updated_at: new Date().toISOString(),
        created_by: affiliate.id
      }, {
        onConflict: 'lesson_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving lesson notes:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to save notes',
        details: error.message || error.code || 'Unknown error',
        hint: 'Make sure the lesson_notes table exists with UNIQUE constraint on lesson_id. Run the SQL migration if needed.'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, notes: (note as any)?.notes || '' })
  } catch (error: any) {
    console.error('Error saving lesson notes:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

