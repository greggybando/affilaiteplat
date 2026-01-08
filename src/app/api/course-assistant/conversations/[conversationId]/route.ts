// app/api/course-assistant/conversations/[conversationId]/route.ts
// ===============================================================
// API routes for managing a specific conversation

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAffiliate } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/course-assistant/conversations/[conversationId] - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const affiliate = await getCurrentAffiliate();
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await (supabaseAdmin
      .from('course_assistant_conversations') as any)
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', affiliate.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get all messages for this conversation
    const { data: messages, error } = await (supabaseAdmin
      .from('course_assistant_messages') as any)
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    console.error('API conversation GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/course-assistant/conversations/[conversationId]/messages - Add a message to a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const affiliate = await getCurrentAffiliate();
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const body = await request.json();
    const { role, content } = body;

    if (!role || !content) {
      return NextResponse.json({ error: 'Role and content are required' }, { status: 400 });
    }

    if (role !== 'user' && role !== 'assistant') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await (supabaseAdmin
      .from('course_assistant_conversations') as any)
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', affiliate.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Insert message
    const { data: message, error } = await (supabaseAdmin
      .from('course_assistant_messages') as any)
      .insert({
        conversation_id: conversationId,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('API conversation message POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}





