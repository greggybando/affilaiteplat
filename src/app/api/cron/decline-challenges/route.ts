import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, etc.)
// It auto-declines challenges that have been pending for more than 48 hours
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if set (for security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    // Find all pending challenges older than 48 hours
    const { data: oldChallenges, error: fetchError } = await (supabaseAdmin
      .from('pod_battles') as any)
      .select('*')
      .eq('status', 'pending')
      .lte('created_at', fortyEightHoursAgo.toISOString())

    if (fetchError) {
      console.error('Error fetching old challenges:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 })
    }

    if (!oldChallenges || oldChallenges.length === 0) {
      return NextResponse.json({ message: 'No challenges to decline', declined: 0 })
    }

    let declined = 0
    const errors: string[] = []

    for (const challenge of oldChallenges) {
      const challengeData = challenge as any

      try {
        // Update challenge status to declined
        const { error: updateError } = await (supabaseAdmin
          .from('pod_battles') as any)
          .update({ status: 'declined' })
          .eq('id', challengeData.id)

        if (updateError) {
          errors.push(`Challenge ${challengeData.id}: ${updateError.message}`)
        } else {
          declined++
          console.log(`Auto-declined challenge ${challengeData.id} (pending for ${Math.round((now.getTime() - new Date(challengeData.created_at).getTime()) / (1000 * 60 * 60))} hours)`)
        }
      } catch (err: any) {
        errors.push(`Challenge ${challengeData.id}: ${err.message}`)
      }
    }

    return NextResponse.json({
      message: `Declined ${declined} of ${oldChallenges.length} challenges`,
      declined,
      total: oldChallenges.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

