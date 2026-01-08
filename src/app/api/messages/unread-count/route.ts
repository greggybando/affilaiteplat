import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = affiliate.id

    // Find all conversations for user
    const { data: convs, error: convErr } = await (supabaseAdmin as any)
      .from('dm_conversations')
      .select('id')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)

    if (convErr) {
      console.error('Unread count conv error:', convErr)
      return NextResponse.json({ error: 'Failed to fetch unread' }, { status: 500 })
    }

    if (!convs || convs.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    const convIds = convs.map((c: any) => c.id)

    const { count, error: msgErr } = await (supabaseAdmin as any)
      .from('dm_messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('sender_id', userId)
      .is('read_at', null)

    if (msgErr) {
      console.error('Unread count msg error:', msgErr)
      return NextResponse.json({ error: 'Failed to fetch unread' }, { status: 500 })
    }

    return NextResponse.json({ count: count ?? 0 })
  } catch (error: any) {
    console.error('Unread count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

