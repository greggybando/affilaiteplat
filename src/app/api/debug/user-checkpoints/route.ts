import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Debug endpoint to see user's checkpoint status
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    // Get all user's checkpoint submissions
    const { data: userCheckpoints, error: ucError } = await supabaseAdmin
      .from('user_checkpoints')
      .select(`
        id,
        checkpoint_id,
        status,
        submitted_at,
        reviewed_at,
        ai_status,
        checkpoints (
          id,
          title,
          section_id,
          course_sections (
            id,
            title,
            display_order,
            section_id
          )
        )
      `)
      .eq('user_id', affiliate.id)

    if (ucError) {
      console.error('Error fetching user checkpoints:', ucError)
    }

    // Get all checkpoints with their sections
    const { data: allCheckpoints } = await supabaseAdmin
      .from('checkpoints')
      .select(`
        id,
        title,
        section_id,
        course_sections (
          id,
          title,
          display_order,
          section_id,
          category_id
        )
      `)

    // Get course sections
    const { data: sections } = await supabaseAdmin
      .from('course_sections')
      .select('id, title, display_order, section_id, category_id')
      .order('display_order')

    return NextResponse.json({
      userId: affiliate.id,
      email: affiliate.email,
      userCheckpoints: userCheckpoints || [],
      allCheckpoints: allCheckpoints || [],
      sections: sections || [],
      summary: {
        totalSubmissions: userCheckpoints?.length || 0,
        approvedCount: userCheckpoints?.filter((uc: any) => uc.status === 'approved').length || 0,
        pendingCount: userCheckpoints?.filter((uc: any) => uc.status === 'pending' || uc.status === 'needs_review').length || 0
      }
    })

  } catch (error: any) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


