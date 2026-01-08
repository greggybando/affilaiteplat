import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/group-chat/chats - Get all group chats user is part of
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all chats user is a participant in
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('group_chat_participants')
      .select(`
        group_chat_id,
        muted,
        joined_at,
        group_chat:group_chats!group_chat_participants_group_chat_id_fkey(
          id,
          name,
          created_by,
          created_at
        )
      `)
      .eq('affiliate_id', affiliate.id)
      .order('joined_at', { ascending: false })

    if (participantsError) {
      console.error('Error fetching group chats:', participantsError)
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
    }

    // Get participant counts and last message for each chat
    const chatsWithDetails = await Promise.all(
      (participants || []).map(async (participant: any) => {
        const chatId = participant.group_chat_id

        // Get participant count
        const { count } = await supabaseAdmin
          .from('group_chat_participants')
          .select('*', { count: 'exact', head: true })
          .eq('group_chat_id', chatId)

        // Get last message
        const { data: lastMessage } = await supabaseAdmin
          .from('group_chat_messages')
          .select('created_at, message, affiliate:affiliates!group_chat_messages_affiliate_id_fkey(avatar_name)')
          .eq('group_chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single() as { data: { message: string, created_at: string, affiliate: { avatar_name: string | null } | null } | null }

        return {
          id: chatId,
          name: participant.group_chat?.name || 'Unknown',
          muted: participant.muted,
          participantCount: count || 0,
          lastMessage: lastMessage ? {
            text: lastMessage.message,
            author: lastMessage.affiliate?.avatar_name || 'Unknown',
            time: lastMessage.created_at
          } : null
        }
      })
    )

    return NextResponse.json({ chats: chatsWithDetails })
  } catch (error: any) {
    console.error('API group chat chats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/group-chat/chats - Create a new group chat
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, memberIds } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Chat name is required' }, { status: 400 })
    }

    if (name.length > 255) {
      return NextResponse.json({ error: 'Chat name too long (max 255 characters)' }, { status: 400 })
    }

    // Create the chat
    const { data: chat, error: chatError } = await (supabaseAdmin
      .from('group_chats') as any)
      .insert({
        name: name.trim(),
        created_by: affiliate.id
      })
      .select()
      .single()

    if (chatError) {
      console.error('Error creating chat:', chatError)
      return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
    }

    // Add creator as participant
    // Check if they're already in this specific chat
    const { data: existingCreator } = await supabaseAdmin
      .from('group_chat_participants')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('group_chat_id', chat.id)
      .maybeSingle()

    if (!existingCreator) {
      // Check how many chats they're already in (max 3)
      const { data: existingChats, count: chatCount } = await supabaseAdmin
        .from('group_chat_participants')
        .select('id, group_chat_id', { count: 'exact' })
        .eq('affiliate_id', affiliate.id)
        .not('group_chat_id', 'is', null)

      const currentChatCount = chatCount || 0

      // Enforce 3-chat limit
      if (currentChatCount >= 3) {
        await supabaseAdmin
          .from('group_chats')
          .delete()
          .eq('id', chat.id)
        return NextResponse.json({ 
          error: 'Maximum chat limit reached',
          details: 'You can only be in 3 group chats at a time. Please leave one before creating a new chat.'
        }, { status: 400 })
      }

      // Insert the creator as participant
      const { error: creatorParticipantError, data: insertedParticipant } = await (supabaseAdmin
        .from('group_chat_participants') as any)
        .insert({
          affiliate_id: affiliate.id,
          group_chat_id: chat.id
        })
        .select()
        .single()

      if (creatorParticipantError) {
        console.error('Error adding creator as participant:', creatorParticipantError)
        console.error('Error code:', creatorParticipantError.code)
        console.error('Error message:', creatorParticipantError.message)
        console.error('Error details:', JSON.stringify(creatorParticipantError, null, 2))
        
        // Check if this is a unique constraint violation
        const isUniqueViolation = creatorParticipantError.code === '23505' || 
                                  creatorParticipantError.message?.includes('unique') ||
                                  creatorParticipantError.message?.includes('duplicate')
        
        // Double-check if participant was actually created (race condition)
        const { data: doubleCheck } = await supabaseAdmin
          .from('group_chat_participants')
          .select('id')
          .eq('affiliate_id', affiliate.id)
          .eq('group_chat_id', chat.id)
          .maybeSingle()
        
        if (!doubleCheck) {
          // Participant still doesn't exist - real error, delete chat
          await supabaseAdmin
            .from('group_chats')
            .delete()
            .eq('id', chat.id)
          
          // Return detailed error for debugging
          const errorMessage = creatorParticipantError.message || 'Unknown error'
          const errorCode = creatorParticipantError.code || 'NO_CODE'
          const errorDetails = creatorParticipantError.details || creatorParticipantError.hint || ''
          
          console.error('FINAL ERROR - Participant insert failed:', {
            code: errorCode,
            message: errorMessage,
            details: errorDetails,
            isUniqueViolation,
            currentChatCount,
            fullError: JSON.stringify(creatorParticipantError, null, 2)
          })
          
          // If it's a unique violation, provide helpful message
          if (isUniqueViolation) {
            return NextResponse.json({ 
              error: 'Database constraint: User can only be in one chat. Please run the migration file "drop-unique-affiliate-id-constraint.sql" in your Supabase SQL editor to drop the old UNIQUE(affiliate_id) constraint.',
              details: `Error: ${errorMessage} (Code: ${errorCode}). After running the migration, users will be able to join up to 3 chats.`
            }, { status: 500 })
          }
          
          return NextResponse.json({ 
            error: 'Failed to add creator as participant',
            details: `${errorMessage} (Code: ${errorCode})${errorDetails ? ` - ${errorDetails}` : ''}`
          }, { status: 500 })
        }
        // Participant exists now (race condition), continue
      }
    }
    // If creator already exists in this chat, that's fine, continue

    // Add other members if provided
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const memberInserts = memberIds
        .filter((id: string) => id !== affiliate.id) // Don't add creator twice
        .map((id: string) => ({
          affiliate_id: id,
          group_chat_id: chat.id
        }))

      if (memberInserts.length > 0) {
        const { error: membersError } = await (supabaseAdmin.from('group_chat_participants') as any)
          .insert(memberInserts)
          .select()

        if (membersError && membersError.code !== '23505') { // Ignore duplicate key errors
          console.error('Error adding members:', membersError)
          // Don't fail the whole request if members fail to add, but log it
        }
      }
    }

    return NextResponse.json({ chat })
  } catch (error: any) {
    console.error('API create group chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

