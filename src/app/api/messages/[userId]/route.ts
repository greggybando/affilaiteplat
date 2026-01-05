import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/messages/[userId] - Get messages with a specific user
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

    // Get all messages between current user and target user
    const { data: messages, error } = await supabaseAdmin
      .from('direct_messages')
      .select(`
        id,
        sender_id,
        recipient_id,
        message,
        read,
        created_at,
        sender:affiliates!direct_messages_sender_id_fkey(id, avatar_name, avatar_url),
        recipient:affiliates!direct_messages_recipient_id_fkey(id, avatar_name, avatar_url)
      `)
      .or(`and(sender_id.eq.${affiliate.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${affiliate.id})`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching conversation:', error)
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 })
    }

    // Mark messages as read
    await (supabaseAdmin
      .from('direct_messages') as any)
      .update({ read: true })
      .eq('recipient_id', affiliate.id)
      .eq('sender_id', userId)
      .eq('read', false)

    return NextResponse.json({ messages: messages || [] })
  } catch (error: any) {
    console.error('API messages userId error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/messages/[userId] - Send a message to a user
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
    const { message } = await request.json()

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 })
    }

    // Create message
    const { data, error } = await (supabaseAdmin
      .from('direct_messages') as any)
      .insert({
        sender_id: affiliate.id,
        recipient_id: userId,
        message: message.trim()
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Create notification if recipient has DM notifications enabled
    const { data: prefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('dm_enabled')
      .eq('affiliate_id', userId)
      .single()

    if (!prefs || (prefs as any).dm_enabled) {
      const { data: sender } = await supabaseAdmin
        .from('affiliates')
        .select('avatar_name')
        .eq('id', affiliate.id)
        .single()

      await (supabaseAdmin
        .from('notifications') as any)
        .insert({
          affiliate_id: userId,
          type: 'dm',
          title: 'New Message',
          message: `${(sender as any)?.avatar_name || 'Someone'} sent you a message`,
          link: `/dashboard?dm=${affiliate.id}`
        })
    }

    return NextResponse.json({ message: data })
  } catch (error: any) {
    console.error('API messages send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

