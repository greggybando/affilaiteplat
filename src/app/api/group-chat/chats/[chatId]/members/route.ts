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

    // Check 3-chat limit for each member before adding
    const membersToAdd: string[] = []
    const membersAtLimit: string[] = []

    for (const memberId of memberIds) {
      if (memberId === affiliate.id) continue // Skip self

      // Check if already in this chat
      const { data: existing } = await supabaseAdmin
        .from('group_chat_participants')
        .select('id')
        .eq('affiliate_id', memberId)
        .eq('group_chat_id', chatId)
        .maybeSingle()

      if (existing) continue // Already in this chat

      // Check how many chats they're in
      const { count: chatCount } = await supabaseAdmin
        .from('group_chat_participants')
        .select('id', { count: 'exact', head: true })
        .eq('affiliate_id', memberId)
        .not('group_chat_id', 'is', null)

      if ((chatCount || 0) >= 3) {
        membersAtLimit.push(memberId)
      } else {
        membersToAdd.push(memberId)
      }
    }

    // Add members that are under the limit
    if (membersToAdd.length > 0) {
      const memberInserts = membersToAdd.map((id: string) => ({
        affiliate_id: id,
        group_chat_id: chatId
      }))

      const { error: insertError } = await (supabaseAdmin.from('group_chat_participants') as any)
        .insert(memberInserts)
        .select()

      if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
        console.error('Error adding members:', insertError)
        return NextResponse.json({ error: 'Failed to add members' }, { status: 500 })
      }
    }

    // Return success with info about members at limit
    if (membersAtLimit.length > 0) {
      return NextResponse.json({ 
        success: true,
        warning: `${membersAtLimit.length} member(s) could not be added - they are already in 3 chats`,
        added: membersToAdd.length,
        skipped: membersAtLimit.length
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API add members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





