import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Helper: Get yesterday's date
function getYesterday(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  return yesterday.toISOString().split('T')[0]
}

// Helper: Get current month-year
function getCurrentMonthYear(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// POST - Daily reset cron job (runs midnight)
export async function POST(request: NextRequest) {
  try {
    // Optional: Add API key check for security
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.CRON_SECRET_KEY
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const yesterday = getYesterday()
    const monthYear = getCurrentMonthYear()

    console.log(`[Daily Reset] Processing day ${yesterday}`)

    // Get all mentors with points today
    const { data: mentors, error: mentorsError } = await (supabaseAdmin as any)
      .from('mentors')
      .select('id, current_day_points')
      .gt('current_day_points', 0)
      .order('current_day_points', { ascending: false })

    if (mentorsError) {
      console.error('[Daily Reset] Error fetching mentors:', mentorsError)
      return NextResponse.json({ error: 'Failed to fetch mentors' }, { status: 500 })
    }

    // Find #1 mentor
    let winnerMentorId: string | null = null
    if (mentors && mentors.length > 0) {
      winnerMentorId = mentors[0].id

      // Increment daily_wins, set last_daily_win, insert raffle entry
      const { data: winnerMentor } = await (supabaseAdmin as any)
        .from('mentors')
        .select('daily_wins, raffle_entries')
        .eq('id', winnerMentorId)
        .single()

      const newDailyWins = (winnerMentor?.daily_wins || 0) + 1
      const newRaffleEntries = (winnerMentor?.raffle_entries || 0) + 1

      await (supabaseAdmin as any)
        .from('mentors')
        .update({
          daily_wins: newDailyWins,
          last_daily_win: yesterday,
          raffle_entries: newRaffleEntries,
          updated_at: new Date().toISOString()
        })
        .eq('id', winnerMentorId)

      // Insert raffle entry
      await (supabaseAdmin as any)
        .from('mentor_raffle_entries')
        .insert({
          mentor_id: winnerMentorId,
          earned_at: yesterday,
          month_year: monthYear,
          used: false
        })

      console.log(`[Daily Reset] Winner: mentor_id=${winnerMentorId}, daily_wins=${newDailyWins}`)
    }

    // For ALL mentors: add current_day_points to current_week_points, then reset current_day_points
    for (const mentor of mentors || []) {
      const { data: mentorData } = await (supabaseAdmin as any)
        .from('mentors')
        .select('current_day_points, current_week_points')
        .eq('id', mentor.id)
        .single()

      if (mentorData) {
        const dayPoints = mentorData.current_day_points || 0
        const weekPoints = mentorData.current_week_points || 0

        await (supabaseAdmin as any)
          .from('mentors')
          .update({
            current_week_points: weekPoints + dayPoints,
            current_day_points: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', mentor.id)
      }
    }

    console.log(`[Daily Reset] Completed for day ${yesterday}. Processed ${mentors?.length || 0} mentors.`)

    return NextResponse.json({
      success: true,
      day: yesterday,
      winner_mentor_id: winnerMentorId,
      mentors_processed: mentors?.length || 0
    })
  } catch (error: any) {
    console.error('[Daily Reset] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

