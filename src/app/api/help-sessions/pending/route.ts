import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Get sessions user needs to rate
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get unrated help sessions where user is mentee and mentor has responded
    const { data: sessions, error: sessionsError } = await (supabaseAdmin as any)
      .from('help_sessions')
      .select(`
        id,
        mentor_id,
        dm_thread_id,
        first_response_at,
        mentors:mentor_id (
          user_id,
          affiliates:user_id (
            id,
            name,
            avatar_name,
            avatar_url
          )
        )
      `)
      .eq('mentee_id', affiliate.id)
      .is('rating', null)
      .not('first_response_at', 'is', null)
      .order('first_response_at', { ascending: false })

    if (sessionsError) {
      console.error('[Pending Rating] Error fetching sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch pending ratings' }, { status: 500 })
    }

    const formattedSessions = (sessions || []).map((session: any) => ({
      id: session.id,
      mentor_id: session.mentor_id,
      mentor_name: session.mentors?.affiliates?.name || 'Unknown',
      mentor_avatar: session.mentors?.affiliates?.avatar_url || session.mentors?.affiliates?.avatar_name,
      dm_thread_id: session.dm_thread_id,
      first_response_at: session.first_response_at
    }))

    return NextResponse.json({
      sessions: formattedSessions,
      count: formattedSessions.length
    })
  } catch (error: any) {
    console.error('[Pending Rating] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

