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

    const { type, courseType, items } = await request.json()

    if (!type || !courseType || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing type, courseType, or items array' }, { status: 400 })
    }

    // For now, the courses are hardcoded, so we'll just return success
    // In the future, when courses are database-driven, update sort_order here
    // This endpoint exists to prevent errors when drag-and-drop is used
    // The actual reordering happens client-side for hardcoded courses
    
    // If you have database tables for these, uncomment and use:
    // for (const item of items) {
    //   if (type === 'module') {
    //     await supabaseAdmin
    //       .from('course_modules')
    //       .update({ sort_order: item.sortOrder } as any)
    //       .eq('id', item.id)
    //   } else if (type === 'section') {
    //     await supabaseAdmin
    //       .from('course_sections')
    //       .update({ sort_order: item.sortOrder } as any)
    //       .eq('id', item.id)
    //   } else if (type === 'category') {
    //     await supabaseAdmin
    //       .from('course_categories')
    //       .update({ sort_order: item.sortOrder } as any)
    //       .eq('id', item.id)
    //   }
    // }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error reordering:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

