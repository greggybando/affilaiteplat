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
          const paymentIntent = event.data.object as Stripe.PaymentIntent
          const metadata = paymentIntent.metadata || {}
          const productSlug = metadata.product_slug
          const customerEmail = metadata.customer_email
          const productId = metadata.product_id
          const fprTid = metadata.fpr_tid

          // Get customer email from PaymentIntent or charge
          let email = customerEmail
          
          // Try receipt_email first
          if (!email && paymentIntent.receipt_email) {
            email = paymentIntent.receipt_email
          }
          
          // If still no email, fetch the charge to get billing details
          if (!email && paymentIntent.latest_charge) {
            try {
              const chargeResponse = await fetch(
                `https://api.stripe.com/v1/charges/${paymentIntent.latest_charge}`,
                {
                  headers: {
                    'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                  },
                }
              )
              const charge = await chargeResponse.json()
              if (charge && !charge.error) {
                email = charge.billing_details?.email || charge.receipt_email || null
              }
            } catch (chargeErr) {
              console.error('Error fetching charge for email:', chargeErr)
            }
          }

          // Handle embedded checkout product purchases
          if (productSlug && email) {
            // Check if purchase already exists
            const { data: existing } = await (supabaseAdmin as any)
              .from('purchases')
              .select('id')
              .eq('stripe_payment_intent_id', paymentIntent.id)
              .single()

            if (!existing) {
              // Record purchase from embedded checkout
              await (supabaseAdmin as any)
                .from('purchases')
                .insert({
                  product_id: productId || null,
                  product_slug: productSlug,
                  customer_email: email,
                  amount_cents: paymentIntent.amount,
                  stripe_payment_intent_id: paymentIntent.id,
                  status: 'completed',
                })

              console.log(`✅ Product purchase recorded: ${productSlug} for ${email}`)
            }

            // Call FirstPromoter API if tracking ID exists
            if (fprTid && email && process.env.FIRSTPROMOTER_API_KEY) {
              try {
                // Track signup
                await fetch('https://firstpromoter.com/api/v1/track/signup', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
                  },
                  body: new URLSearchParams({
                    email: email,
                    tid: fprTid,
                  }).toString(),
                })
                
                // Track sale
                await fetch('https://firstpromoter.com/api/v1/track/sale', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
                  },
                  body: new URLSearchParams({
                    email: email,
                    tid: fprTid,
                    amount: (paymentIntent.amount / 100).toString(), // Convert cents to dollars
                    currency: 'usd',
                  }).toString(),
                })
                
                console.log(`✅ FirstPromoter signup + sale tracked: ${email} with tid ${fprTid}`)
              } catch (fprErr) {
                console.error('FirstPromoter API error:', fprErr)
              }
            }
          } else if (metadata.purchase_type === 'upsell') {
            // Handle one-click upsell payments (these don't go through checkout.session)
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

            console.log(`✅ Refund processed for payment: ${paymentIntentId}`)
          }
          break
        }

        case 'customer.subscription.deleted': {
          // ===== EXISTING LOGIC (unchanged) =====
          const subscription = event.data.object as Stripe.Subscription
          const customerId = subscription.customer as string
          
          const customerResponse = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            },
          })
          
          const customer = await customerResponse.json()
          const customerEmail = customer.email
          
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
            
            const customerResponse = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
              },
            })
            
            const customer = await customerResponse.json()
            const customerEmail = customer.email
            
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

// ===== Handle product purchase from checkout =====
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
  } = metadata

  // Get the payment intent for the payment method
  let paymentMethodId = null
  let paymentIntentId = null

  if (session.payment_intent) {
    const piResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${session.payment_intent}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
    
    const pi = await piResponse.json()
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
}

// ===== Handle subscription checkout =====
async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  customerEmail: string | null | undefined
) {
  if (!customerEmail) return

  // Activate user subscription
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
}

// ===== Record product purchase from PaymentIntent (safety net for upsells) =====
async function recordProductPurchase(
  paymentIntent: Stripe.PaymentIntent,
  metadata: Record<string, string>
) {
  const {
    product_slug,
    product_id,
  } = metadata

  // Get customer email
  let customerEmail = ''
  if (paymentIntent.customer) {
    const customerResponse = await fetch(`https://api.stripe.com/v1/customers/${paymentIntent.customer}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })
    
    const customer = await customerResponse.json()
    customerEmail = customer.email || ''
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
        is_upsell: metadata.purchase_type === 'upsell',
        status: 'completed',
      },
      { onConflict: 'stripe_payment_intent_id' }
    )
}
