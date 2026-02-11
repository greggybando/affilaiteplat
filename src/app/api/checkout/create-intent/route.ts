import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { product_slug, email, fpr_tid } = await req.json()

    if (!product_slug) {
      return NextResponse.json({ error: 'product_slug is required' }, { status: 400 })
    }

    // Look up the product
    const { data: product, error: productError } = await (supabaseAdmin as any)
      .from('products')
      .select('*')
      .eq('slug', product_slug)
      .eq('status', 'active')
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Create PaymentIntent params
    const params = new URLSearchParams({
      'amount': product.price_cents.toString(),
      'currency': 'usd',
      'metadata[product_slug]': product_slug,
      'metadata[product_id]': product.id,
      'automatic_payment_methods[enabled]': 'true',
    })

    // Add customer if email provided (optional)
    if (email) {
      // Create or retrieve Stripe customer by email
      const customerSearch = await fetch(
        `https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          },
        }
      )
      const customerResult = await customerSearch.json()

      let customerId: string

      if (customerResult.data && customerResult.data.length > 0) {
        customerId = customerResult.data[0].id
      } else {
        const createCustomer = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            email: email,
          }).toString(),
        })
        const newCustomer = await createCustomer.json()
        if (newCustomer.error) {
          return NextResponse.json({ error: newCustomer.error.message }, { status: 500 })
        }
        customerId = newCustomer.id
      }

      params.append('customer', customerId)
      params.append('metadata[customer_email]', email)
    }

    // Add FirstPromoter tracking ID to metadata
    if (fpr_tid) {
      params.append('metadata[fpr_tid]', fpr_tid)
    }

    const piResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const paymentIntent = await piResponse.json()

    if (paymentIntent.error) {
      return NextResponse.json({ error: paymentIntent.error.message }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      product: {
        name: product.name,
        price_display: product.price_display,
        price_cents: product.price_cents,
      },
    })
  } catch (err: any) {
    console.error('Create intent error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

