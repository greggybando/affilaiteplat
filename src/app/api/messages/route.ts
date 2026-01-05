import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/messages - Get all conversations for current user
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all conversations (unique users the current user has messaged or received messages from)
    const { data: conversations, error } = await supabaseAdmin
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
      .or(`sender_id.eq.${affiliate.id},recipient_id.eq.${affiliate.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Group by conversation partner
    const conversationMap = new Map<string, any>()
    
    conversations?.forEach((msg: any) => {
      const partnerId = msg.sender_id === affiliate.id ? msg.recipient_id : msg.sender_id
      const partner = msg.sender_id === affiliate.id ? msg.recipient : msg.sender
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partner: {
            id: partner?.id || partnerId,
            name: partner?.avatar_name || partner?.name || 'Unknown',
            avatar: partner?.avatar_url || null
          },
          lastMessage: msg.message,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
          messages: []
        })
      }
      
      const conv = conversationMap.get(partnerId)
      if (!msg.read && msg.recipient_id === affiliate.id) {
        conv.unreadCount++
      }
      // Only keep the most recent message for the list view
      if (new Date(msg.created_at) > new Date(conv.lastMessageTime)) {
        conv.lastMessage = msg.message
        conv.lastMessageTime = msg.created_at
      }
    })

    // Sort by last message time
    const sortedConversations = Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    )

    return NextResponse.json({ conversations: sortedConversations })
  } catch (error: any) {
    console.error('API messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

