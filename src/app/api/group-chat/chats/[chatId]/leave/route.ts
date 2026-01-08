import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/group-chat/chats/[chatId]/leave - Leave a group chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> | { chatId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { chatId } = await Promise.resolve(params)

    // Remove participant
    const { error } = await supabaseAdmin
      .from('group_chat_participants')
      .delete()
      .eq('affiliate_id', affiliate.id)
      .eq('group_chat_id', chatId)

    if (error) {
      console.error('Error leaving chat:', error)
      return NextResponse.json({ error: 'Failed to leave chat' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API leave chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





