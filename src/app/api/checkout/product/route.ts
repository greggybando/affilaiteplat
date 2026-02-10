// src/app/api/checkout/product/route.ts
// Creates a Stripe checkout session for a product purchase
// Attaches attribution session data so the webhook can credit the affiliate

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { product_slug, sid } = body
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.millionairelifedesign.com'

    if (!product_slug) {
      return NextResponse.json({ error: 'product_slug is required' }, { status: 400 })
    }

    // Get product
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('slug', product_slug)
      .eq('status', 'active')
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found or inactive' }, { status: 404 })
    }

    if (!product.stripe_price_id) {
      return NextResponse.json({ error: 'Product not configured for payment' }, { status: 500 })
    }

    // Look up attribution session if sid provided
    let affiliateCode = null
    let affiliateId = null

    if (sid) {
      const { data: session } = await supabaseAdmin
        .from('attribution_sessions')
        .select('affiliate_id, affiliate_code')
        .eq('sid', sid)
        .single()

      if (session) {
        affiliateCode = session.affiliate_code
        affiliateId = session.affiliate_id
      }
    }

    // Build success URL - redirect to upsell shop after purchase
    const successUrl = sid
      ? `${baseUrl}/upsell/shop?sid=${sid}&purchased=${product_slug}&session_id={CHECKOUT_SESSION_ID}`
      : `${baseUrl}/upsell/shop?purchased=${product_slug}&session_id={CHECKOUT_SESSION_ID}`

    const cancelUrl = `${baseUrl}/p/${product_slug}${sid ? `?sid=${sid}` : ''}`

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: product.product_type === 'subscription' ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: product.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_slug: product.slug,
        product_id: product.id,
        sid: sid || '',
        affiliate_code: affiliateCode || '',
        affiliate_id: affiliateId || '',
        purchase_type: 'product',
      },
      payment_intent_data: product.product_type !== 'subscription' ? {
        metadata: {
          product_slug: product.slug,
          product_id: product.id,
          sid: sid || '',
          affiliate_code: affiliateCode || '',
          affiliate_id: affiliateId || '',
          purchase_type: 'product',
        },
        // Enable saving the payment method for one-click upsells
        setup_future_usage: 'off_session',
      } : undefined,
    })

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'Failed to create checkout URL' }, { status: 500 })
    }

    return NextResponse.json({ url: checkoutSession.url, session_id: checkoutSession.id })
  } catch (err: any) {
    console.error('Product checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

