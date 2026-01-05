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

    // Update sort_order for each item
    for (const item of items) {
      if (type === 'module') {
        // For DreamJob, modules are stored in a different structure
        // We'll need to update the database if there's a sort_order field
        // For now, this is a placeholder - the actual implementation depends on your DB structure
        await supabaseAdmin
          .from('course_modules')
          .update({ sort_order: item.sortOrder } as any)
          .eq('id', item.id)
      } else if (type === 'section') {
        await supabaseAdmin
          .from('course_sections')
          .update({ sort_order: item.sortOrder } as any)
          .eq('id', item.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error reordering:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

