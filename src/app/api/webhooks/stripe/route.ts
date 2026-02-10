// src/app/api/webhooks/stripe/route.ts
// UPDATED: Handles both subscription events AND product purchase events
// with server-side attribution tracking

import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.deleted',
  'customer.subscription.updated',
  'payment_intent.succeeded',  // NEW: for one-click upsells
  'charge.refunded',           // NEW: for refund handling
])

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    if (!sig || !webhookSecret) {
      console.log('❌ Missing signature or webhook secret')
      return new NextResponse('Webhook secret not found.', { status: 400 })
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    console.log(`🔔 Webhook received: ${event.type}`)
  } catch (err: any) {
    console.log(`❌ Webhook signature verification failed: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const customerEmail = session.customer_details?.email
          const metadata = session.metadata || {}

          // Check if this is a PRODUCT purchase or a SUBSCRIPTION
          if (metadata.purchase_type === 'product') {
            // ===== PRODUCT PURCHASE =====
            await handleProductPurchase(session, customerEmail, metadata)
          } else {
            // ===== SUBSCRIPTION (existing logic) =====
            await handleSubscriptionCheckout(session, customerEmail)
          }
          break
        }

        case 'payment_intent.succeeded': {
          // Handle one-click upsell payments (these don't go through checkout.session)
          const paymentIntent = event.data.object as Stripe.PaymentIntent
          const metadata = paymentIntent.metadata || {}

          if (metadata.purchase_type === 'upsell') {
            // Upsell was already recorded in the /api/upsell/buy route
            // This is a safety net - check if purchase exists, if not, create it
            const { data: existing } = await (supabaseAdmin as any)
              .from('purchases')
              .select('id')
              .eq('stripe_payment_intent_id', paymentIntent.id)
              .single()

            if (!existing) {
              console.log(`⚠️ Upsell payment ${paymentIntent.id} not found in DB, recording now`)
              await recordProductPurchase(paymentIntent, metadata)
            }
          }
          break
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge
          const paymentIntentId = charge.payment_intent as string

          if (paymentIntentId) {
            // Mark purchase as refunded
            await (supabaseAdmin as any)
              .from('purchases')
              .update({ status: 'refunded', refunded_at: new Date().toISOString() })
              .eq('stripe_payment_intent_id', paymentIntentId)

            // Mark conversion as refunded
            await (supabaseAdmin as any)
              .from('conversions')
              .update({ status: 'refunded' })
              .eq('stripe_payment_intent_id', paymentIntentId)

            console.log(`✅ Refund processed for payment: ${paymentIntentId}`)
          }
          break
        }

        case 'customer.subscription.deleted': {
          // ===== EXISTING LOGIC (unchanged) =====
          const subscription = event.data.object as Stripe.Subscription
          const customerId = subscription.customer as string
          const customer = await stripe.customers.retrieve(customerId)
          const customerEmail = (customer as Stripe.Customer).email

          if (customerEmail) {
            const { data: affiliate } = await (supabaseAdmin as any)
              .from('affiliates')
              .select('id, name, email, subscription_started_at')
              .eq('email', customerEmail)
              .single()

            await (supabaseAdmin as any)
              .from('affiliates')
              .update({ status: 'cancelled' })
              .eq('email', customerEmail)

            if (affiliate) {
              await (supabaseAdmin as any)
                .from('cancellations')
                .insert({
                  affiliate_id: affiliate.id,
                  email: affiliate.email,
                  name: affiliate.name,
                  canceled_at: new Date().toISOString(),
                  subscription_start_date: affiliate.subscription_started_at,
                })
            }
            console.log(`✅ Subscription cancelled for ${customerEmail}`)
          }
          break
        }

        case 'customer.subscription.updated': {
          // ===== EXISTING LOGIC (unchanged) =====
          const subscription = event.data.object as Stripe.Subscription

          if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
            const customerId = subscription.customer as string
            const customer = await stripe.customers.retrieve(customerId)
            const customerEmail = (customer as Stripe.Customer).email

            if (customerEmail && subscription.status === 'canceled') {
              const { data: affiliate } = await (supabaseAdmin as any)
                .from('affiliates')
                .select('id, name, email, subscription_started_at')
                .eq('email', customerEmail)
                .single()

              await (supabaseAdmin as any)
                .from('affiliates')
                .update({ status: 'cancelled' })
                .eq('email', customerEmail)

              if (affiliate) {
                await (supabaseAdmin as any)
                  .from('cancellations')
                  .insert({
                    affiliate_id: affiliate.id,
                    email: affiliate.email,
                    name: affiliate.name,
                    canceled_at: new Date().toISOString(),
                    subscription_start_date: affiliate.subscription_started_at,
                  })
              }

              console.log(`✅ Subscription updated to cancelled for ${customerEmail}`)
            }
          }
          break
        }

        default:
          throw new Error('Unhandled relevant event!')
      }
    } catch (error) {
      console.log(`❌ Webhook handler failed:`, error)
      return new NextResponse('Webhook handler failed.', { status: 400 })
    }
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 })
}

// ===== NEW: Handle product purchase from checkout =====
async function handleProductPurchase(
  session: Stripe.Checkout.Session,
  customerEmail: string | null | undefined,
  metadata: Record<string, string>
) {
  if (!customerEmail) {
    console.log('❌ No customer email in product checkout')
    return
  }

  const {
    product_slug,
    product_id,
    sid,
    affiliate_code,
    affiliate_id,
  } = metadata

  // Get the payment intent for the payment method
  let paymentMethodId = null
  let paymentIntentId = null

  if (session.payment_intent) {
    const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string)
    paymentMethodId = pi.payment_method as string
    paymentIntentId = pi.id
  }

  // Record the purchase
  const { error: purchaseError } = await (supabaseAdmin as any)
    .from('purchases')
    .upsert(
      {
        customer_email: customerEmail,
        stripe_customer_id: session.customer as string,
        product_id: product_id || null,
        product_slug: product_slug || '',
        amount_cents: session.amount_total || 0,
        stripe_payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: session.id,
        payment_method_id: paymentMethodId,
        attribution_session_id: sid || null,
        affiliate_id: affiliate_id || null,
        affiliate_code: affiliate_code || null,
        is_upsell: false,
        status: 'completed',
      },
      { onConflict: 'stripe_payment_intent_id' }
    )

  if (purchaseError) {
    console.error('❌ Error recording purchase:', purchaseError)
  } else {
    console.log(`✅ Product purchase recorded: ${product_slug} by ${customerEmail}`)
  }

  // Create/update permanent customer attribution
  if (affiliate_id && sid) {
    const { data: existing } = await (supabaseAdmin as any)
      .from('customer_attributions')
      .select('id')
      .eq('email', customerEmail)
      .single()

    if (!existing) {
      // First time customer - create attribution
      const attrData: any = {
        email: customerEmail,
        first_touch_product: product_slug,
        first_session_id: sid,
      }

      // Set product_ref or sub_ref based on session entry_type
      const { data: attrSession } = await (supabaseAdmin as any)
        .from('attribution_sessions')
        .select('entry_type')
        .eq('sid', sid)
        .single()

      if (attrSession?.entry_type === 'subscription') {
        attrData.sub_ref_affiliate_id = affiliate_id
        attrData.sub_ref_code = affiliate_code
      } else {
        attrData.product_ref_affiliate_id = affiliate_id
        attrData.product_ref_code = affiliate_code
      }

      await (supabaseAdmin as any).from('customer_attributions').insert(attrData)
      console.log(`✅ Customer attribution created: ${customerEmail} → ${affiliate_code}`)
    }
  }

  // Record conversion for affiliate (backward compatible with existing system)
  if (affiliate_id && product_id) {
    const { data: product } = await (supabaseAdmin as any)
      .from('products')
      .select('commission_percent, commission_fixed_cents, price_cents')
      .eq('id', product_id)
      .single()

    if (product) {
      const commissionCents = product.commission_fixed_cents > 0
        ? product.commission_fixed_cents
        : Math.round((session.amount_total || product.price_cents) * product.commission_percent / 100)

      await (supabaseAdmin as any)
        .from('conversions')
        .upsert(
          {
            affiliate_id,
            product_id,
            stripe_payment_intent_id: paymentIntentId || session.id,
            stripe_customer_email: customerEmail,
            order_amount_cents: session.amount_total || 0,
            commission_cents: commissionCents,
            status: 'pending',
            visitor_id: sid || null,
          },
          { onConflict: 'stripe_payment_intent_id' }
        )

      console.log(`✅ Affiliate conversion recorded: ${affiliate_code} earns ${commissionCents} cents`)
    }
  }
}

// ===== UPDATED: Handle subscription checkout with attribution =====
async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  customerEmail: string | null | undefined
) {
  if (!customerEmail) return

  const metadata = session.metadata || {}
  const sid = metadata.sid
  const affiliate_code = metadata.affiliate_code
  // referring_affiliate_id = the affiliate who SENT this customer (not the customer themselves)
  const affiliate_id = metadata.referring_affiliate_id

  // Activate user subscription (existing logic)
  const { error } = await (supabaseAdmin as any)
    .from('affiliates')
    .update({
      status: 'active',
      subscription_started_at: new Date().toISOString(),
    })
    .eq('email', customerEmail)

  if (error) {
    console.log(`❌ Error activating subscription for ${customerEmail}:`, error)
  } else {
    console.log(`✅ Subscription activated for ${customerEmail}`)
  }

  // If this subscription came through an affiliate link, credit them
  if (sid && affiliate_id) {
    // Verify this was a subscription entry (not a product funnel upsell)
    const { data: attrSession } = await (supabaseAdmin as any)
      .from('attribution_sessions')
      .select('entry_type')
      .eq('sid', sid)
      .single()

    if (attrSession?.entry_type === 'subscription') {
      // Create/update customer attribution with sub_ref
      const { data: existing } = await (supabaseAdmin as any)
        .from('customer_attributions')
        .select('id, sub_ref_affiliate_id')
        .eq('email', customerEmail)
        .single()

      if (!existing) {
        await (supabaseAdmin as any).from('customer_attributions').insert({
          email: customerEmail,
          sub_ref_affiliate_id: affiliate_id,
          sub_ref_code: affiliate_code,
          first_session_id: sid,
        })
      } else if (!existing.sub_ref_affiliate_id) {
        // Customer exists but doesn't have sub_ref yet (came through product first)
        await (supabaseAdmin as any)
          .from('customer_attributions')
          .update({
            sub_ref_affiliate_id: affiliate_id,
            sub_ref_code: affiliate_code,
            updated_at: new Date().toISOString(),
          })
          .eq('email', customerEmail)
      }

      // Record conversion for the affiliate
      // Use the subscription price from the session
      const subscriptionAmount = session.amount_total || 4000 // fallback to $40

      // Look up commission rate - use a default for subscriptions or check products table
      const commissionPercent = 30 // default subscription commission
      const commissionCents = Math.round(subscriptionAmount * commissionPercent / 100)

      await (supabaseAdmin as any)
        .from('conversions')
        .upsert(
          {
            affiliate_id,
            stripe_payment_intent_id: session.subscription as string || session.id,
            stripe_customer_email: customerEmail,
            order_amount_cents: subscriptionAmount,
            commission_cents: commissionCents,
            status: 'pending',
            visitor_id: sid,
          },
          { onConflict: 'stripe_payment_intent_id' }
        )

      console.log(`✅ Subscription affiliate conversion recorded: ${affiliate_code} earns ${commissionCents} cents`)
    }
  }
}

// ===== NEW: Record product purchase from PaymentIntent (safety net for upsells) =====
async function recordProductPurchase(
  paymentIntent: Stripe.PaymentIntent,
  metadata: Record<string, string>
) {
  const {
    product_slug,
    product_id,
    sid,
    affiliate_code,
    affiliate_id,
  } = metadata

  // Get customer email
  let customerEmail = ''
  if (paymentIntent.customer) {
    const customer = await stripe.customers.retrieve(paymentIntent.customer as string)
    customerEmail = (customer as Stripe.Customer).email || ''
  }

  await (supabaseAdmin as any)
    .from('purchases')
    .upsert(
      {
        customer_email: customerEmail,
        stripe_customer_id: paymentIntent.customer as string,
        product_id: product_id || null,
        product_slug: product_slug || '',
        amount_cents: paymentIntent.amount,
        stripe_payment_intent_id: paymentIntent.id,
        payment_method_id: paymentIntent.payment_method as string,
        attribution_session_id: sid || null,
        affiliate_id: affiliate_id || null,
        affiliate_code: affiliate_code || null,
        is_upsell: metadata.purchase_type === 'upsell',
        status: 'completed',
      },
      { onConflict: 'stripe_payment_intent_id' }
    )
}
