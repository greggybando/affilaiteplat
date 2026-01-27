import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Set mentor availability status
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { availability } = body

    if (!['online', 'away', 'offline'].includes(availability)) {
      return NextResponse.json(
        { error: 'availability must be one of: online, away, offline' },
        { status: 400 }
      )
    }

    // Update mentor availability
    const { data: updated, error: updateError } = await (supabaseAdmin as any)
      .from('mentors')
      .update({
        availability,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', affiliate.id)
      .select('id, availability, is_active')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'You must become a mentor first' },
          { status: 404 }
        )
      }
      console.error('[Mentor Availability] Error updating:', updateError)
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      availability: updated.availability,
      message: `Availability set to ${availability}`
    })
  } catch (error: any) {
    console.error('[Mentor Availability] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

