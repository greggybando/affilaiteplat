import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Reorder modules
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
    const { moduleIds } = body

    if (!moduleIds || !Array.isArray(moduleIds)) {
      return NextResponse.json({ error: 'moduleIds array is required' }, { status: 400 })
    }

    // Update sort_order for each module
    for (let i = 0; i < moduleIds.length; i++) {
      const { error } = await (supabaseAdmin as any)
        .from('course_modules')
        .update({ sort_order: i })
        .eq('id', moduleIds[i])
        .eq('course_id', params.courseId)

      if (error) {
        console.error(`[Reorder Modules] Error updating module ${moduleIds[i]}:`, error)
        return NextResponse.json(
          { error: `Failed to update module order: ${error.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[Reorder Modules] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reorder modules' },
      { status: 500 }
    )
  }
}

