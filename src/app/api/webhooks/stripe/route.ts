import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  console.log('='.repeat(80))
  console.log('🔔 WEBHOOK RECEIVED - Starting webhook processing')
  console.log('='.repeat(80))
  
  // Read raw body as text (critical for signature verification)
  const body = await request.text()
  
  // Get signature header - Stripe sends it as 'stripe-signature'
  const sig = request.headers.get('stripe-signature')
  const contentType = request.headers.get('content-type')
  
  console.log('📋 Request details:', {
    'content-type': contentType,
    'stripe-signature': sig ? `${sig.substring(0, 20)}...` : 'MISSING',
    'body-length': body.length,
    'body-preview': body.substring(0, 100),
  })

  if (!sig) {
    console.error('❌ Missing stripe-signature header')
    console.error('   Available headers:', Object.fromEntries(request.headers.entries()))
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Get and trim webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not set in environment variables')
    console.error('   Secret length:', process.env.STRIPE_WEBHOOK_SECRET?.length || 0)
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  console.log('🔐 Webhook secret details:', {
    'secret-length': webhookSecret.length,
    'secret-prefix': webhookSecret.substring(0, 10),
    'secret-suffix': webhookSecret.substring(webhookSecret.length - 5),
  })

  let event: Stripe.Event

  try {
    console.log('🔍 Verifying webhook signature...')
    console.log('   Signature header:', sig.substring(0, 50) + '...')
    console.log('   Body length:', body.length)
    console.log('   Secret length:', webhookSecret.length)
    
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    
    console.log('✅ Webhook signature verified successfully')
    console.log('📦 Event details:', {
      type: event.type,
      id: event.id,
      created: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode,
    })
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:')
    console.error('   Error message:', err.message)
    console.error('   Error type:', err.type)
    console.error('   Error code:', err.code)
    console.error('   Signature received:', sig?.substring(0, 50) + '...')
    console.error('   Body length:', body.length)
    console.error('   Secret length:', webhookSecret.length)
    console.error('   Full error:', JSON.stringify(err, null, 2))
    return NextResponse.json({ 
      error: 'Invalid signature',
      details: err.message 
    }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    console.log('')
    console.log('💰 Processing checkout.session.completed event')
    console.log('-'.repeat(80))
    
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}
    let { affiliate_id, affiliate_link_id, click_id, visitor_id, product_id, affiliate_code } = metadata

    // Handle subscription checkout (affiliate subscribing to platform)
    if (session.mode === 'subscription') {
      console.log('💳 This is a subscription checkout (affiliate subscribing)')
      
      if (!affiliate_id) {
        console.log('⚠️  No affiliate_id in metadata - cannot update affiliate status')
        return NextResponse.json({ received: true, message: 'No affiliate_id, skipping status update' })
      }

      // Update affiliate status to 'active' and store subscription info
      console.log('🔄 Updating affiliate status to active...')
      const updateData: any = {
        status: 'active',
        subscription_started_at: new Date().toISOString(),
      }

      if (session.subscription) {
        updateData.stripe_subscription_id = session.subscription as string
      }

      if (session.customer) {
        updateData.stripe_customer_id = session.customer as string
      }

      const { data: updatedAffiliate, error: updateError } = await (supabaseAdmin
        .from('affiliates') as any)
        .update(updateData)
        .eq('id', affiliate_id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating affiliate status:', updateError)
        return NextResponse.json(
          { error: 'Failed to update affiliate status', details: updateError.message },
          { status: 500 }
        )
      }

      console.log('✅ Affiliate status updated to active')
      console.log('   Affiliate ID:', affiliate_id)
      console.log('   Subscription ID:', updateData.stripe_subscription_id || 'N/A')
      console.log('   Customer ID:', updateData.stripe_customer_id || 'N/A')
      console.log('')
      return NextResponse.json({ received: true, event_type: event.type })
    }

    // Handle product purchase checkout (customer buying product via affiliate)

    console.log('📋 Session details:', {
      session_id: session.id,
      payment_intent: session.payment_intent,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email,
      customer_name: session.customer_details?.name,
      payment_status: session.payment_status,
      mode: session.mode,
    })

    console.log('🏷️  Session metadata:', {
      affiliate_id: affiliate_id || '(not set)',
      affiliate_code: affiliate_code || '(not set)',
      affiliate_link_id: affiliate_link_id || '(not set)',
      click_id: click_id || '(not set)',
      visitor_id: visitor_id || '(not set)',
      product_id: product_id || '(not set)',
      all_metadata: metadata,
    })

    // If affiliate_id is missing but affiliate_code is present, look it up
    if (!affiliate_id && affiliate_code) {
      console.log('🔍 Looking up affiliate from code:', affiliate_code)
      const { data: link, error: linkError } = await supabaseAdmin
        .from('affiliate_links')
        .select('id, affiliate_id')
        .eq('tracking_code', affiliate_code)
        .maybeSingle()

      if (linkError) {
        console.error('❌ Error looking up affiliate link:', linkError)
      } else if (link) {
        const linkData = link as { id: string; affiliate_id: string }
        affiliate_id = linkData.affiliate_id
        affiliate_link_id = linkData.id
        console.log('✅ Found affiliate:', {
          affiliate_id,
          affiliate_link_id,
        })

        // If we have visitor_id, try to find the click record
        if (visitor_id && affiliate_link_id && !click_id) {
          console.log('🔍 Looking up click record for visitor:', visitor_id)
          const { data: click } = await supabaseAdmin
            .from('clicks')
            .select('id')
            .eq('affiliate_link_id', affiliate_link_id)
            .eq('visitor_id', visitor_id)
            .order('clicked_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (click) {
            click_id = (click as { id: string }).id
            console.log('✅ Found click record:', click_id)
          }
        }
      } else {
        console.warn('⚠️  No affiliate link found for code:', affiliate_code)
      }
    }

    if (!affiliate_id) {
      console.log('⚠️  No affiliate_id found - this is a direct purchase (not via affiliate)')
      console.log('   Skipping conversion record (only tracking affiliate conversions)')
      return NextResponse.json({ received: true, message: 'No affiliate_id, skipping conversion' })
    }

    if (!session.amount_total) {
      console.log('⚠️  No amount_total in session - skipping conversion record')
      return NextResponse.json({ received: true, message: 'No amount_total, skipping conversion' })
    }

    console.log('✅ Validation passed - proceeding with conversion recording')

           // Get commission rate from product
           let commissionPercent = 50 // default
           if (product_id) {
             console.log('Fetching product for commission rate:', product_id)
             const { data: product, error: productError } = await supabaseAdmin
               .from('products')
               .select('commission_percent')
               .eq('id', product_id)
               .maybeSingle()

             if (productError) {
               console.error('Error fetching product:', productError)
             } else if (product) {
               const productData = product as { commission_percent: number | null }
               commissionPercent = productData.commission_percent || 50
               console.log('Using commission percent from product:', commissionPercent)
             } else {
               console.log('Product not found, using default commission:', commissionPercent)
             }
           } else {
             console.log('No product_id in metadata, using default commission:', commissionPercent)
           }

           // Check for commission boost
           const { data: affiliateData } = await supabaseAdmin
             .from('affiliates')
             .select('commission_boost_percent, commission_boost_expires_at')
             .eq('id', affiliate_id)
             .maybeSingle()

           let finalCommissionPercent = commissionPercent
           if (affiliateData) {
             const boostData = affiliateData as any
             const now = new Date()
             const expiresAt = boostData.commission_boost_expires_at
               ? new Date(boostData.commission_boost_expires_at)
               : null

             if (
               boostData.commission_boost_percent > 0 &&
               expiresAt &&
               expiresAt > now
             ) {
               finalCommissionPercent = commissionPercent + boostData.commission_boost_percent
               console.log(
                 `🔥 Commission boost active: ${commissionPercent}% + ${boostData.commission_boost_percent}% = ${finalCommissionPercent}%`
               )
             }
           }

           const commissionAmount = Math.floor((session.amount_total * finalCommissionPercent) / 100)
    console.log('Calculated commission:', {
      orderAmount: session.amount_total,
      commissionPercent,
      commissionAmount,
    })

    const conversionInsertData = {
      affiliate_id,
      affiliate_link_id: affiliate_link_id || null,
      attributed_click_id: click_id || null,
      product_id: product_id || null,
      stripe_payment_intent_id: session.payment_intent as string,
      order_amount_cents: session.amount_total,
      commission_cents: commissionAmount,
      stripe_customer_email: session.customer_details?.email || null,
      visitor_id: visitor_id || null,
      status: 'pending' as const,
    }

    console.log('')
    console.log('💾 Inserting conversion into database...')
    console.log('📊 Conversion data:', JSON.stringify(conversionInsertData, null, 2))

    const { data: conversion, error: insertError } = await supabaseAdmin
      .from('conversions')
      .insert(conversionInsertData as any)
      .select()
      .single()

    if (insertError) {
      console.error('')
      console.error('❌ ERROR INSERTING CONVERSION:')
      console.error('   Message:', insertError.message)
      console.error('   Code:', insertError.code)
      console.error('   Details:', insertError.details)
      console.error('   Hint:', insertError.hint)
      console.error('   Attempted data:', JSON.stringify(conversionInsertData, null, 2))
      console.error('')
      return NextResponse.json(
        { error: 'Failed to record conversion', details: insertError.message },
        { status: 500 }
      )
    }

    const conversionResult = conversion as {
      id: string
      affiliate_id: string
      order_amount_cents: number
      commission_cents: number
      status: string
    }

           console.log('')
           console.log('✅ CONVERSION RECORDED SUCCESSFULLY!')
           console.log('   Conversion ID:', conversionResult.id)
           console.log('   Affiliate ID:', conversionResult.affiliate_id)
           console.log('   Order Amount:', `$${(conversionResult.order_amount_cents / 100).toFixed(2)}`)
           console.log('   Commission:', `$${(conversionResult.commission_cents / 100).toFixed(2)}`)
           console.log('   Status:', conversionResult.status)
           console.log('')

           // Update battle stats if affiliate is in an active battle for this product
           if (product_id) {
             try {
               // Get affiliate's pod
               const { data: podMember } = await supabaseAdmin
                 .from('pod_members')
                 .select('pod_id')
                 .eq('affiliate_id', affiliate_id)
                 .eq('status', 'accepted')
                 .maybeSingle()

               if (podMember) {
                 const podId = (podMember as any).pod_id

                 // Find active battles for this pod and product
                 const { data: activeBattles } = await supabaseAdmin
                   .from('pod_battles')
                   .select('id')
                   .eq('product_id', product_id)
                   .eq('status', 'active')
                   .or(`challenger_pod_id.eq.${podId},defender_pod_id.eq.${podId}`)

                 if (activeBattles && activeBattles.length > 0) {
                   for (const battle of activeBattles) {
                     const battleData = battle as any
                     
                     // Get current stats
                     const { data: stats } = await supabaseAdmin
                       .from('pod_battle_stats')
                       .select('*')
                       .eq('battle_id', battleData.id)
                       .eq('pod_id', podId)
                       .maybeSingle()

                     if (stats) {
                       const currentStats = stats as any
                       const newTotalSales = (currentStats.total_sales || 0) + session.amount_total
                       const newTotalConversions = (currentStats.total_conversions || 0) + 1
                       
                       // Get member count for sales per member
                       const { data: members } = await supabaseAdmin
                         .from('pod_members')
                         .select('id')
                         .eq('pod_id', podId)
                         .eq('status', 'accepted')
                       
                       const memberCount = (members || []).length || 1
                       const newSalesPerMember = newTotalSales / memberCount

                       await (supabaseAdmin.from('pod_battle_stats') as any)
                         .update({
                           total_sales: newTotalSales,
                           total_conversions: newTotalConversions,
                           sales_per_member: newSalesPerMember,
                           updated_at: new Date().toISOString(),
                         })
                         .eq('id', currentStats.id)
                       
                       console.log(`⚔️  Battle stats updated: Pod ${podId}, Battle ${battleData.id}, Sales: $${(newTotalSales / 100).toFixed(2)}, Conversions: ${newTotalConversions}`)
                     } else {
                       // Stats don't exist yet - create them
                       const { data: members } = await supabaseAdmin
                         .from('pod_members')
                         .select('id')
                         .eq('pod_id', podId)
                         .eq('status', 'accepted')
                       
                       const memberCount = (members || []).length || 1
                       const salesPerMember = session.amount_total / memberCount

                       await (supabaseAdmin.from('pod_battle_stats') as any).insert({
                         battle_id: battleData.id,
                         pod_id: podId,
                         total_sales: session.amount_total,
                         total_conversions: 1,
                         sales_per_member: salesPerMember,
                         updated_at: new Date().toISOString(),
                       })
                       
                       console.log(`⚔️  Battle stats created: Pod ${podId}, Battle ${battleData.id}`)
                     }
                   }
                 }
               }
             } catch (battleError: any) {
               console.warn('⚠️  Error updating battle stats (non-critical):', battleError.message)
             }
           }

    // Update affiliate stats if RPC function exists
    console.log('📈 Attempting to update affiliate stats...')
    try {
      const { error: statsError } = await (supabaseAdmin.rpc as any)('increment_affiliate_stats', {
        p_affiliate_id: affiliate_id,
        p_conversions: 1,
        p_commission: commissionAmount,
      })

      if (statsError) {
        console.warn('⚠️  Failed to update affiliate stats (RPC function may not exist):', statsError.message)
        console.warn('   This is not critical - conversion was still recorded')
      } else {
        console.log('✅ Affiliate stats updated successfully')
      }
    } catch (rpcError: any) {
      console.warn('⚠️  RPC function error (function may not exist):', rpcError.message)
      console.warn('   This is not critical - conversion was still recorded')
    }
    
    console.log('='.repeat(80))
    console.log('✅ WEBHOOK PROCESSING COMPLETE')
    console.log('='.repeat(80))
    console.log('')
  } else if (event.type === 'customer.subscription.deleted') {
    // Handle subscription deleted event (cancellation)
    console.log('')
    console.log('🗑️  Processing customer.subscription.deleted event')
    console.log('-'.repeat(80))
    
    const subscription = event.data.object as Stripe.Subscription
    const affiliate_id = subscription.metadata?.affiliate_id

    console.log('📋 Subscription details:', {
      subscription_id: subscription.id,
      customer: subscription.customer,
      status: subscription.status,
    })

    if (!affiliate_id) {
      // Try to find affiliate by subscription_id
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()

      if (affiliate) {
        const affiliateData = affiliate as any
        const { error: updateError } = await (supabaseAdmin
          .from('affiliates') as any)
          .update({ status: 'expired' })
          .eq('id', affiliateData.id)

        if (updateError) {
          console.error('❌ Error updating affiliate status:', updateError)
          return NextResponse.json(
            { error: 'Failed to update affiliate status', details: updateError.message },
            { status: 500 }
          )
        }

        console.log('✅ Affiliate status updated to expired')
        console.log('   Affiliate ID:', affiliateData.id)
        return NextResponse.json({ received: true, event_type: event.type })
      }

      console.log('⚠️  No affiliate_id in subscription metadata and could not find affiliate by subscription_id')
      return NextResponse.json({ received: true, message: 'No affiliate_id, skipping update' })
    }

    // Update affiliate status to expired
    const { error: updateError } = await (supabaseAdmin
      .from('affiliates') as any)
      .update({ status: 'expired' })
      .eq('id', affiliate_id)

    if (updateError) {
      console.error('❌ Error updating affiliate status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update affiliate status', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ Affiliate status updated to expired')
    console.log('   Affiliate ID:', affiliate_id)
    console.log('')
  } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    // Handle subscription created/updated events
    console.log('')
    console.log(`🔄 Processing ${event.type} event`)
    console.log('-'.repeat(80))
    
    const subscription = event.data.object as Stripe.Subscription
    let affiliate_id = subscription.metadata?.affiliate_id

    console.log('📋 Subscription details:', {
      subscription_id: subscription.id,
      customer: subscription.customer,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })

    if (!affiliate_id) {
      // Try to find affiliate by subscription_id
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()

      if (!affiliate) {
        console.log('⚠️  No affiliate_id in subscription metadata and could not find affiliate by subscription_id')
        return NextResponse.json({ received: true, message: 'No affiliate_id, skipping update' })
      }

      const affiliateData = affiliate as any
      affiliate_id = affiliateData.id
    }

    // Update affiliate with subscription info
    const updateData: any = {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
    }

    // Handle different subscription statuses
    if (subscription.status === 'active') {
      updateData.status = 'active'
      if (!subscription.metadata?.subscription_started_at) {
        updateData.subscription_started_at = new Date().toISOString()
      }
    } else if (subscription.status === 'canceled') {
      updateData.status = 'cancelled'
    } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      updateData.status = 'past_due'
    }

    const { error: updateError } = await (supabaseAdmin
      .from('affiliates') as any)
      .update(updateData)
      .eq('id', affiliate_id)

    if (updateError) {
      console.error('❌ Error updating affiliate subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to update affiliate subscription', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ Affiliate subscription updated')
    console.log('   Affiliate ID:', affiliate_id)
    console.log('   Subscription Status:', subscription.status)
    console.log('   New Affiliate Status:', updateData.status)
    console.log('')
  } else if (event.type === 'invoice.payment_failed') {
    // Handle payment failed event
    console.log('')
    console.log('💳 Processing invoice.payment_failed event')
    console.log('-'.repeat(80))
    
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId = invoice.subscription as string | null

    console.log('📋 Invoice details:', {
      invoice_id: invoice.id,
      customer: invoice.customer,
      subscription: subscriptionId,
      amount_due: invoice.amount_due,
    })

    if (!subscriptionId) {
      console.log('⚠️  No subscription_id in invoice - cannot update affiliate')
      return NextResponse.json({ received: true, message: 'No subscription_id, skipping update' })
    }

    // Find affiliate by subscription_id
    const { data: affiliate, error: findError } = await (supabaseAdmin
      .from('affiliates') as any)
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    if (findError || !affiliate) {
      console.log('⚠️  Could not find affiliate with subscription_id:', subscriptionId)
      return NextResponse.json({ received: true, message: 'Affiliate not found, skipping update' })
    }

    const affiliateData = affiliate as any

    // Update affiliate status to past_due
    const { error: updateError } = await (supabaseAdmin
      .from('affiliates') as any)
      .update({ status: 'past_due' })
      .eq('id', affiliateData.id)

    if (updateError) {
      console.error('❌ Error updating affiliate status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update affiliate status', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ Affiliate status updated to past_due')
    console.log('   Affiliate ID:', affiliateData.id)
    console.log('')
  } else {
    console.log('ℹ️  Event type not handled:', event.type)
    console.log('   Event ID:', event.id)
  }

  return NextResponse.json({ received: true, event_type: event.type })
}
