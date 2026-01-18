import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch notes for a lesson
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    }

    // Fetch notes from user_lesson_progress table
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: progress, error } = await (supabaseAdmin as any)
      .from('user_lesson_progress')
      .select('notes, updated_at')
      .eq('user_id', affiliate.id)
      .eq('lesson_id', lessonId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ 
      notes: (progress as any)?.notes || '',
      updatedAt: (progress as any)?.updated_at || null
    })
  } catch (error: any) {
    console.error('Error fetching lesson notes:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// PUT - Save notes for a lesson
export async function PUT(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lessonId, notes } = await request.json()

    if (!lessonId) {
      return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })
    }

    // Upsert notes in user_lesson_progress
    const { data: progress, error } = await (supabaseAdmin as any)
      .from('user_lesson_progress')
      .upsert({
        user_id: affiliate.id,
        lesson_id: lessonId,
        notes: notes || '',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving lesson notes:', error)
      return NextResponse.json({ 
        error: 'Failed to save notes',
        details: error.message || error.code || 'Unknown error'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, notes: (progress as any)?.notes || '' })
  } catch (error: any) {
    console.error('Error saving lesson notes:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

