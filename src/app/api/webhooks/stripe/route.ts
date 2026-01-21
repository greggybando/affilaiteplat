import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.deleted',
  'customer.subscription.updated',
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      console.log('❌ Missing signature or webhook secret');
      return new NextResponse('Webhook secret not found.', { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`🔔 Webhook received: ${event.type}`);
  } catch (err: any) {
    console.log(`❌ Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const customerEmail = session.customer_details?.email;
          
          if (customerEmail) {
            // Activate user subscription
            const { error } = await supabaseAdmin
              .from('affiliates')
              .update({ 
                status: 'active',
                subscription_started_at: new Date().toISOString()
              })
              .eq('email', customerEmail);
            
            if (error) {
              console.log(`❌ Error activating subscription for ${customerEmail}:`, error);
            } else {
              console.log(`✅ Subscription activated for ${customerEmail}`);
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          // Get customer email from Stripe
          const customer = await stripe.customers.retrieve(customerId);
          const customerEmail = (customer as Stripe.Customer).email;
          
          if (customerEmail) {
            // Get user info before updating
            const { data: affiliate } = await supabaseAdmin
              .from('affiliates')
              .select('id, name, email, subscription_started_at')
              .eq('email', customerEmail)
              .single();
            
            // Update user status to cancelled
            const { error: updateError } = await supabaseAdmin
              .from('affiliates')
              .update({ status: 'cancelled' })
              .eq('email', customerEmail);
            
            if (updateError) {
              console.log(`❌ Error cancelling subscription for ${customerEmail}:`, updateError);
            } else {
              console.log(`✅ Subscription cancelled for ${customerEmail}`);
            }
            
            // Record cancellation for tracking
            if (affiliate) {
              const { error: cancelError } = await supabaseAdmin
                .from('cancellations')
                .insert({
                  affiliate_id: affiliate.id,
                  email: affiliate.email,
                  name: affiliate.name,
                  canceled_at: new Date().toISOString(),
                  subscription_start_date: affiliate.subscription_started_at
                });
              
              if (cancelError) {
                console.log(`❌ Error recording cancellation:`, cancelError);
              } else {
                console.log(`✅ Cancellation recorded for ${customerEmail}`);
              }
            }
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          
          // Check if subscription was cancelled (status = 'canceled')
          if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
            const customerId = subscription.customer as string;
            const customer = await stripe.customers.retrieve(customerId);
            const customerEmail = (customer as Stripe.Customer).email;
            
            if (customerEmail && subscription.status === 'canceled') {
              // Same logic as deleted
              const { data: affiliate } = await supabaseAdmin
                .from('affiliates')
                .select('id, name, email, subscription_started_at')
                .eq('email', customerEmail)
                .single();
              
              await supabaseAdmin
                .from('affiliates')
                .update({ status: 'cancelled' })
                .eq('email', customerEmail);
              
              if (affiliate) {
                await supabaseAdmin
                  .from('cancellations')
                  .insert({
                    affiliate_id: affiliate.id,
                    email: affiliate.email,
                    name: affiliate.name,
                    canceled_at: new Date().toISOString(),
                    subscription_start_date: affiliate.subscription_started_at
                  });
              }
              
              console.log(`✅ Subscription updated to cancelled for ${customerEmail}`);
            }
          }
          break;
        }

        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error) {
      console.log(`❌ Webhook handler failed:`, error);
      return new NextResponse('Webhook handler failed.', { status: 400 });
    }
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
