// src/app/go/[code]/route.ts
// UPDATED: Affiliate link redirect with server-side attribution
// When someone clicks an affiliate link like /go/ABC123,
// this creates an attribution session and redirects to the sales page with ?sid=xxx

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

function generateSid(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  const bytes = crypto.randomBytes(12)
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.millionairelifedesign.com'

  try {
    // Look up the affiliate link
    const { data: link, error } = await (supabaseAdmin as any)
      .from('affiliate_links')
      .select(`
        id,
        affiliate_id,
        tracking_code,
        landing_page_id,
        landing_pages (
          slug,
          product_id,
          products (
            slug,
            status
          )
        )
      `)
      .eq('tracking_code', code)
      .single()

    if (error || !link) {
      // Fallback: redirect to homepage
      return NextResponse.redirect(new URL('/', baseUrl))
    }

    // Get visitor info for fingerprinting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Determine the product slug and entry type
    const landingPage = (link as any).landing_pages
    const product = landingPage?.products
    const productSlug = product?.slug
    
    // Determine if this is a product or subscription link
    const entryType = productSlug ? 'product' : 'subscription'

    // Create attribution session
    const sid = generateSid()

    await (supabaseAdmin as any)
      .from('attribution_sessions')
      .insert({
        sid,
        affiliate_id: link.affiliate_id,
        affiliate_code: code,
        entry_type: entryType,
        entry_product_slug: productSlug || null,
        ip_hash: hashValue(ip),
        user_agent_hash: hashValue(userAgent),
      })

    // Record click (backward compatible with existing system)
    await (supabaseAdmin as any)
      .from('clicks')
      .insert({
        affiliate_link_id: link.id,
        ip_address: ip,
        user_agent: userAgent,
        visitor_id: sid,
      })

    // Redirect to the appropriate page with sid
    if (productSlug && product?.status === 'active') {
      // Product sales page
      return NextResponse.redirect(new URL(`/p/${productSlug}?sid=${sid}`, baseUrl))
    } else if (entryType === 'subscription') {
      // Subscription checkout
      return NextResponse.redirect(new URL(`/checkout?sid=${sid}`, baseUrl))
    } else {
      // Fallback to landing page slug
      const landingSlug = landingPage?.slug || '/'
      return NextResponse.redirect(new URL(`${landingSlug}?sid=${sid}`, baseUrl))
    }
  } catch (err: any) {
    console.error('Error in go redirect:', err)
    return NextResponse.redirect(new URL('/', baseUrl))
  }
}

