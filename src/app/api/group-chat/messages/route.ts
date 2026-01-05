import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/group-chat/messages?chatId=xxx - Get group chat messages
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
    }

    // Check if user is a participant
    const { data: participant } = await supabaseAdmin
      .from('group_chat_participants')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('group_chat_id', chatId)
      .maybeSingle()

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    // Get messages (last 100)
    const { data: messages, error } = await supabaseAdmin
      .from('group_chat_messages')
      .select(`
        id,
        affiliate_id,
        message,
        created_at,
        affiliate:affiliates!group_chat_messages_affiliate_id_fkey(id, avatar_name, avatar_url, name)
      `)
      .eq('group_chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Error fetching group chat messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Get participant count
    const { count: participants } = await supabaseAdmin
      .from('group_chat_participants')
      .select('*', { count: 'exact', head: true })
      .eq('group_chat_id', chatId)

    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      user_id: msg.affiliate_id,
      user_name: msg.affiliate?.avatar_name || msg.affiliate?.name || 'Unknown',
      user_avatar: msg.affiliate?.avatar_url || null,
      message: msg.message,
      created_at: msg.created_at
    }))

    return NextResponse.json({ 
      messages: formattedMessages,
      participants: participants || 0
    })
  } catch (error: any) {
    console.error('API group chat messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/group-chat/messages - Send a message
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, chatId } = await request.json()

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 characters)' }, { status: 400 })
    }

    // Check if user is a participant in this specific chat
    const { data: chatParticipant } = await supabaseAdmin
      .from('group_chat_participants')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('group_chat_id', chatId)
      .maybeSingle()

    if (!chatParticipant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    // Create message
    const { data, error } = await (supabaseAdmin
      .from('group_chat_messages') as any)
      .insert({
        affiliate_id: affiliate.id,
        group_chat_id: chatId,
        message: message.trim()
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ message: data })
  } catch (error: any) {
    console.error('API group chat send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

