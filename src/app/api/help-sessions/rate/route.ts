import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Helper: Calculate points for a session
function calculatePoints(session: any): number {
  let points = 20 // volume

  if (session.response_time_seconds !== null) {
    if (session.response_time_seconds < 120) points += 50
    else if (session.response_time_seconds < 300) points += 10
  }

  if (session.rating === 'amazing') points += 100
  else if (session.rating === 'helpful') points += 50
  else if (session.rating === 'not_helpful') points -= 20

  return points
}

// POST - Rate help session
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { help_session_id, rating } = body

    if (!help_session_id) {
      return NextResponse.json({ error: 'help_session_id is required' }, { status: 400 })
    }

    if (!['not_helpful', 'helpful', 'amazing'].includes(rating)) {
      return NextResponse.json(
        { error: 'rating must be one of: not_helpful, helpful, amazing' },
        { status: 400 }
      )
    }

    // Get help session and verify mentee
    const { data: session, error: sessionError } = await (supabaseAdmin as any)
      .from('help_sessions')
      .select('id, mentee_id, mentor_id, rating, day_date, week_start')
      .eq('id', help_session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Help session not found' }, { status: 404 })
    }

    if (session.mentee_id !== affiliate.id) {
      return NextResponse.json({ error: 'Unauthorized - not the mentee for this session' }, { status: 403 })
    }

    // Update rating
    const { data: updated, error: updateError } = await (supabaseAdmin as any)
      .from('help_sessions')
      .update({
        rating,
        rated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', help_session_id)
      .select('id, rating, rated_at, response_time_seconds')
      .single()

    if (updateError) {
      console.error('[Help Session Rate] Error updating:', updateError)
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
    }

    // Recalculate points for this session
    const sessionWithRating = { ...updated, rating }
    const points = calculatePoints(sessionWithRating)

    // Update mentor's points
    const { data: mentor } = await (supabaseAdmin as any)
      .from('mentors')
      .select('current_day_points, current_week_points, lifetime_points')
      .eq('id', session.mentor_id)
      .single()

    if (mentor) {
      // If session was previously rated, subtract old points first
      let oldPoints = 0
      if (session.rating) {
        const oldSession = { ...session, rating: session.rating }
        oldPoints = calculatePoints(oldSession)
      }

      const pointsDiff = points - oldPoints

      await (supabaseAdmin as any)
        .from('mentors')
        .update({
          current_day_points: (mentor.current_day_points || 0) + pointsDiff,
          current_week_points: (mentor.current_week_points || 0) + pointsDiff,
          lifetime_points: (mentor.lifetime_points || 0) + pointsDiff,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.mentor_id)
    }

    return NextResponse.json({
      success: true,
      rating: updated.rating,
      rated_at: updated.rated_at,
      points_awarded: points,
      message: 'Thank you for your feedback!'
    })
  } catch (error: any) {
    console.error('[Help Session Rate] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

