import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { transferToAffiliate } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      affiliate_id,
      amount_cents,
      conversion_ids,
      payout_method,
      paypal_email,
      stripe_account_id,
    } = body

    if (!affiliate_id || !amount_cents || !conversion_ids?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let payoutRecord: any = {
      affiliate_id,
      amount_cents,
      payout_method,
      conversion_ids,
      status: 'processing',
    }

    // Process based on payout method
    if (payout_method === 'stripe' && stripe_account_id) {
      // Stripe Connect transfer
      try {
        const transfer = await transferToAffiliate(
          amount_cents,
          stripe_account_id,
          `Affiliate commission payout`
        )
        payoutRecord.stripe_transfer_id = transfer.id
        payoutRecord.status = 'completed'
      } catch (stripeError: any) {
        console.error('Stripe transfer error:', stripeError)
        return NextResponse.json(
          { error: `Stripe transfer failed: ${stripeError.message}` },
          { status: 500 }
        )
      }
    } else if (payout_method === 'paypal' && paypal_email) {
      // For PayPal, we'll mark as completed and you process manually
      // Or integrate PayPal Payouts API here
      payoutRecord.status = 'completed'
      payoutRecord.notes = `Manual PayPal payout to ${paypal_email}`
    } else {
      return NextResponse.json(
        { error: 'Invalid payout method or missing payout details' },
        { status: 400 }
      )
    }

    // Create payout record
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .insert({
        ...payoutRecord,
        completed_at: payoutRecord.status === 'completed' ? new Date().toISOString() : null,
      } as any)
      .select()
      .single()

    if (payoutError) {
      console.error('Error creating payout record:', payoutError)
      return NextResponse.json(
        { error: 'Failed to create payout record' },
        { status: 500 }
      )
    }

    // Update conversions to paid
    const updateData = {
      status: 'paid' as const,
      paid_at: new Date().toISOString(),
    }
    const { error: updateError } = await (supabaseAdmin
      .from('conversions') as any)
      .update(updateData)
      .in('id', conversion_ids)

    if (updateError) {
      console.error('Error updating conversions:', updateError)
      // Don't fail the request, payout was successful
    }

    return NextResponse.json({
      success: true,
      payout: {
        id: (payout as any).id,
        amount_cents: (payout as any).amount_cents,
        status: (payout as any).status,
      },
    })
  } catch (error) {
    console.error('Payout processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
