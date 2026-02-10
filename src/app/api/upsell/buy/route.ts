// src/app/api/upsell/buy/route.ts
// One-click purchase using saved payment method from initial checkout.
// Customer clicks "Buy" on upsell shop, card charges instantly, no new checkout page.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { product_slug, checkout_session_id, sid } = body

    if (!product_slug || !checkout_session_id) {
      return NextResponse.json(
        { error: 'product_slug and checkout_session_id are required' },
        { status: 400 }
      )
    }

    // Get the original checkout session to retrieve payment method + customer
    const originalSession = await stripe.checkout.sessions.retrieve(checkout_session_id, {
      expand: ['payment_intent'],
    })

    if (!originalSession.customer || !originalSession.payment_intent) {
      return NextResponse.json(
        { error: 'Cannot process one-click buy - no saved payment info' },
        { status: 400 }
      )
    }

    const customerId = originalSession.customer as string
    const paymentIntent = originalSession.payment_intent as Stripe.PaymentIntent
    const paymentMethodId = paymentIntent.payment_method as string
    const customerEmail = originalSession.customer_details?.email || ''

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'No payment method saved from initial purchase' },
        { status: 400 }
      )
    }

    // Get the product
    const { data: product, error: productError } = await (supabaseAdmin as any)
      .from('products')
      .select('*')
      .eq('slug', product_slug)
      .eq('status', 'active')
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if already purchased
    const { data: existingPurchase } = await (supabaseAdmin as any)
      .from('purchases')
      .select('id')
      .eq('customer_email', customerEmail)
      .eq('product_slug', product_slug)
      .eq('status', 'completed')
      .single()

    if (existingPurchase) {
      return NextResponse.json({ error: 'Already purchased', already_owned: true }, { status: 409 })
    }

    // Look up attribution from the session
    let affiliateId = null
    let affiliateCode = null

    if (sid) {
      const { data: attrSession } = await (supabaseAdmin as any)
        .from('attribution_sessions')
        .select('affiliate_id, affiliate_code')
        .eq('sid', sid)
        .single()

      if (attrSession) {
        affiliateId = attrSession.affiliate_id
        affiliateCode = attrSession.affiliate_code
      }
    }

    // Charge the saved payment method
    const upsellPaymentIntent = await stripe.paymentIntents.create({
      amount: product.price_cents,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        product_slug: product.slug,
        product_id: product.id,
        sid: sid || '',
        affiliate_code: affiliateCode || '',
        affiliate_id: affiliateId || '',
        purchase_type: 'upsell',
        original_checkout_session: checkout_session_id,
      },
    })

    if (upsellPaymentIntent.status === 'succeeded') {
      // Record the purchase immediately (webhook will also handle this, but we want instant UI update)
      const { error: purchaseError } = await (supabaseAdmin as any)
        .from('purchases')
        .insert({
          customer_email: customerEmail,
          stripe_customer_id: customerId,
          product_id: product.id,
          product_slug: product.slug,
          amount_cents: product.price_cents,
          stripe_payment_intent_id: upsellPaymentIntent.id,
          payment_method_id: paymentMethodId,
          attribution_session_id: sid || null,
          affiliate_id: affiliateId,
          affiliate_code: affiliateCode,
          is_upsell: true,
          status: 'completed',
        })

      if (purchaseError) {
        console.error('Error recording upsell purchase:', purchaseError)
        // Payment succeeded but DB record failed - webhook will catch it
      }

      // Record conversion for affiliate (backward compatible)
      if (affiliateId) {
        const commissionCents = product.commission_fixed_cents > 0
          ? product.commission_fixed_cents
          : Math.round(product.price_cents * product.commission_percent / 100)

        await (supabaseAdmin as any)
          .from('conversions')
          .insert({
            affiliate_id: affiliateId,
            product_id: product.id,
            stripe_payment_intent_id: upsellPaymentIntent.id,
            stripe_customer_email: customerEmail,
            order_amount_cents: product.price_cents,
            commission_cents: commissionCents,
            status: 'pending',
            visitor_id: sid || null,
          })
          .catch(err => console.error('Error recording conversion:', err))
      }

      return NextResponse.json({
        success: true,
        product_slug: product.slug,
        amount_charged: product.price_cents,
        payment_intent_id: upsellPaymentIntent.id,
      })
    } else {
      return NextResponse.json(
        { error: 'Payment failed', status: upsellPaymentIntent.status },
        { status: 402 }
      )
    }
  } catch (err: any) {
    console.error('Upsell buy error:', err)

    // Handle card declined or authentication required
    if (err.code === 'authentication_required') {
      return NextResponse.json(
        { error: 'Card requires authentication - cannot process one-click', requires_action: true },
        { status: 402 }
      )
    }

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

