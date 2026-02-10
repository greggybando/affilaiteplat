// src/app/api/products/purchased/route.ts
// Returns which products a customer has already purchased.
// Used by the upsell shop to hide already-owned products.

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
      return NextResponse.json({ purchased_slugs: [] })
    }

    // Get all purchased product slugs for this customer
    const { data: purchases } = await (supabaseAdmin as any)
      .from('purchases')
      .select('product_slug')
      .eq('customer_email', email)
      .eq('status', 'completed')

    const purchasedSlugs = purchases?.map(p => p.product_slug) || []

    return NextResponse.json({ purchased_slugs: purchasedSlugs, email })
  } catch (err: any) {
    console.error('Error fetching purchased products:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

