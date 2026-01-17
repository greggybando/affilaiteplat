import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch all courses
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const showAll = request.nextUrl.searchParams.get('all') === 'true'

    let query = supabaseAdmin
      .from('courses')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!showAll) {
      query = query.eq('is_published', true)
    }

    const { data: courses, error } = await query

    if (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ courses: courses || [] })
  } catch (error: any) {
    console.error('Error in courses API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new course
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, slug, description, emoji, color, thumbnail_url } = body

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 })
    }

    // Get max sort_order to append at end
    const { data: existingCourses } = await supabaseAdmin
      .from('courses')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxOrder = (existingCourses as any)?.[0]?.sort_order ?? -1
    const newOrder = maxOrder + 1

    const { data: course, error } = await (supabaseAdmin
      .from('courses') as any)
      .insert({
        title,
        slug,
        description,
        emoji,
        color,
        thumbnail_url,
        sort_order: newOrder,
        is_published: false // Start unpublished
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ course, id: course.id })
  } catch (error: any) {
    console.error('Error in course create API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update course
export async function PATCH(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    const { data: course, error } = await (supabaseAdmin
      .from('courses') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ course })
  } catch (error: any) {
    console.error('Error in course update API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete course
export async function DELETE(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // CASCADE delete will handle sections, lessons, attachments
    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in course delete API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

