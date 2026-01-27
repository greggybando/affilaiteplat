import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Helper: Get today's date
function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

// Helper: Get Monday of current week
function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

// POST - Create help session
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mentor_id } = body

    if (!mentor_id) {
      return NextResponse.json({ error: 'mentor_id is required' }, { status: 400 })
    }

    // Verify mentor exists and is active
    const { data: mentor, error: mentorError } = await (supabaseAdmin as any)
      .from('mentors')
      .select('id, user_id, is_active')
      .eq('id', mentor_id)
      .eq('is_active', true)
      .single()

    if (mentorError || !mentor) {
      return NextResponse.json({ error: 'Mentor not found or not active' }, { status: 404 })
    }

    // Prevent self-help sessions
    if (mentor.user_id === affiliate.id) {
      return NextResponse.json({ error: 'Cannot create help session with yourself' }, { status: 400 })
    }

    const dayDate = getToday()
    const weekStart = getCurrentWeekStart()

    // Find or create DM conversation
    const sorted = [affiliate.id, mentor.user_id].sort()
    const [p1, p2] = sorted

    const { data: existingConv } = await (supabaseAdmin as any)
      .from('dm_conversations')
      .select('id')
      .or(`and(participant_1.eq.${p1},participant_2.eq.${p2}),and(participant_1.eq.${p2},participant_2.eq.${p1})`)
      .maybeSingle()

    let conversationId: string
    if (existingConv) {
      conversationId = existingConv.id
    } else {
      const { data: newConv } = await (supabaseAdmin as any)
        .from('dm_conversations')
        .insert({ participant_1: p1, participant_2: p2 })
        .select('id')
        .single()
      conversationId = newConv.id
    }

    // Create help session
    const { data: session, error: createError } = await (supabaseAdmin as any)
      .from('help_sessions')
      .insert({
        mentor_id,
        mentee_id: affiliate.id,
        dm_thread_id: conversationId,
        dm_received_at: new Date().toISOString(),
        day_date: dayDate,
        week_start: weekStart
      })
      .select('id, mentor_id, mentee_id, dm_thread_id, day_date, week_start')
      .single()

    if (createError) {
      console.error('[Help Session] Error creating session:', createError)
      return NextResponse.json({ error: 'Failed to create help session' }, { status: 500 })
    }

    // TODO: Send email notification to mentor

    return NextResponse.json({
      success: true,
      help_session: session,
      conversation_id: conversationId
    })
  } catch (error: any) {
    console.error('[Help Session] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

