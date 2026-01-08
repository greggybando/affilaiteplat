import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// PUT /api/group-chat/chats/[chatId]/mute - Toggle mute status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> | { chatId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { chatId } = await Promise.resolve(params)
    const { muted } = await request.json()

    // Update mute status
    const { error } = await (supabaseAdmin
      .from('group_chat_participants') as any)
      .update({ muted: muted === true })
      .eq('affiliate_id', affiliate.id)
      .eq('group_chat_id', chatId)

    if (error) {
      console.error('Error updating mute status:', error)
      return NextResponse.json({ error: 'Failed to update mute status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, muted })
  } catch (error: any) {
    console.error('API mute chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





