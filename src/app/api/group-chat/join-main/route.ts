import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/group-chat/join-main - Auto-join user to Main Group Chat
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the Main Group Chat
    const { data: mainChat, error: chatError } = await supabaseAdmin
      .from('group_chats')
      .select('id')
      .eq('name', 'Main Group Chat')
      .maybeSingle()

    if (chatError || !mainChat) {
      console.error('Main Group Chat not found:', chatError)
      return NextResponse.json({ error: 'Main Group Chat not found' }, { status: 404 })
    }

    // Check if user is already a participant
    const { data: existing } = await supabaseAdmin
      .from('group_chat_participants')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('group_chat_id', mainChat.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: 'Already a participant', chatId: mainChat.id })
    }

    // Add user as participant
    const { error: insertError } = await (supabaseAdmin
      .from('group_chat_participants') as any)
      .insert({
        affiliate_id: affiliate.id,
        group_chat_id: mainChat.id
      })

    if (insertError) {
      console.error('Error joining Main Group Chat:', insertError)
      return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Successfully joined', chatId: mainChat.id })
  } catch (error: any) {
    console.error('API join-main error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

