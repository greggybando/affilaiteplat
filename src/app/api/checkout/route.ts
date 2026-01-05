import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST(req: NextRequest) {
  const { productId, priceId, successUrl, cancelUrl } = await req.json()

  const cookieStore = cookies()
  const visitorId = cookieStore.get('visitor_id')?.value
  const affAttr = cookieStore.get('aff_attr')?.value

  const metadata: Record<string, string> = { product_id: productId }

  if (affAttr) {
    try {
      const attr = JSON.parse(affAttr)
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      if (attr.click_time > thirtyDaysAgo && visitorId) {
        metadata.affiliate_id = attr.affiliate_id
        metadata.affiliate_link_id = attr.link_id

        const { data: click } = await supabaseAdmin
          .from('clicks')
          .select('id')
          .eq('affiliate_link_id', attr.link_id)
          .eq('visitor_id', visitorId)
          .order('clicked_at', { ascending: false })
          .limit(1)
          .single()

        if (click) metadata.click_id = (click as any).id
      }
    } catch {}
  }

  if (visitorId) metadata.visitor_id = visitorId

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
    metadata,
  })

  return NextResponse.json({ sessionId: session.id, url: session.url })
}
