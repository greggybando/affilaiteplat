import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  const cookieStore = cookies()
  const affCode = cookieStore.get('aff')?.value || ''
  const visitorId = cookieStore.get('vid')?.value || ''
  const productSlug = cookieStore.get('product')?.value || ''

  // Look up affiliate information
  let affiliateId = ''
  let affiliateLinkId = ''
  let clickId = ''
  let productId = ''

  if (affCode) {
    // Look up affiliate link
    const { data: link } = await supabaseAdmin
      .from('affiliate_links')
      .select('id, affiliate_id')
      .eq('tracking_code', affCode)
      .maybeSingle()

    if (link) {
      const linkData = link as { id: string; affiliate_id: string }
      affiliateId = linkData.affiliate_id
      affiliateLinkId = linkData.id

      // Look up click record
      if (visitorId && affiliateLinkId) {
        const { data: click } = await supabaseAdmin
          .from('clicks')
          .select('id')
          .eq('affiliate_link_id', affiliateLinkId)
          .eq('visitor_id', visitorId)
          .order('clicked_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (click) {
          clickId = (click as { id: string }).id
        }
      }
    }
  }

  // Look up product
  if (productSlug) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('slug', productSlug)
      .eq('is_active', true)
      .maybeSingle()

    if (product) {
      productId = (product as { id: string }).id
    }
  }

  // Fallback to default product if none found
  if (!productId) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (product) {
      productId = (product as { id: string }).id
    }
  }

  const successUrl = 'https://affiliate-platform-three.vercel.app/checkout/success'
  const cancelUrl = 'https://affiliate-platform-three.vercel.app'

  // Build metadata - only include non-empty values
  const metadata: Record<string, string> = {}
  if (affiliateId) metadata['affiliate_id'] = affiliateId
  if (affiliateLinkId) metadata['affiliate_link_id'] = affiliateLinkId
  if (clickId) metadata['click_id'] = clickId
  if (visitorId) metadata['visitor_id'] = visitorId
  if (productId) metadata['product_id'] = productId

  // Build URLSearchParams with metadata
  const params = new URLSearchParams({
    'payment_method_types[]': 'card',
    'line_items[0][price]': process.env.STRIPE_AFFILIATE_PRICE_ID!.trim(),
    'line_items[0][quantity]': '1',
    'mode': 'payment',
    'success_url': successUrl,
    'cancel_url': cancelUrl,
  })

  // Add metadata fields
  Object.entries(metadata).forEach(([key, value]) => {
    params.append(`metadata[${key}]`, value)
  })

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const session = await response.json()
  
  if (!response.ok || session.error) {
    console.error('Stripe API error:', session)
    return NextResponse.json({ 
      error: session.error?.message || 'Failed to create checkout session',
      details: session
    }, { status: response.status || 400 })
  }

  if (!session.url) {
    console.error('No URL in Stripe response:', session)
    return NextResponse.json({ 
      error: 'No checkout URL received from Stripe',
      details: session
    }, { status: 500 })
  }

  console.log('✅ Checkout session created:', session.id, session.url)
  return NextResponse.json({ url: session.url })
}
