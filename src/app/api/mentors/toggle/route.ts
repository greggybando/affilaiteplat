import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Toggle mentor status
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { is_active } = body

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active boolean is required' }, { status: 400 })
    }

    // Check if user has completed at least one course
    const { data: completedCheckpoints, error: checkError } = await (supabaseAdmin as any)
      .from('user_checkpoints')
      .select('id')
      .eq('user_id', affiliate.id)
      .eq('status', 'approved')
      .limit(1)

    if (checkError) {
      console.error('[Mentor Toggle] Error checking completed courses:', checkError)
      return NextResponse.json({ error: 'Failed to verify course completion' }, { status: 500 })
    }

    if (!completedCheckpoints || completedCheckpoints.length === 0) {
      return NextResponse.json(
        { error: 'You must complete at least one course before becoming a mentor' },
        { status: 403 }
      )
    }

    // Check if mentor record exists
    const { data: existingMentor, error: findError } = await (supabaseAdmin as any)
      .from('mentors')
      .select('id, is_active')
      .eq('user_id', affiliate.id)
      .maybeSingle()

    if (findError && findError.code !== 'PGRST116') {
      console.error('[Mentor Toggle] Error finding mentor:', findError)
      return NextResponse.json({ error: 'Failed to check mentor status' }, { status: 500 })
    }

    let mentorId: string

    if (existingMentor) {
      // Update existing mentor
      const { data: updated, error: updateError } = await (supabaseAdmin as any)
        .from('mentors')
        .update({
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMentor.id)
        .select('id, is_active, availability')
        .single()

      if (updateError) {
        console.error('[Mentor Toggle] Error updating mentor:', updateError)
        return NextResponse.json({ error: 'Failed to update mentor status' }, { status: 500 })
      }

      mentorId = updated.id
    } else {
      // Create new mentor record
      const { data: created, error: createError } = await (supabaseAdmin as any)
        .from('mentors')
        .insert({
          user_id: affiliate.id,
          is_active,
          availability: 'offline'
        })
        .select('id, is_active, availability')
        .single()

      if (createError) {
        console.error('[Mentor Toggle] Error creating mentor:', createError)
        return NextResponse.json({ error: 'Failed to create mentor profile' }, { status: 500 })
      }

      mentorId = created.id
    }

    return NextResponse.json({
      success: true,
      mentor: {
        id: mentorId,
        is_active,
        message: is_active ? 'You are now available as a mentor!' : 'You are no longer available as a mentor.'
      }
    })
  } catch (error: any) {
    console.error('[Mentor Toggle] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

