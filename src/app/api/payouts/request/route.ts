import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Verify affiliate is authenticated
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { affiliate_id } = body

    // Verify the affiliate_id matches the authenticated user
    if (affiliate_id !== affiliate.id) {
      return NextResponse.json(
        { error: 'Unauthorized - affiliate ID mismatch' },
        { status: 403 }
      )
    }

    // Check if affiliate has payout method set up
    if (!affiliate.payout_method) {
      return NextResponse.json(
        { error: 'Payout method not configured. Please set up PayPal or Stripe in your account settings.' },
        { status: 400 }
      )
    }

    // Get approved conversions for this affiliate
    const { data: conversions, error: conversionsError } = await supabaseAdmin
      .from('conversions')
      .select('id, commission_cents')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'approved')

    if (conversionsError) {
      console.error('Error fetching conversions:', conversionsError)
      return NextResponse.json(
        { error: 'Failed to fetch approved conversions' },
        { status: 500 }
      )
    }

    if (!conversions || conversions.length === 0) {
      return NextResponse.json(
        { error: 'No approved conversions available for payout' },
        { status: 400 }
      )
    }

    // Calculate total amount
    const totalAmount = conversions.reduce(
      (sum: number, c: { commission_cents: number }) => sum + c.commission_cents,
      0
    )

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'No balance available for payout' },
        { status: 400 }
      )
    }

    // Get conversion IDs
    const conversionIds = conversions.map((c: { id: string }) => c.id)

    // Create payout record
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .insert({
        affiliate_id: affiliate.id,
        amount_cents: totalAmount,
        payout_method: affiliate.payout_method,
        status: 'pending',
        conversion_ids: conversionIds,
        notes: `Payout request from affiliate ${affiliate.name} (${affiliate.email})`,
      } as any)
      .select()
      .single()

    if (payoutError) {
      console.error('Error creating payout:', payoutError)
      return NextResponse.json(
        { error: 'Failed to create payout request' },
        { status: 500 }
      )
    }

    console.log('✅ Payout requested:', {
      payoutId: (payout as any).id,
      affiliateId: affiliate.id,
      amount: totalAmount,
      conversionCount: conversionIds.length,
    })

    return NextResponse.json({
      success: true,
      payout: {
        id: (payout as any).id,
        amount_cents: (payout as any).amount_cents,
        status: (payout as any).status,
      },
    })
  } catch (error) {
    console.error('Payout request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

