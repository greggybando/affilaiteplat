// src/app/api/products/public/route.ts
// Public endpoint - returns active products for sales pages and upsell shop
// No auth required

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const exclude = searchParams.get('exclude') // comma-separated slugs to exclude (for upsell shop)

  if (slug) {
    // Get single product by slug (for sales page)
    const { data: product, error } = await (supabaseAdmin as any)
      .from('products')
      .select('id, name, slug, headline, subheadline, bullets, sales_body, short_description, thumbnail_url, price_cents, price_display, cta_text, guarantee_text, product_type, status')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  }

  // Get all active products (for upsell shop)
  let query = (supabaseAdmin as any)
    .from('products')
    .select('id, name, slug, short_description, thumbnail_url, price_cents, price_display, cta_text, upsell_priority, product_type')
    .eq('status', 'active')
    .order('upsell_priority', { ascending: true })

  const { data: products, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }

  // Filter out excluded slugs if provided
  let filtered = products || []
  if (exclude) {
    const excludeSlugs = exclude.split(',').map(s => s.trim())
    filtered = filtered.filter((p: any) => !excludeSlugs.includes(p.slug))
  }

  return NextResponse.json({ products: filtered })
}

