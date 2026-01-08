import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const PAGE_SIZE = 50

async function findOrCreateConversation(userA: string, userB: string): Promise<string> {
  const sorted = [userA, userB].sort()
  const [p1, p2] = sorted

  const { data: existing, error: findErr } = await (supabaseAdmin as any)
    .from('dm_conversations')
    .select('id')
    .or(`and(participant_1.eq.${p1},participant_2.eq.${p2}),and(participant_1.eq.${p2},participant_2.eq.${p1})`)
    .maybeSingle()

  if (findErr) throw findErr
  if (existing) return existing.id

  const { data: created, error: createErr } = await (supabaseAdmin as any)
    .from('dm_conversations')
    .insert({ participant_1: p1, participant_2: p2 })
    .select('id')
    .single()

  if (createErr) throw createErr
  return created.id
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const searchParams = new URL(request.url).searchParams
    const before = searchParams.get('before')

    const conversationId = await findOrCreateConversation(affiliate.id, userId)

    let query = (supabaseAdmin as any)
      .from('dm_messages')
      .select('id, sender_id, content, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error: msgErr } = await query
    if (msgErr) {
      console.error('Error fetching messages:', msgErr)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Mark as read
    await (supabaseAdmin.from('dm_messages') as any)
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('sender_id', userId)
      .is('read_at', null)

    return NextResponse.json({
      conversationId,
      messages: (messages || []).slice().reverse() // oldest -> newest
    })
  } catch (error: any) {
    console.error('API messages GET userId error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const { content } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }

    const conversationId = await findOrCreateConversation(affiliate.id, userId)

    const { data: inserted, error: insertErr } = await (supabaseAdmin
      .from('dm_messages') as any)
      .insert({
        conversation_id: conversationId,
        sender_id: affiliate.id,
        content: content.trim()
      })
      .select('id, sender_id, content, created_at, read_at')
      .single()

    if (insertErr) {
      console.error('Error sending message:', insertErr)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    await (supabaseAdmin as any)
      .from('dm_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json({ message: inserted, conversationId })
  } catch (error: any) {
    console.error('API messages POST userId error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

