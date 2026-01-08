import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// One-time endpoint to update "The Great Unlearning" checkpoint requirements
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the Dream Job category
    const { data: category, error: catError } = await supabaseAdmin
      .from('course_categories')
      .select('id')
      .eq('course_type', 'dreamjob')
      .eq('category_id', 'main')
      .single()

    if (catError || !category) {
      return NextResponse.json(
        { error: 'Dream Job category not found', details: catError?.message },
        { status: 404 }
      )
    }

    const categoryId = (category as any).id

    // Find "THE GREAT UNLEARNING" section (section_id = 2)
    const { data: section, error: secError } = await supabaseAdmin
      .from('course_sections')
      .select('id, title, section_id')
      .eq('category_id', categoryId)
      .eq('section_id', 2)
      .single()

    if (secError || !section) {
      return NextResponse.json(
        { error: 'THE GREAT UNLEARNING section not found', details: secError?.message },
        { status: 404 }
      )
    }

    const sectionId = (section as any).id

    // Find the checkpoint for this section
    const { data: checkpoint, error: cpError } = await supabaseAdmin
      .from('checkpoints')
      .select('id, title, requirements')
      .eq('section_id', sectionId)
      .single()

    if (cpError || !checkpoint) {
      return NextResponse.json(
        { error: 'Checkpoint not found for THE GREAT UNLEARNING section', details: cpError?.message },
        { status: 404 }
      )
    }

    // Update requirements to be simpler
    const newRequirements = 'Submit a sentence explaining what you learned from "The Great Unlearning" module.'

    const checkpointId = (checkpoint as any).id

    const { data: updated, error: updateError } = await (supabaseAdmin as any)
      .from('checkpoints')
      .update({ requirements: newRequirements })
      .eq('id', checkpointId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update checkpoint', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      checkpoint: updated,
      message: 'Checkpoint requirements updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating checkpoint:', error)
    return NextResponse.json(
      { error: 'Failed to update checkpoint', message: error.message },
      { status: 500 }
    )
  }
}

