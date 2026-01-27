import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Record mentor's first response
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { help_session_id } = body

    if (!help_session_id) {
      return NextResponse.json({ error: 'help_session_id is required' }, { status: 400 })
    }

    // Get help session and verify mentor
    const { data: session, error: sessionError } = await (supabaseAdmin as any)
      .from('help_sessions')
      .select('id, mentor_id, dm_received_at, first_response_at')
      .eq('id', help_session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Help session not found' }, { status: 404 })
    }

    // Verify this is the mentor
    const { data: mentor } = await (supabaseAdmin as any)
      .from('mentors')
      .select('user_id')
      .eq('id', session.mentor_id)
      .single()

    if (!mentor || mentor.user_id !== affiliate.id) {
      return NextResponse.json({ error: 'Unauthorized - not the mentor for this session' }, { status: 403 })
    }

    // Check if already responded
    if (session.first_response_at) {
      return NextResponse.json({
        success: true,
        message: 'Response already recorded',
        response_time_seconds: session.response_time_seconds
      })
    }

    // Calculate response time
    const receivedAt = new Date(session.dm_received_at)
    const respondedAt = new Date()
    const responseTimeSeconds = Math.floor((respondedAt.getTime() - receivedAt.getTime()) / 1000)

    // Update session
    const { data: updated, error: updateError } = await (supabaseAdmin as any)
      .from('help_sessions')
      .update({
        first_response_at: respondedAt.toISOString(),
        response_time_seconds,
        updated_at: respondedAt.toISOString()
      })
      .eq('id', help_session_id)
      .select('id, response_time_seconds, first_response_at')
      .single()

    if (updateError) {
      console.error('[Help Session Respond] Error updating:', updateError)
      return NextResponse.json({ error: 'Failed to record response' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      response_time_seconds,
      first_response_at: updated.first_response_at
    })
  } catch (error: any) {
    console.error('[Help Session Respond] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

