import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentAffiliate } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || !affiliate.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { course_id, title } = await req.json()

    if (!course_id || !title) {
      return NextResponse.json({ error: 'Missing course_id or title' }, { status: 400 })
    }

    // Get max sort_order
    const { data: existing } = await supabase
      .from('course_modules')
      .select('sort_order')
      .eq('course_id', course_id)
      .order('sort_order', { ascending: false })
      .limit(1)

    const slug = title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { data, error } = await supabase
      .from('course_modules')
      .insert({
        course_id,
        title,
        slug,
        sort_order: (existing?.[0]?.sort_order || 0) + 1,
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating module:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error in module POST:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || !affiliate.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...updates } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('course_modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating module:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error in module PUT:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || !affiliate.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const { error } = await supabase.from('course_modules').delete().eq('id', id)

    if (error) {
      console.error('Error deleting module:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in module DELETE:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


