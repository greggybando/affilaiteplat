import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Reorder items (courses, sections, or lessons)
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, items } = body // items: [{id, sort_order}, ...]

    if (!type || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    let table: string
    switch (type) {
      case 'course':
        table = 'courses'
        break
      case 'section':
        table = 'course_modules'
        break
      case 'lesson':
        table = 'course_lessons'
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Update sort_order for each item
    for (const item of items) {
      await supabaseAdmin
        .from(table)
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in reorder API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

