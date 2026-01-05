// app/api/course-assistant/conversations/route.ts
// ============================================
// API routes for managing course assistant conversations

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAffiliate } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/course-assistant/conversations - Get all conversations for current user
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate();
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversations, error } = await (supabaseAdmin
      .from('course_assistant_conversations') as any)
      .select('id, lesson_id, lesson_title, module_name, title, created_at, updated_at')
      .eq('user_id', affiliate.id)
      .order('updated_at', { ascending: false })
      .limit(50); // Last 50 conversations

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    return NextResponse.json({ conversations: conversations || [] });
  } catch (error: any) {
    console.error('API conversations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/course-assistant/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate();
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, lessonTitle, moduleName, title } = body;

    const { data: conversation, error } = await (supabaseAdmin
      .from('course_assistant_conversations') as any)
      .insert({
        user_id: affiliate.id,
        lesson_id: lessonId || null,
        lesson_title: lessonTitle || null,
        module_name: moduleName || null,
        title: title || 'New Conversation',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error('API conversations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}




