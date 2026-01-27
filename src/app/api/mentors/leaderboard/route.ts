import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Helper: Get Monday of a date
function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

// Helper: Get yesterday's date
function getYesterday(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  return yesterday.toISOString().split('T')[0]
}

// GET - Get leaderboard data
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get mentor of the week (from last completed week)
    const now = new Date()
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - 7)
    const lastWeekStart = getMonday(lastMonday)

    const { data: weeklyResults } = await (supabaseAdmin as any)
      .from('mentor_weekly_results')
      .select(`
        mentor_id,
        total_points,
        rank,
        mentors:mentor_id (
          user_id,
          affiliates:user_id (
            id,
            name,
            avatar_name,
            avatar_url
          ),
          lifetime_points
        )
      `)
      .eq('week_start', lastWeekStart)
      .eq('rank', 1)
      .maybeSingle()

    // Get clouted mentor (top from yesterday)
    const yesterday = getYesterday()
    const { data: yesterdaySessions } = await (supabaseAdmin as any)
      .from('help_sessions')
      .select('mentor_id')
      .eq('day_date', yesterday)

    const mentorPointsMap = new Map<string, number>()
    yesterdaySessions?.forEach((s: any) => {
      mentorPointsMap.set(s.mentor_id, (mentorPointsMap.get(s.mentor_id) || 0) + 1)
    })

    let cloutedMentor: any = null
    if (mentorPointsMap.size > 0) {
      const topMentorId = Array.from(mentorPointsMap.entries())
        .sort((a, b) => b[1] - a[1])[0][0]

      const { data: mentor } = await (supabaseAdmin as any)
        .from('mentors')
        .select(`
          id,
          user_id,
          lifetime_points,
          affiliates:user_id (
            id,
            name,
            avatar_name,
            avatar_url
          )
        `)
        .eq('id', topMentorId)
        .single()

      if (mentor) {
        cloutedMentor = {
          id: mentor.id,
          user_id: mentor.user_id,
          name: mentor.affiliates?.name || 'Unknown',
          avatar_name: mentor.affiliates?.avatar_name,
          avatar_url: mentor.affiliates?.avatar_url,
          lifetime_points: mentor.lifetime_points || 0
        }
      }
    }

    // Get today's leaderboard
    const { data: todayMentors } = await (supabaseAdmin as any)
      .from('mentors')
      .select(`
        id,
        user_id,
        current_day_points,
        lifetime_points,
        affiliates:user_id (
          id,
          name,
          avatar_name,
          avatar_url
        )
      `)
      .eq('is_active', true)
      .gt('current_day_points', 0)
      .order('current_day_points', { ascending: false })
      .limit(10)

    // Get this week's leaderboard
    const { data: weekMentors } = await (supabaseAdmin as any)
      .from('mentors')
      .select(`
        id,
        user_id,
        current_week_points,
        lifetime_points,
        affiliates:user_id (
          id,
          name,
          avatar_name,
          avatar_url
        )
      `)
      .eq('is_active', true)
      .gt('current_week_points', 0)
      .order('current_week_points', { ascending: false })
      .limit(10)

    // Get all-time leaderboard
    const { data: allTimeMentors } = await (supabaseAdmin as any)
      .from('mentors')
      .select(`
        id,
        user_id,
        lifetime_points,
        affiliates:user_id (
          id,
          name,
          avatar_name,
          avatar_url
        )
      `)
      .eq('is_active', true)
      .gt('lifetime_points', 0)
      .order('lifetime_points', { ascending: false })
      .limit(10)

    // Get user's raffle entries for current month
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const { data: userMentor } = await (supabaseAdmin as any)
      .from('mentors')
      .select('id')
      .eq('user_id', affiliate.id)
      .maybeSingle()

    let userRaffleEntries = 0
    if (userMentor) {
      const { data: entries } = await (supabaseAdmin as any)
        .from('mentor_raffle_entries')
        .select('id')
        .eq('mentor_id', userMentor.id)
        .eq('month_year', monthYear)
        .eq('used', false)
      userRaffleEntries = entries?.length || 0
    }

    // Calculate days left in month
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()

    return NextResponse.json({
      mentor_of_week: weeklyResults ? {
        id: weeklyResults.mentor_id,
        name: weeklyResults.mentors?.affiliates?.name || 'Unknown',
        avatar_name: weeklyResults.mentors?.affiliates?.avatar_name,
        avatar_url: weeklyResults.mentors?.affiliates?.avatar_url,
        lifetime_points: weeklyResults.mentors?.lifetime_points || 0,
        points: weeklyResults.total_points
      } : null,
      clouted_mentor: cloutedMentor,
      today: (todayMentors || []).map((m: any, idx: number) => ({
        rank: idx + 1,
        id: m.id,
        user_id: m.user_id,
        name: m.affiliates?.name || 'Unknown',
        avatar_name: m.affiliates?.avatar_name,
        avatar_url: m.affiliates?.avatar_url,
        lifetime_points: m.lifetime_points || 0,
        points: m.current_day_points || 0
      })),
      this_week: (weekMentors || []).map((m: any, idx: number) => ({
        rank: idx + 1,
        id: m.id,
        user_id: m.user_id,
        name: m.affiliates?.name || 'Unknown',
        avatar_name: m.affiliates?.avatar_name,
        avatar_url: m.affiliates?.avatar_url,
        lifetime_points: m.lifetime_points || 0,
        points: m.current_week_points || 0
      })),
      all_time: (allTimeMentors || []).map((m: any, idx: number) => ({
        rank: idx + 1,
        id: m.id,
        user_id: m.user_id,
        name: m.affiliates?.name || 'Unknown',
        avatar_name: m.affiliates?.avatar_name,
        avatar_url: m.affiliates?.avatar_url,
        lifetime_points: m.lifetime_points || 0
      })),
      user_raffle_entries: userRaffleEntries,
      days_left_in_month: daysLeft
    })
  } catch (error: any) {
    console.error('[Leaderboard] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

