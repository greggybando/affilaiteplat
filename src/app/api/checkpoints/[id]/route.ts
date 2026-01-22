import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PATCH - Update checkpoint
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      requirements, 
      ai_grading_prompt, 
      ai_review_enabled, 
      requires_manual_review 
    } = body

    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (requirements !== undefined) updates.requirements = requirements
    if (ai_grading_prompt !== undefined) updates.ai_grading_prompt = ai_grading_prompt
    if (ai_review_enabled !== undefined) updates.ai_review_enabled = ai_review_enabled
    if (requires_manual_review !== undefined) updates.requires_manual_review = requires_manual_review

    const { data: checkpoint, error } = await (supabaseAdmin as any)
      .from('checkpoints')
      .update(updates)
      .eq('id', params.checkpointId)
      .select()
      .single()

    if (error) {
      console.error('[Update Checkpoint] Error:', error)
      return NextResponse.json(
        { error: `Failed to update checkpoint: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ checkpoint })

  } catch (error: any) {
    console.error('[Update Checkpoint] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update checkpoint' },
      { status: 500 }
    )
  }
}

// DELETE - Delete checkpoint
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await (supabaseAdmin as any)
      .from('checkpoints')
      .delete()
      .eq('id', params.checkpointId)

    if (error) {
      console.error('[Delete Checkpoint] Error:', error)
      return NextResponse.json(
        { error: `Failed to delete checkpoint: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[Delete Checkpoint] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete checkpoint' },
      { status: 500 }
    )
  }
}

