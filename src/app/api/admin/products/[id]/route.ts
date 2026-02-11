// src/app/api/admin/products/[id]/route.ts
// Update and archive individual products

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentAffiliate, isAdmin } from '@/lib/auth'

// GET - Single product details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const affiliate = await getCurrentAffiliate()
  if (!affiliate || !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: product, error } = await (supabaseAdmin as any)
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
  const { data: current, error: fetchError } = await (supabaseAdmin as any)
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const currentProduct = current as any

  // If price changed, create new Stripe price (prices are immutable in Stripe)
  if (body.price_cents && body.price_cents !== currentProduct.price_cents && currentProduct.stripe_product_id) {
    try {
      const priceParams = new URLSearchParams({
        product: currentProduct.stripe_product_id,
        'unit_amount': body.price_cents.toString(),
        currency: 'usd',
        ...(currentProduct.product_type === 'subscription'
          ? { 'recurring[interval]': 'month' }
          : {}),
      })

      const priceResponse = await fetch('https://api.stripe.com/v1/prices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: priceParams.toString(),
      })

      const newPrice = await priceResponse.json()

      if (!priceResponse.ok || newPrice.error) {
        throw new Error(newPrice.error?.message || 'Failed to create Stripe price')
      }

      // Deactivate old price
      if (currentProduct.stripe_price_id) {
        const deactivateParams = new URLSearchParams({ active: 'false' })
        await fetch(`https://api.stripe.com/v1/prices/${currentProduct.stripe_price_id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: deactivateParams.toString(),
        })
      }

      body.stripe_price_id = newPrice.id
      body.price_display = body.price_display || `$${(body.price_cents / 100).toFixed(0)}`
    } catch (err: any) {
      console.error('Error updating Stripe price:', err)
      return NextResponse.json({ error: 'Failed to update price in Stripe' }, { status: 500 })
    }
  }

  // If name changed, update Stripe product
  if (body.name && body.name !== currentProduct.name && currentProduct.stripe_product_id) {
    try {
      const updateParams = new URLSearchParams({ name: body.name })
      await fetch(`https://api.stripe.com/v1/products/${currentProduct.stripe_product_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: updateParams.toString(),
      })
    } catch (err: any) {
      console.error('Error updating Stripe product name:', err)
    }
  }

  // Sync is_active with status for backward compatibility
  if (body.status) {
    body.is_active = body.status === 'active'
  }

  // Update in database
  const { data: product, error } = await (supabaseAdmin as any)
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

  const { data: product, error } = await (supabaseAdmin as any)
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
      const deactivateParams = new URLSearchParams({ active: 'false' })
      await fetch(`https://api.stripe.com/v1/products/${product.stripe_product_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: deactivateParams.toString(),
      })
    } catch (err: any) {
      console.error('Error deactivating Stripe product:', err)
    }
  }

  return NextResponse.json({ product, message: 'Product archived' })
}

