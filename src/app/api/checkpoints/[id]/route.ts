import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Get checkpoint for a specific section or checkpoint ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params

    // First, check if this is a checkpoint ID (UUID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    
    if (isUUID) {
      // Try as checkpoint ID first
      const { data: checkpointById } = await supabaseAdmin
        .from('checkpoints')
        .select('*')
        .eq('id', id)
        .single()
      
      if (checkpointById) {
        return NextResponse.json({ checkpoint: checkpointById })
      }
      
      // Try as section/module UUID
      const { data: section } = await (supabaseAdmin as any)
        .from('course_sections')
        .select('id')
        .eq('id', id)
        .single()
      
      if (section) {
        const sectionTyped = section as any
        const { data: checkpoint } = await (supabaseAdmin as any)
          .from('checkpoints')
          .select('*')
          .eq('section_id', sectionTyped.id)
          .single()
        
        return NextResponse.json({ checkpoint: checkpoint || null })
      }
      
      // Try as module UUID (new system)
      const { data: module } = await (supabaseAdmin as any)
        .from('course_modules')
        .select('id')
        .eq('id', id)
        .single()
      
      if (module) {
        const { data: checkpoint } = await (supabaseAdmin as any)
          .from('checkpoints')
          .select('*')
          .eq('module_id', id)
          .single()
        
        return NextResponse.json({ checkpoint: checkpoint || null })
      }
    } else {
      // Try as numeric section_id field (the numeric identifier, not the UUID primary key)
      const numericId = parseInt(id, 10)
      if (!isNaN(numericId)) {
        const { data: section } = await (supabaseAdmin as any)
          .from('course_sections')
          .select('id')
          .eq('section_id', numericId)
          .single()
        
        if (section) {
          const sectionTyped = section as any
          const { data: checkpoint } = await (supabaseAdmin as any)
            .from('checkpoints')
            .select('*')
            .eq('section_id', sectionTyped.id)
            .single()
          
          return NextResponse.json({ checkpoint: checkpoint || null })
        }
      }
    }

    return NextResponse.json({ checkpoint: null })

  } catch (error: any) {
    console.error('Error fetching checkpoint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checkpoint', message: error.message },
      { status: 500 }
    )
  }
}

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
      .eq('id', params.id)
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
      .eq('id', params.id)

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

