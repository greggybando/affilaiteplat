// src/app/api/checkout/route.ts
// UPDATED: Subscription checkout that passes sid attribution through to Stripe.
// If someone arrives at checkout via /subscribe?ref=GRANT123, the sid carries through
// so the webhook can credit the affiliate for the subscription.
//
// This replaces your existing checkout route. The only change is reading sid
// from the request and adding it + affiliate info to Stripe metadata.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentAffiliate } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { priceId, sid } = body

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.millionairelifedesign.com'

    const finalPriceId = (priceId || process.env.STRIPE_AFFILIATE_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID)?.trim()
    if (!finalPriceId) {
      return NextResponse.json({ error: 'No Stripe price ID configured' }, { status: 500 })
    }

    // Look up attribution if sid provided
    let affiliateCode = ''
    let affiliateId = ''

    if (sid) {
      const { data: attrSession } = await (supabaseAdmin as any)
        .from('attribution_sessions')
        .select('affiliate_id, affiliate_code, entry_type')
        .eq('sid', sid)
        .single()

      if (attrSession) {
        affiliateCode = attrSession.affiliate_code || ''
        affiliateId = attrSession.affiliate_id || ''
      }
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

    // Add attribution metadata if present
    if (sid) {
      params['metadata[sid]'] = sid
      params['metadata[affiliate_code]'] = affiliateCode
      params['metadata[referring_affiliate_id]'] = affiliateId
      params['subscription_data[metadata][sid]'] = sid
      params['subscription_data[metadata][affiliate_code]'] = affiliateCode
      params['subscription_data[metadata][referring_affiliate_id]'] = affiliateId
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
