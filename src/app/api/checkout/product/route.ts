// src/app/api/checkout/product/route.ts
// Creates a Stripe checkout session for a product purchase

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { product_slug, fpr_tid } = body
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.millionairelifedesign.com'

    if (!product_slug) {
      return NextResponse.json({ error: 'product_slug is required' }, { status: 400 })
    }

    // Get product
    const { data: product, error: productError } = await (supabaseAdmin as any)
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

    // Build success URL - redirect to upsell shop after purchase
    const successUrl = `${baseUrl}/upsell/shop?purchased=${product_slug}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/p/${product_slug}`

    // Create Stripe checkout session
    const sessionParams = new URLSearchParams({
      mode: product.product_type === 'subscription' ? 'subscription' : 'payment',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': product.stripe_price_id,
      'line_items[0][quantity]': '1',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'metadata[product_slug]': product.slug,
      'metadata[product_id]': product.id,
      'metadata[purchase_type]': 'product',
    })

    // Add FirstPromoter tracking ID as client_reference_id if present
    if (fpr_tid) {
      sessionParams.append('client_reference_id', fpr_tid)
    }

    // Add payment_intent_data for one-time payments (not subscriptions)
    if (product.product_type !== 'subscription') {
      sessionParams.append('payment_intent_data[metadata][product_slug]', product.slug)
      sessionParams.append('payment_intent_data[metadata][product_id]', product.id)
      sessionParams.append('payment_intent_data[metadata][purchase_type]', 'product')
      sessionParams.append('payment_intent_data[setup_future_usage]', 'off_session')
    }

    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionParams.toString(),
    })

    const checkoutSession = await sessionResponse.json()

    if (!sessionResponse.ok || checkoutSession.error) {
      console.error('Stripe checkout session creation error:', checkoutSession.error)
      return NextResponse.json(
        { error: checkoutSession.error?.message || 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'Failed to create checkout URL' }, { status: 500 })
    }

    return NextResponse.json({ url: checkoutSession.url, session_id: checkoutSession.id })
  } catch (err: any) {
    console.error('Product checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

