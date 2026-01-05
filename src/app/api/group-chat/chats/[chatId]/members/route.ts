import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/group-chat/chats/[chatId]/members - Add members to a chat
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
    const { memberIds } = await request.json()

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'Member IDs are required' }, { status: 400 })
    }

    // Check if user is a participant (can add members)
    const { data: participant } = await supabaseAdmin
      .from('group_chat_participants')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('group_chat_id', chatId)
      .maybeSingle()

    if (!participant) {
      return NextResponse.json({ error: 'You must be a member to add others' }, { status: 403 })
    }

    // Add members (skip if already members)
    const memberInserts = memberIds
      .filter((id: string) => id !== affiliate.id)
      .map((id: string) => ({
        affiliate_id: id,
        group_chat_id: chatId
      }))

    if (memberInserts.length > 0) {
      const { error: insertError } = await (supabaseAdmin.from('group_chat_participants') as any)
        .insert(memberInserts)
        .select()

      if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
        console.error('Error adding members:', insertError)
        return NextResponse.json({ error: 'Failed to add members' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API add members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




