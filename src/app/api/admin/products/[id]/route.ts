// src/app/api/admin/products/[id]/route.ts
// Update and archive individual products

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentAffiliate, isAdmin } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// GET - Single product details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate || !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ product })
}

// PATCH - Update product
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate || !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Get current product
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // If price changed, create new Stripe price (prices are immutable in Stripe)
  if (body.price_cents && body.price_cents !== current.price_cents && current.stripe_product_id) {
    try {
      const newPrice = await stripe.prices.create({
        product: current.stripe_product_id,
        unit_amount: body.price_cents,
        currency: 'usd',
        ...(current.product_type === 'subscription'
          ? { recurring: { interval: 'month' } }
          : {}),
      })

      // Deactivate old price
      if (current.stripe_price_id) {
        await stripe.prices.update(current.stripe_price_id, { active: false })
      }

      body.stripe_price_id = newPrice.id
      body.price_display = body.price_display || `$${(body.price_cents / 100).toFixed(0)}`
    } catch (err: any) {
      console.error('Error updating Stripe price:', err)
      return NextResponse.json({ error: 'Failed to update price in Stripe' }, { status: 500 })
    }
  }

  // If name changed, update Stripe product
  if (body.name && body.name !== current.name && current.stripe_product_id) {
    try {
      await stripe.products.update(current.stripe_product_id, { name: body.name })
    } catch (err: any) {
      console.error('Error updating Stripe product name:', err)
    }
  }

  // Sync is_active with status for backward compatibility
  if (body.status) {
    body.is_active = body.status === 'active'
  }

  // Update in database
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }

  return NextResponse.json({ product })
}

// DELETE - Archive product (never truly delete - preserves purchase history)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate || !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update({
      status: 'archived',
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('Error archiving product:', error)
    return NextResponse.json({ error: 'Failed to archive product' }, { status: 500 })
  }

  // Deactivate in Stripe
  if (product.stripe_product_id) {
    try {
      await stripe.products.update(product.stripe_product_id, { active: false })
    } catch (err: any) {
      console.error('Error deactivating Stripe product:', err)
    }
  }

  return NextResponse.json({ product, message: 'Product archived' })
}

