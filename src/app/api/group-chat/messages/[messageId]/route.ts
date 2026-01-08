import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE /api/group-chat/messages/[messageId] - Delete a message (only by author)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> | { messageId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageId } = await Promise.resolve(params)

    // Check if message exists and user is the author
    const { data: message, error: messageError } = await supabaseAdmin
      .from('group_chat_messages')
      .select('affiliate_id')
      .eq('id', messageId)
      .single() as { data: { affiliate_id: string } | null, error: any }

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.affiliate_id !== affiliate.id) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 })
    }

    // Delete message
    const { error: deleteError } = await supabaseAdmin
      .from('group_chat_messages')
      .delete()
      .eq('id', messageId)

    if (deleteError) {
      console.error('Error deleting message:', deleteError)
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API delete message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


