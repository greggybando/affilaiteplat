import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, courseType, items, categoryId } = await request.json()

    if (!type || !courseType || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing type, courseType, or items array' }, { status: 400 })
    }

    // Update display_order for each item
    for (const item of items) {
      if (type === 'module') {
        // For DreamJob, modules are sections in the 'main' category
        // Find the section by section_id
        const { data: category } = await supabaseAdmin
          .from('course_categories')
          .select('id')
          .eq('course_type', courseType)
          .eq('category_id', 'main')
          .single()

        if (category) {
          await supabaseAdmin
            .from('course_sections')
            .update({ display_order: item.sortOrder } as any)
            .eq('category_id', category.id)
            .eq('section_id', item.id)
        }
      } else if (type === 'section') {
        // Find category by categoryId
        const { data: category } = await supabaseAdmin
          .from('course_categories')
          .select('id')
          .eq('course_type', courseType)
          .eq('category_id', categoryId)
          .single()

        if (category) {
          await supabaseAdmin
            .from('course_sections')
            .update({ display_order: item.sortOrder } as any)
            .eq('category_id', category.id)
            .eq('section_id', item.id)
        }
      } else if (type === 'category') {
        await supabaseAdmin
          .from('course_categories')
          .update({ display_order: item.sortOrder } as any)
          .eq('course_type', courseType)
          .eq('category_id', item.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error reordering:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

