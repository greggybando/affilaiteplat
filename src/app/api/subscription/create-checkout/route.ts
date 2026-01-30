import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { createAffiliateSubscription } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const plan = body.plan || 'monthly'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://millionairelifedesign.com'
    
    const priceId = (plan === 'yearly'
      ? process.env.STRIPE_YEARLY_PRICE_ID
      : process.env.STRIPE_MONTHLY_PRICE_ID)?.trim()

    if (!priceId) {
      console.error('Missing price ID for plan:', plan)
      return NextResponse.json({ error: 'Subscription pricing not configured' }, { status: 500 })
    }

    // Determine redirect URLs based on current status
    const isResubscribing = affiliate.status === 'expired' || affiliate.status === 'cancelled' || affiliate.status === 'past_due'
    const successUrl = isResubscribing ? `${appUrl}/dashboard` : `${appUrl}/dashboard?subscribed=true`
    const cancelUrl = isResubscribing ? `${appUrl}/resubscribe` : `${appUrl}/dashboard`

    console.log('Creating checkout session:', {
      plan,
      priceId: priceId.substring(0, 20) + '...',
      successUrl,
      cancelUrl,
      isResubscribing,
    })

    const session = await createAffiliateSubscription(
      affiliate.id,
      affiliate.email,
      successUrl,
      cancelUrl,
      priceId
    )

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error.message)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
