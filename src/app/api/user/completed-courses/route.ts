import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Check if user has completed at least one course
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: approvedCheckpoints, error: checkError } = await (supabaseAdmin as any)
      .from('user_checkpoints')
      .select('id')
      .eq('user_id', affiliate.id)
      .eq('status', 'approved')
      .limit(1)

    if (checkError) {
      console.error('[Completed Courses] Error checking:', checkError)
      return NextResponse.json({ error: 'Failed to check course completion' }, { status: 500 })
    }

    return NextResponse.json({
      hasCompletedCourse: (approvedCheckpoints?.length || 0) > 0
    })
  } catch (error: any) {
    console.error('[Completed Courses] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

