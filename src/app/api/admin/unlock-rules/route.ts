import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - List all unlock rules
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rules, error } = await supabaseAdmin
      .from('unlock_rules')
      .select(`
        *,
        required_checkpoint:checkpoints(
          id,
          title,
          section:course_sections(
            id,
            title,
            category:course_categories(
              id,
              course_type,
              title
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ rules: rules || [] })

  } catch (error: any) {
    console.error('Error fetching unlock rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unlock rules', message: error.message },
      { status: 500 }
    )
  }
}

// POST - Create unlock rule
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetType, targetId, requiredCheckpointId } = await request.json()

    if (!targetType || !targetId || !requiredCheckpointId) {
      return NextResponse.json(
        { error: 'Missing required fields: targetType, targetId, requiredCheckpointId' },
        { status: 400 }
      )
    }

    if (!['course', 'section'].includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType. Must be course or section' },
        { status: 400 }
      )
    }

    // Validate checkpoint exists
    const { data: checkpoint } = await supabaseAdmin
      .from('checkpoints')
      .select('id')
      .eq('id', requiredCheckpointId)
      .single()

    if (!checkpoint) {
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      )
    }

    // Validate target exists
    if (targetType === 'section') {
      const { data: section } = await supabaseAdmin
        .from('course_sections')
        .select('id')
        .eq('id', targetId)
        .single()

      if (!section) {
        return NextResponse.json(
          { error: 'Section not found' },
          { status: 404 }
        )
      }
    } else if (targetType === 'course') {
      // Validate course_type exists
      const validCourseTypes = ['mindset', 'dreamjob', 'affiliate']
      if (!validCourseTypes.includes(targetId)) {
        return NextResponse.json(
          { error: 'Invalid course type' },
          { status: 400 }
        )
      }
    }

    // Check if rule already exists
    const { data: existing } = await supabaseAdmin
      .from('unlock_rules')
      .select('id')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Unlock rule already exists for this target' },
        { status: 400 }
      )
    }

    // Create rule
    const { data: rule, error } = await supabaseAdmin
      .from('unlock_rules')
      .insert({
        target_type: targetType,
        target_id: targetId,
        required_checkpoint_id: requiredCheckpointId
      } as any)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ rule })

  } catch (error: any) {
    console.error('Error creating unlock rule:', error)
    return NextResponse.json(
      { error: 'Failed to create unlock rule', message: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update unlock rule
export async function PUT(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, requiredCheckpointId } = await request.json()

    if (!id || !requiredCheckpointId) {
      return NextResponse.json(
        { error: 'Missing required fields: id, requiredCheckpointId' },
        { status: 400 }
      )
    }

    // Validate checkpoint exists
    const { data: checkpoint } = await supabaseAdmin
      .from('checkpoints')
      .select('id')
      .eq('id', requiredCheckpointId)
      .single()

    if (!checkpoint) {
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      )
    }

    const { data: rule, error } = await (supabaseAdmin as any)
      .from('unlock_rules')
      .update({
        required_checkpoint_id: requiredCheckpointId
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ rule })

  } catch (error: any) {
    console.error('Error updating unlock rule:', error)
    return NextResponse.json(
      { error: 'Failed to update unlock rule', message: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete unlock rule
export async function DELETE(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing rule id' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('unlock_rules')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error deleting unlock rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete unlock rule', message: error.message },
      { status: 500 }
    )
  }
}

