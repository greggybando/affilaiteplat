import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// This should be called by a cron job to auto-decline challenges not responded to after 48 hours
export async function POST() {
  try {
    const fortyEightHoursAgo = new Date()
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48)

    // Find pending challenges older than 48 hours
    const { data: expiredChallenges } = await supabaseAdmin
      .from('pod_battles')
      .select('id')
      .eq('status', 'pending')
      .lt('created_at', fortyEightHoursAgo.toISOString())

    if (!expiredChallenges || expiredChallenges.length === 0) {
      return NextResponse.json({ message: 'No challenges to auto-decline', declined: 0 })
    }

    // Decline all expired challenges
    const { error } = await (supabaseAdmin.from('pod_battles') as any)
      .update({ status: 'declined' })
      .in('id', expiredChallenges.map((c: any) => c.id))

    if (error) {
      console.error('Error auto-declining challenges:', error)
      return NextResponse.json({ error: 'Failed to auto-decline challenges' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Challenges auto-declined',
      declined: expiredChallenges.length,
    })
  } catch (error: any) {
    console.error('Auto-decline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




