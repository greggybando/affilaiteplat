// src/app/subscribe/route.ts
// Handles affiliate subscription links: /subscribe?ref=GRANT123
// Creates attribution session with entry_type='subscription'
// Then redirects to the checkout page with sid

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ref = searchParams.get('ref')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.millionairelifedesign.com'

  if (!ref) {
    // No affiliate ref, just go to checkout
    return NextResponse.redirect(new URL('/checkout', baseUrl))
  }

  try {
    // Look up affiliate
    const { data: link } = await (supabaseAdmin as any)
      .from('affiliate_links')
      .select('affiliate_id')
      .eq('tracking_code', ref)
      .single()

    // Get visitor info
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Create attribution session with entry_type = 'subscription'
    const sid = generateSid()

    await (supabaseAdmin as any)
      .from('attribution_sessions')
      .insert({
        sid,
        affiliate_id: link?.affiliate_id || null,
        affiliate_code: ref,
        entry_type: 'subscription',  // <-- This is the key difference
        entry_product_slug: null,
        ip_hash: hashValue(ip),
        user_agent_hash: hashValue(userAgent),
      })

    // Record click
    if (link) {
      await (supabaseAdmin as any)
        .from('clicks')
        .insert({
          affiliate_link_id: null,
          ip_address: ip,
          user_agent: userAgent,
          visitor_id: sid,
        })
        .catch(() => {})
    }

    // Redirect to checkout with sid
    return NextResponse.redirect(new URL(`/checkout?sid=${sid}`, baseUrl))
  } catch (err) {
    console.error('Subscribe redirect error:', err)
    return NextResponse.redirect(new URL('/checkout', baseUrl))
  }
}

