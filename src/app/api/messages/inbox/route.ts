import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const INBOX_LIMIT = 50

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = affiliate.id

    const { data: conversations, error } = await (supabaseAdmin as any)
      .from('dm_conversations')
      .select('id, participant_1, participant_2, updated_at')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(INBOX_LIMIT)

    if (error) {
      console.error('Inbox fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 })
    }

    const convIds = (conversations || []).map((c: any) => c.id)
    const partnerIds = (conversations || []).map((c: any) =>
      c.participant_1 === userId ? c.participant_2 : c.participant_1
    )

    const { data: partners } = await supabaseAdmin
      .from('affiliates')
      .select('id, avatar_name, avatar_url, name')
      .in('id', partnerIds)

    const partnerMap = new Map<string, any>()
    partners?.forEach((p: any) => {
      partnerMap.set(p.id, p)
    })

    const { data: lastMessages } = await (supabaseAdmin as any)
      .from('dm_messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    const lastMap = new Map<string, any>()
    lastMessages?.forEach((m: any) => {
      if (!lastMap.has(m.conversation_id)) {
        lastMap.set(m.conversation_id, m)
      }
    })

    // Per-conversation unread counts
    const unreadMap = new Map<string, number>()
    for (const conv of conversations || []) {
      const otherId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1
      const { count } = await (supabaseAdmin as any)
        .from('dm_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('sender_id', otherId)
        .is('read_at', null)
      unreadMap.set(conv.id, count ?? 0)
    }

    const payload = (conversations || []).map((c: any) => {
      const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1
      const partner = partnerMap.get(otherId) || {}
      const last = lastMap.get(c.id)
      return {
        conversation_id: c.id,
        other_user: {
          id: otherId,
          name: partner.avatar_name || partner.name || 'Unknown',
          avatar: partner.avatar_url || null
        },
        last_message: last?.content || '',
        updated_at: c.updated_at,
        unread_count: unreadMap.get(c.id) || 0
      }
    })

    return NextResponse.json({ conversations: payload })
  } catch (error: any) {
    console.error('API inbox error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


