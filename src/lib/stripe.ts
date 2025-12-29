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

// Create Stripe Connect Express account for affiliate payouts
export async function createConnectAccount(email: string, affiliateId: string) {
  const response = await fetch('https://api.stripe.com/v1/accounts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'type': 'express',
      'email': email,
      'metadata[affiliate_id]': affiliateId,
      'capabilities[transfers][requested]': 'true',
    }).toString()
  })
  
  const account = await response.json()
  
  if (!response.ok || account.error) {
    console.error('Stripe Connect account creation error:', account.error)
    throw new Error(account.error?.message || 'Failed to create Connect account')
  }
  
  return account
}

// Generate onboarding link for Connect account
export async function createConnectOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  const response = await fetch('https://api.stripe.com/v1/account_links', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'account': accountId,
      'refresh_url': refreshUrl,
      'return_url': returnUrl,
      'type': 'account_onboarding',
    }).toString()
  })
  
  const link = await response.json()
  
  if (!response.ok || link.error) {
    console.error('Stripe onboarding link creation error:', link.error)
    throw new Error(link.error?.message || 'Failed to create onboarding link')
  }
  
  return link
}

// Transfer funds to affiliate's Connect account
export async function transferToAffiliate(
  amount: number, // in cents
  accountId: string,
  description: string
) {
  const response = await fetch('https://api.stripe.com/v1/transfers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'amount': amount.toString(),
      'currency': 'usd',
      'destination': accountId,
      'description': description,
    }).toString()
  })
  
  const transfer = await response.json()
  
  if (!response.ok || transfer.error) {
    console.error('Stripe transfer error:', transfer.error)
    throw new Error(transfer.error?.message || 'Failed to create transfer')
  }
  
  return transfer
}

// Calculate commission
export function calculateCommission(
  orderAmountCents: number,
  commissionPercent: number,
  commissionFixedCents: number = 0
): number {
  if (commissionFixedCents > 0) {
    return commissionFixedCents
  }
  return Math.round(orderAmountCents * (commissionPercent / 100))
}
