import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

// Create a checkout session for affiliate subscription
export async function createAffiliateSubscription(
  affiliateId: string,
  email: string,
  successUrl: string,
  cancelUrl: string,
  priceId?: string
) {
  const finalPriceId = (priceId || process.env.STRIPE_AFFILIATE_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID)?.trim()

  if (!finalPriceId) {
    throw new Error('No Stripe price ID configured. Please set STRIPE_MONTHLY_PRICE_ID or STRIPE_AFFILIATE_PRICE_ID')
  }

  console.log('Creating Stripe checkout session with direct API call:', {
    priceId: finalPriceId.substring(0, 20) + '...',
    email,
    mode: 'subscription',
  })

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'customer_email': email,
      'mode': 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': finalPriceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'metadata[affiliate_id]': affiliateId,
      'subscription_data[metadata][affiliate_id]': affiliateId,
    }).toString()
  })

  const session = await response.json()
  
  if (!response.ok || session.error) {
    console.error('Stripe API error:', {
      status: response.status,
      error: session.error,
      fullResponse: session,
    })
    throw new Error(session.error?.message || 'Failed to create checkout session')
  }

  if (!session.url) {
    console.error('No URL in Stripe response:', {
      sessionId: session.id,
      session: JSON.stringify(session, null, 2),
    })
    throw new Error('No checkout URL received from Stripe')
  }

  // Validate URL format
  if (typeof session.url !== 'string' || !session.url.startsWith('http')) {
    console.error('Invalid URL format in Stripe response:', {
      url: session.url,
      urlType: typeof session.url,
      session: JSON.stringify(session, null, 2),
    })
    throw new Error('Invalid checkout URL format received from Stripe')
  }

  console.log('✅ Stripe checkout session created:', {
    id: session.id,
    url: session.url,
    urlLength: session.url.length,
  })
  
  return session
}

