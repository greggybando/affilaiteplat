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
    console.log('[API courses-v2 POST] Received body:', JSON.stringify(body, null, 2))
    const { title, slug, description, emoji, color, thumbnail_url } = body

    console.log('[API courses-v2 POST] Extracted values:', { 
      title, 
      slug, 
      titleType: typeof title, 
      slugType: typeof slug,
      titleLength: title?.length,
      slugLength: slug?.length
    })

    if (!title || !slug) {
      console.error('[API courses-v2 POST] Validation failed:', { title, slug, body })
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

// DELETE - Delete course (by query param)
export async function DELETE(request: NextRequest) {
  try {
    console.log('[API DELETE /courses-v2] Received delete request')
    console.log('[API DELETE /courses-v2] URL:', request.url)
    
    const affiliate = await getCurrentAffiliate()
    console.log('[API DELETE /courses-v2] Affiliate:', affiliate?.id, 'Role:', affiliate?.role)
    
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      console.error('[API DELETE /courses-v2] Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    console.log('[API DELETE /courses-v2] Course ID from query:', id)

    if (!id) {
      console.error('[API DELETE /courses-v2] Missing id parameter')
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    console.log('[API DELETE /courses-v2] Attempting to delete course:', id)
    
    // First, check if course exists
    const { data: existingCourse, error: checkError } = await supabaseAdmin
      .from('courses')
      .select('id, title')
      .eq('id', id)
      .single()
    
    if (checkError || !existingCourse) {
      console.error('[API DELETE /courses-v2] Course not found:', checkError)
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    console.log('[API DELETE /courses-v2] Course exists:', (existingCourse as any)?.title || 'Unknown')
    
    // CASCADE delete will handle sections, lessons, attachments
    const { data, error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id)
      .select()

    console.log('[API DELETE /courses-v2] Delete result - data:', data ? JSON.stringify(data) : 'null', 'error:', error ? JSON.stringify(error) : 'null')

    if (error) {
      const errorDetails = {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint
      }
      console.error('[API DELETE /courses-v2] Error deleting course:', errorDetails)
      return NextResponse.json({ 
        error: error.message || 'Failed to delete course',
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint
      }, { status: 500 })
    }

    // Supabase delete with .select() returns deleted rows, but can be empty array if nothing matched
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn('[API DELETE /courses-v2] Delete returned no data - course may not exist or already deleted')
      // Still return success since the course is gone (either deleted or never existed)
      return NextResponse.json({ 
        success: true, 
        message: 'Course deleted (or did not exist)',
        deleted: [] 
      })
    }

    console.log('[API DELETE /courses-v2] Course deleted successfully:', id)
    return NextResponse.json({ success: true, deleted: data })
  } catch (error: any) {
    console.error('[API DELETE /courses-v2] Exception:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json({ 
      error: error?.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}

