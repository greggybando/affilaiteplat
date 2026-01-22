import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Fetch user's submission for a specific checkpoint
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const checkpointId = request.nextUrl.searchParams.get('checkpointId')
    if (!checkpointId) {
      return NextResponse.json({ error: 'checkpointId required' }, { status: 400 })
    }

    // Fetch user's submission for this checkpoint
    const { data: submission, error } = await supabaseAdmin
      .from('user_checkpoints')
      .select('*')
      .eq('user_id', affiliate.id)
      .eq('checkpoint_id', checkpointId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[User Submission API] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
    }

    return NextResponse.json({
      submission: submission || null
    })

  } catch (error: any) {
    console.error('[User Submission API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

