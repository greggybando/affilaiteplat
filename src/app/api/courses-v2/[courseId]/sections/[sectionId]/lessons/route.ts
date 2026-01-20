import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch all lessons for a section
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string; sectionId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: lessons, error } = await supabaseAdmin
      .from('course_lessons')
      .select('*')
      .eq('module_id', params.sectionId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[API] Error fetching lessons:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ lessons: lessons || [] })
  } catch (error: any) {
    console.error('[API] Error in lessons API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new lesson
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; sectionId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, slug, description, video_url, video_type, content, duration_minutes } = body

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 })
    }

    // Get max sort_order
    const { data: existingLessons } = await supabaseAdmin
      .from('course_lessons')
      .select('sort_order')
      .eq('module_id', params.sectionId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxOrder = (existingLessons as any)?.[0]?.sort_order ?? -1
    const newOrder = maxOrder + 1

    const { data: lesson, error } = await (supabaseAdmin
      .from('course_lessons') as any)
      .insert({
        module_id: params.sectionId,
        title,
        slug,
        description,
        video_url,
        video_type,
        content,
        duration_minutes,
        sort_order: newOrder,
        is_published: true
      })
      .select()
      .single()

    if (error) {
      console.error('[API] Error creating lesson:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ lesson })
  } catch (error: any) {
    console.error('[API] Error in lesson create API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update lesson
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string; sectionId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 })
    }

    console.log('[API] PATCH lesson:', { 
      courseId: params.courseId, 
      sectionId: params.sectionId, 
      lessonId: id, 
      updates,
      body 
    })

    const { data: lesson, error } = await (supabaseAdmin
      .from('course_lessons') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('module_id', params.sectionId)
      .select()
      .single()

    if (error) {
      console.error('[API] Error updating lesson:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[API] Lesson updated successfully:', lesson)
    return NextResponse.json({ lesson })
  } catch (error: any) {
    console.error('[API] Error in lesson update API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete lesson
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; sectionId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 })
    }

    console.log('[API] DELETE lesson:', { courseId: params.courseId, sectionId: params.sectionId, lessonId: id })

    const { error } = await supabaseAdmin
      .from('course_lessons')
      .delete()
      .eq('id', id)
      .eq('module_id', params.sectionId)

    if (error) {
      console.error('[API] Error deleting lesson:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error in lesson delete API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

