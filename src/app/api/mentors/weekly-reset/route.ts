import { NextRequest, NextResponse } from 'next/server'
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

// POST - Weekly reset cron job (runs Monday midnight)
export async function POST(request: NextRequest) {
  try {
    // Optional: Add API key check for security
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.CRON_SECRET_KEY
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const lastMonday = new Date(now)
    lastMonday.setDate(now.getDate() - 7)
    const lastWeekStart = getMonday(lastMonday)

    console.log(`[Weekly Reset] Processing week ${lastWeekStart}`)

    // Get all mentors with points this week
    const { data: mentors, error: mentorsError } = await (supabaseAdmin as any)
      .from('mentors')
      .select('id, current_week_points')
      .gt('current_week_points', 0)
      .order('current_week_points', { ascending: false })

    if (mentorsError) {
      console.error('[Weekly Reset] Error fetching mentors:', mentorsError)
      return NextResponse.json({ error: 'Failed to fetch mentors' }, { status: 500 })
    }

    // Archive weekly results
    const weeklyResults: any[] = []
    for (const mentor of mentors || []) {
      weeklyResults.push({
        mentor_id: mentor.id,
        week_start: lastWeekStart,
        total_points: mentor.current_week_points || 0
      })
    }

    // Sort and assign ranks
    weeklyResults.sort((a, b) => b.total_points - a.total_points)
    weeklyResults.forEach((result, index) => {
      result.rank = index + 1
    })

    // Insert weekly results (upsert to handle re-runs)
    for (const result of weeklyResults) {
      await (supabaseAdmin as any)
        .from('mentor_weekly_results')
        .upsert(result, {
          onConflict: 'mentor_id,week_start'
        })
    }

    // Find #1 mentor
    let winnerMentorId: string | null = null
    if (weeklyResults.length > 0 && weeklyResults[0].total_points > 0) {
      winnerMentorId = weeklyResults[0].mentor_id

      // Increment weekly_wins, set last_weekly_win
      const { data: winnerMentor } = await (supabaseAdmin as any)
        .from('mentors')
        .select('weekly_wins')
        .eq('id', winnerMentorId)
        .single()

      const newWeeklyWins = (winnerMentor?.weekly_wins || 0) + 1

      await (supabaseAdmin as any)
        .from('mentors')
        .update({
          weekly_wins: newWeeklyWins,
          last_weekly_win: lastWeekStart,
          updated_at: new Date().toISOString()
        })
        .eq('id', winnerMentorId)

      console.log(`[Weekly Reset] Winner: mentor_id=${winnerMentorId}, weekly_wins=${newWeeklyWins}`)
    }

    // For ALL mentors: add current_week_points to lifetime_points, then reset current_week_points
    for (const mentor of mentors || []) {
      const { data: mentorData } = await (supabaseAdmin as any)
        .from('mentors')
        .select('current_week_points, lifetime_points')
        .eq('id', mentor.id)
        .single()

      if (mentorData) {
        const weekPoints = mentorData.current_week_points || 0
        const lifetimePoints = mentorData.lifetime_points || 0

        await (supabaseAdmin as any)
          .from('mentors')
          .update({
            lifetime_points: lifetimePoints + weekPoints,
            current_week_points: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', mentor.id)
      }
    }

    console.log(`[Weekly Reset] Completed for week ${lastWeekStart}. Processed ${mentors?.length || 0} mentors.`)

    return NextResponse.json({
      success: true,
      week_start: lastWeekStart,
      winner_mentor_id: winnerMentorId,
      mentors_processed: mentors?.length || 0
    })
  } catch (error: any) {
    console.error('[Weekly Reset] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

