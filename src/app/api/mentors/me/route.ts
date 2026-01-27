import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Get current user's mentor status
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: mentor, error: mentorError } = await (supabaseAdmin as any)
      .from('mentors')
      .select('id, user_id, is_active, availability, current_day_points, current_week_points, lifetime_points, daily_wins, weekly_wins, raffle_entries')
      .eq('user_id', affiliate.id)
      .maybeSingle()

    if (mentorError && mentorError.code !== 'PGRST116') {
      console.error('[Mentor Me] Error fetching mentor:', mentorError)
      return NextResponse.json({ error: 'Failed to fetch mentor status' }, { status: 500 })
    }

    if (!mentor) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Get current month raffle entries
    const now = new Date()
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const { data: raffleEntries } = await (supabaseAdmin as any)
      .from('mentor_raffle_entries')
      .select('id')
      .eq('mentor_id', mentor.id)
      .eq('month_year', monthYear)
      .eq('used', false)

    return NextResponse.json({
      mentor: {
        id: mentor.id,
        is_active: mentor.is_active,
        availability: mentor.availability,
        current_day_points: mentor.current_day_points || 0,
        current_week_points: mentor.current_week_points || 0,
        lifetime_points: mentor.lifetime_points || 0,
        daily_wins: mentor.daily_wins || 0,
        weekly_wins: mentor.weekly_wins || 0,
        raffle_entries: raffleEntries?.length || 0
      }
    })
  } catch (error: any) {
    console.error('[Mentor Me] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

