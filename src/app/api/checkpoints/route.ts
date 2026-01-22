import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST - Create new checkpoint
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      module_id, 
      title, 
      description, 
      requirements, 
      ai_grading_prompt, 
      ai_review_enabled, 
      requires_manual_review 
    } = body

    if (!module_id || !title || !requirements) {
      return NextResponse.json(
        { error: 'Missing required fields: module_id, title, requirements' },
        { status: 400 }
      )
    }

    // Check if checkpoint already exists for this module
    const { data: existing } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id')
      .eq('module_id', module_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Checkpoint already exists for this module' },
        { status: 400 }
      )
    }

    // Create checkpoint
    const { data: checkpoint, error } = await (supabaseAdmin as any)
      .from('checkpoints')
      .insert({
        module_id,
        title,
        description: description || null,
        requirements,
        ai_grading_prompt: ai_grading_prompt || null,
        ai_review_enabled: ai_review_enabled !== false,
        requires_manual_review: requires_manual_review === true
      })
      .select()
      .single()

    if (error) {
      console.error('[Create Checkpoint] Error:', error)
      return NextResponse.json(
        { error: `Failed to create checkpoint: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ checkpoint })

  } catch (error: any) {
    console.error('[Create Checkpoint] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkpoint' },
      { status: 500 }
    )
  }
}

