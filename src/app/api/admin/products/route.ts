// src/app/api/admin/products/route.ts
// Admin CRUD for products - auto-creates Stripe products/prices

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentAffiliate, isAdmin } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// GET - List all products (admin sees all, including drafts)
export async function GET(req: NextRequest) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate || !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // 'active', 'draft', 'archived', or null for all

  let query = (supabaseAdmin as any)
    .from('products')
    .select('*')
    .order('upsell_priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }

  return NextResponse.json({ products: data })
}

// POST - Create a new product
export async function POST(req: NextRequest) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate || !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    name,
    slug,
    description,
    price_cents,
    price_display,
    commission_percent = 30,
    commission_fixed_cents = 0,
    headline,
    subheadline,
    bullets = [],
    sales_body,
    short_description,
    thumbnail_url,
    delivery_url,
    delivery_type = 'redirect',
    upsell_priority = 0,
    cta_text = 'Get Instant Access',
    guarantee_text,
    product_type = 'one_time',
    status = 'draft',
    page_html,
  } = body

  // Validate required fields
  if (!name || !slug || !price_cents) {
    return NextResponse.json(
      { error: 'name, slug, and price_cents are required' },
      { status: 400 }
    )
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(slug)) {
    return NextResponse.json(
      { error: 'Slug must be lowercase letters, numbers, and hyphens only' },
      { status: 400 }
    )
  }

  // Check slug uniqueness
  const { data: existing } = await (supabaseAdmin as any)
    .from('products')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 })
  }

  try {
    // Create Stripe product and price
    const stripeProduct = await stripe.products.create({
      name,
      description: short_description || description || undefined,
      metadata: { slug },
    })

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: price_cents,
      currency: 'usd',
      ...(product_type === 'subscription'
        ? { recurring: { interval: 'month' } }
        : {}),
    })

    // Insert into database
    const { data: product, error } = await (supabaseAdmin as any)
      .from('products')
      .insert({
        name,
        slug,
        description,
        price_cents,
        price_display: price_display || `$${(price_cents / 100).toFixed(0)}`,
        commission_percent,
        commission_fixed_cents,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
        is_active: status === 'active',
        status,
        headline,
        subheadline,
        bullets,
        sales_body,
        short_description,
        thumbnail_url,
        delivery_url,
        delivery_type,
    upsell_priority,
    cta_text,
    guarantee_text,
    product_type,
    page_html,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating product:', error)
      // Clean up Stripe if DB insert failed
      await stripe.products.update(stripeProduct.id, { active: false })
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (err: any) {
    console.error('Error in product creation:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

