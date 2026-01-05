// app/api/course-assistant/route.ts
// ====================================
// API route for the Dream Job course AI assistant

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAffiliate } from '@/lib/auth';
import crypto from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize clients lazily to avoid build-time errors
let supabaseClient: ReturnType<typeof createClient> | null = null
let anthropicClient: Anthropic | null = null
let openaiClient: OpenAI | null = null

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error(`Missing Supabase credentials: URL=${!!url}, KEY=${!!key}`)
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(url, key)
  }
  return supabaseClient
}

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }
  
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY')
  }
  
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

// Get embedding for a query
async function getQueryEmbedding(query: string): Promise<number[]> {
  const client = getOpenAI()
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  return response.data[0].embedding;
}

// Search course content
async function searchCourseContent(
  queryEmbedding: number[],
  lessonId?: string,
  matchCount: number = 3
) {
  const client = getSupabase()
  const { data, error } = await (client as any).rpc('search_course_content', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_lesson_id: lessonId || null,
  });

  if (error) throw error;
  return data;
}

// Generate hash for question (for caching)
function hashQuestion(question: string): string {
  return crypto.createHash('sha256').update(question.toLowerCase().trim()).digest('hex');
}

// Check cache for existing response
async function getCachedResponse(questionHash: string) {
  const client = getSupabase()
  const { data, error } = await client
    .from('assistant_cache')
    .select('*')
    .eq('question_hash', questionHash)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    .single();

  if (error || !data) return null;
  return data;
}

// Save response to cache
async function saveToCache(questionHash: string, question: string, response: string, sources: any[]) {
  const client = getSupabase()
  const { error } = await (client as any)
    .from('assistant_cache')
    .upsert({
      question_hash: questionHash,
      question: question,
      response: response,
      sources: sources,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'question_hash',
    });

  if (error) {
    console.error('Error saving to cache:', error);
    // Don't throw - caching is optional
  }
}

// Check and increment user's daily question count
async function checkAndIncrementUsage(userId: string): Promise<{ allowed: boolean; count: number }> {
  const client = getSupabase()
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get or create today's usage record
  const { data: usage, error: fetchError } = await (client as any)
    .from('assistant_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching usage:', fetchError);
    // On error, allow the request (fail open)
    return { allowed: true, count: 0 };
  }

  const currentCount = (usage as any)?.question_count || 0;
  const maxQuestions = 50; // Increased from 10 to allow more questions per day

  if (currentCount >= maxQuestions) {
    return { allowed: false, count: currentCount };
  }

  // Increment count
  const { error: updateError } = await (client as any)
    .from('assistant_usage')
    .upsert({
      user_id: userId,
      date: today,
      question_count: currentCount + 1,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,date',
    });

  if (updateError) {
    console.error('Error updating usage:', updateError);
    // On error, allow the request (fail open)
    return { allowed: true, count: currentCount };
  }

  return { allowed: true, count: currentCount + 1 };
}

export async function POST(request: NextRequest) {
  try {
    const { message, lessonId, conversationHistory = [], conversationId } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get current user for rate limiting
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check cache first (cached responses don't count against limit)
    const questionHash = hashQuestion(message)
    const cachedResponse = await getCachedResponse(questionHash)
    
    if (cachedResponse) {
      console.log('Returning cached response for question:', message.substring(0, 50))
      const cached = cachedResponse as any
      return NextResponse.json({
        message: cached.response,
        cached: true,
      });
    }

    // Check rate limit (50 questions per day) - only for new questions
    const usageCheck = await checkAndIncrementUsage(affiliate.id)
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: "You've reached your daily limit of 50 questions. Please try again tomorrow."
        },
        { status: 429 }
      );
    }

    // Validate environment variables with detailed logging
    const envCheck = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
    
    const missingVars = Object.entries(envCheck)
      .filter(([_, exists]) => !exists)
      .map(([key]) => key)
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars)
      console.error('Environment check:', envCheck)
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          message: `Missing environment variables: ${missingVars.join(', ')}. Please configure these in your Vercel project settings.`,
          debug: envCheck
        },
        { status: 500 }
      );
    }

    // 1. Get embedding for the user's question
    let queryEmbedding: number[];
    try {
      queryEmbedding = await getQueryEmbedding(message);
    } catch (error: any) {
      console.error('Error getting embedding:', error);
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          message: error.message || 'Failed to initialize OpenAI client. Please check environment variables.',
        },
        { status: 500 }
      );
    }

    // 2. Search for relevant content
    // First, get content from the current lesson (if specified)
    let relevantChunks: any[] = [];
    
    try {
      if (lessonId) {
        try {
          // Prioritize current lesson content
          const lessonContent = await searchCourseContent(queryEmbedding, lessonId, 3);
          if (lessonContent && Array.isArray(lessonContent)) {
            relevantChunks.push(...lessonContent);
          }
        } catch (error) {
          console.error('Error searching lesson content:', error);
          // Continue with global search
        }
      }
      
      // Also get globally relevant content (reduced to 3 chunks total)
      try {
        const remainingSlots = Math.max(0, 3 - relevantChunks.length);
        if (remainingSlots > 0) {
          const globalContent = await searchCourseContent(queryEmbedding, undefined, remainingSlots);
          if (globalContent && Array.isArray(globalContent)) {
            // Combine and deduplicate
            const seenIds = new Set(relevantChunks.map((c: any) => c.id));
            for (const chunk of globalContent) {
              if (!seenIds.has(chunk.id) && relevantChunks.length < 3) {
                relevantChunks.push(chunk);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error searching global content:', error);
        // Continue with whatever chunks we have
      }
    } catch (error: any) {
      console.error('Error in searchCourseContent:', error);
      if (error.message?.includes('Missing Supabase')) {
        return NextResponse.json(
          { 
            error: 'Server configuration error',
            message: 'Failed to connect to Supabase. Please check environment variables.',
          },
          { status: 500 }
        );
      }
      // Continue with empty chunks
    }

    // If no chunks found, return a helpful message
    if (relevantChunks.length === 0) {
      return NextResponse.json({
        message: "I couldn't find any relevant content in the course materials for your question. Please try rephrasing your question or ask about a specific lesson topic.",
      });
    }

    // 3. Build context from retrieved chunks
    const context = relevantChunks
      .map((chunk: any) => {
        return `[${chunk.module || 'Unknown'} - ${chunk.lesson || 'Unknown'}]\n${chunk.content || ''}\n${chunk.video_url ? `(Video: ${chunk.video_url})` : ''}`;
      })
      .join('\n\n---\n\n');

    // 4. Build the prompt
    const systemPrompt = `You are Matt's AI assistant for the Dream Job course. You're like a firm parent who loves them and wants the best for them - direct, honest, encouraging, but no BS.

CRITICAL CONTEXT - WHO YOU'RE TALKING TO:
- These are TOTAL BEGINNERS. They know basically nothing about business or using online tools.
- They're getting jobs this way for the FIRST TIME EVER.
- They've never done trial projects, outreach, research, or any of this before.
- They need HAND-HOLDING but in a firm, friendly way.
- Keep everything SUPER SIMPLE. Break things down into tiny, digestible steps.
- Explain terms that might seem obvious (like "outreach" = sending messages to people, "trial project" = a small piece of work you do for free to show you can do the job).

You have two sources of knowledge:
1. The Dream Job course content (provided in context below)
2. Your general AI knowledge

RULES:
- Use course frameworks as the foundation (trial projects, FBS hooks, research protocol, outreach templates, 25-5 protocol, etc.)
- Apply these frameworks to ANY industry the user asks about - construction, healthcare, finance, restaurants, tech, whatever
- Generate specific, actionable ideas using your AI knowledge combined with course principles
- NEVER say "I don't have that in the course content" or "the course focuses on tech companies"
- NEVER say "I don't have access to that information"
- BE HELPFUL. If they ask for construction project ideas, give them 5 solid ideas that apply the trial project methodology
- When they ask for ideas, GIVE THEM IDEAS. Use the course framework + your knowledge to brainstorm with them

TONE (CRITICAL - This is your personality):
- Direct and honest - tell them what they need to hear, not what they want to hear
- Friendly but firm - like a parent who loves you but won't let you make excuses
- Encouraging but real - "You got this, but here's what you need to do..."
- No BS - cut through the fluff, get to the point
- Action-oriented - always push them toward taking action
- Casual language, no corporate speak
- Keep it concise - get to the point fast
- Use phrases like "Here's the deal...", "The truth is...", "What you need to do is...", "Let's be real...", "Here's what's actually going to work..."
- End with a specific next step or question when it makes sense
- For emphasis: Use ALL CAPS for key points or make it a headline, but NEVER use markdown syntax like **bold** or *italic* - just use plain text

SIMPLICITY RULES (CRITICAL FOR BEGINNERS):
- Break EVERYTHING into tiny steps. Don't assume they know anything.
- Explain what things mean in simple terms. Example: "A trial project is basically a small piece of work you do for free to show them you can do the job. Think of it like a sample."
- Give them the EXACT steps. Not "research the company" but "Go to their website, click 'About Us', read what they do, write down 3 things you learned."
- Use simple language. Say "send them a message" not "initiate outreach via email."
- Be hand-holdy but firm. "Here's exactly what you do: Step 1, Step 2, Step 3. Got it? Now do it."
- If you mention a tool or website, explain what it is and how to find it.
- Don't use jargon unless you explain it immediately after.

FOLLOW-UP QUESTIONS:
- When you give them actionable help (like project ideas, templates, frameworks, step-by-step plans), ALWAYS end with a question to see if they need more help
- Examples: "Do you need help doing this?", "Want me to break this down further?", "Which part should we tackle first?", "Need help getting started?"
- This keeps the conversation going and shows you're ready to help them execute

EXAMPLE TONE (BEGINNER-FRIENDLY):
User: "What project can I make for a construction company?"

✅ GOOD: "Here's the deal - a trial project is basically a small piece of work you do for free to show them you can do the job. For a construction company, you want to show you can help them get projects done on time and under budget.

Here's exactly what you do:

1. Go to their website (just Google the company name + "construction")
2. Look at their "Projects" or "Portfolio" page
3. Pick ONE project they're working on or just finished
4. Create a simple timeline showing when each step should happen (like: Week 1 - Get permits, Week 2 - Start foundation, etc.)
5. Put it in a Google Doc (just go to docs.google.com, make a new document)
6. Send it to them and say "I made this timeline for your [project name] project. Thought it might be helpful."

That's it. You're showing them you can organize and plan - which is what they need.

Which part do you want help with? Finding the company website or making the timeline?"

❌ BAD: "Create a detailed timeline with milestones and track it" (too vague, assumes they know what milestones are, doesn't tell them HOW)

COURSE CONTEXT:
${context}

Remember: You're like a firm parent who loves them - direct, honest, encouraging, but no BS. BUT you're talking to total beginners who need everything broken down into tiny, simple steps. Be hand-holdy but firm. Make it so simple a 10-year-old could follow it.`;

    // 5. Build messages array with conversation history
    const messages: any[] = conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));
    
    messages.push({
      role: 'user',
      content: message,
    });

    // 6. Call Claude
    let client: Anthropic;
    try {
      client = getAnthropic();
    } catch (error: any) {
      console.error('Error initializing Anthropic:', error);
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          message: error.message || 'Failed to initialize Anthropic client. Please check ANTHROPIC_API_KEY.',
        },
        { status: 500 }
      );
    }
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    // 7. Extract response text
    const assistantMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    // 8. Save to cache (async, don't wait) - no sources needed
    saveToCache(questionHash, message, assistantMessage, []).catch(err => {
      console.error('Error saving to cache (non-blocking):', err);
    });

    // 9. Return response (no sources, include conversationId if provided)
    return NextResponse.json({
      message: assistantMessage,
      cached: false,
      conversationId: conversationId || null, // Pass through for client to save messages
    });

  } catch (error: any) {
    console.error('Course assistant error:', error);
    const errorMessage = error?.message || 'Failed to process request';
    return NextResponse.json(
      { 
        error: errorMessage,
        message: 'Sorry, I encountered an error processing your request. Please try again or rephrase your question.'
      },
      { status: 500 }
    );
  }
}

