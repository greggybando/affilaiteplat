import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE /api/group-chat/chats/[chatId] - Delete a group chat (only creator)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> | { chatId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { chatId } = await Promise.resolve(params)

    // Check if user is the creator
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('group_chats')
      .select('created_by, name')
      .eq('id', chatId)
      .single() as { data: { created_by: string, name: string } | null, error: any }

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Prevent deletion of Main Group Chat
    if (chat.name === 'Main Group Chat') {
      return NextResponse.json({ error: 'Cannot delete the Main Group Chat' }, { status: 403 })
    }

    if (chat.created_by !== affiliate.id) {
      return NextResponse.json({ error: 'Only the creator can delete this chat' }, { status: 403 })
    }

    // Delete chat (cascade will handle participants and messages)
    const { error: deleteError } = await supabaseAdmin
      .from('group_chats')
      .delete()
      .eq('id', chatId)

    if (deleteError) {
      console.error('Error deleting chat:', deleteError)
      return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API delete group chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

