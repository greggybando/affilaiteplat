// src/app/api/checkout/route.ts
// Subscription checkout

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { priceId } = body

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.millionairelifedesign.com'

    const finalPriceId = (priceId || process.env.STRIPE_AFFILIATE_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID)?.trim()
    if (!finalPriceId) {
      return NextResponse.json({ error: 'No Stripe price ID configured' }, { status: 500 })
    }

    // Build the checkout session params
    const params: Record<string, string> = {
      'customer_email': affiliate.email,
      'mode': 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': finalPriceId,
      'line_items[0][quantity]': '1',
      'success_url': `${baseUrl}/dashboard?checkout=success`,
      'cancel_url': `${baseUrl}/checkout?cancelled=true`,
      'metadata[affiliate_id]': affiliate.id,
      'subscription_data[metadata][affiliate_id]': affiliate.id,
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    })

    const session = await response.json()

    if (!response.ok || session.error) {
      console.error('Stripe API error:', session.error)
      return NextResponse.json(
        { error: session.error?.message || 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    if (!session.url) {
      return NextResponse.json({ error: 'No checkout URL received' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
