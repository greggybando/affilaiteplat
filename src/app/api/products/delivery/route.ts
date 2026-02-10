// src/app/api/products/delivery/route.ts
// Returns all purchased products for a customer with delivery URLs.
// Called by the thank-you page after purchase.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  try {
    // Get customer email from Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const email = session.customer_details?.email

    if (!email) {
      return NextResponse.json({ products: [], email: '' })
    }

    // Get all purchased products with delivery info
    const { data: purchases } = await (supabaseAdmin as any)
      .from('purchases')
      .select(`
        product_slug,
        product_id,
        products (
          name,
          delivery_url,
          delivery_type,
          thumbnail_url
        )
      `)
      .eq('customer_email', email)
      .eq('status', 'completed')

    const products = (purchases || []).map((p: any) => ({
      product_slug: p.product_slug,
      product_name: p.products?.name || p.product_slug,
      delivery_url: p.products?.delivery_url || null,
      delivery_type: p.products?.delivery_type || 'redirect',
      thumbnail_url: p.products?.thumbnail_url || null,
    }))

    return NextResponse.json({ products, email })
  } catch (err: any) {
    console.error('Error fetching delivery info:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

