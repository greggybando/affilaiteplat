import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch all sections for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: sections, error } = await supabaseAdmin
      .from('course_modules')
      .select('*')
      .eq('course_id', params.courseId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching sections:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sections: sections || [] })
  } catch (error: any) {
    console.error('Error in sections API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new section
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, slug, description } = body

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 })
    }

    // Get max sort_order
    const { data: existingSections } = await supabaseAdmin
      .from('course_modules')
      .select('sort_order')
      .eq('course_id', params.courseId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxOrder = (existingSections as any)?.[0]?.sort_order ?? -1
    const newOrder = maxOrder + 1

    const { data: section, error } = await (supabaseAdmin
      .from('course_modules') as any)
      .insert({
        course_id: params.courseId,
        title,
        slug,
        description,
        sort_order: newOrder,
        is_published: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating section:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ section })
  } catch (error: any) {
    console.error('Error in section create API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update section
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Section ID is required' }, { status: 400 })
    }

    const { data: section, error } = await (supabaseAdmin
      .from('course_modules') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('course_id', params.courseId)
      .select()
      .single()

    if (error) {
      console.error('[API] Error updating section:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ section })
  } catch (error: any) {
    console.error('[API] Error in section update API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete section
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Section ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('course_modules')
      .delete()
      .eq('id', id)
      .eq('course_id', params.courseId)

    if (error) {
      console.error('Error deleting section:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in section delete API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

