import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Record a cancellation
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { affiliateId, email, name, canceledAt, subscriptionStartDate, reason } = body

    if (!affiliateId || !email || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('cancellations')
      .insert({
        affiliate_id: affiliateId,
        email,
        name,
        canceled_at: canceledAt || new Date().toISOString(),
        subscription_start_date: subscriptionStartDate || null,
        reason: reason || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording cancellation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ cancellation: data })
  } catch (error: any) {
    console.error('Error in POST /api/admin/cancellations:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

