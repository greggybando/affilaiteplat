// src/app/api/attribution/redirect/route.ts
// Middleware redirects ?ref= requests here.
// This creates the attribution session server-side and redirects
// to the original page with ?sid= instead of ?ref=.
// Runs in Node.js runtime (not Edge), so full Supabase access.

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
  const dest = searchParams.get('dest') // destination path e.g. /p/charisma
  const productSlug = searchParams.get('product_slug')
  const entryType = searchParams.get('entry_type') || 'product'

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  if (!ref || !dest) {
    return NextResponse.redirect(new URL(dest || '/', baseUrl))
  }

  try {
    // Look up the affiliate
    const { data: link } = await (supabaseAdmin as any)
      .from('affiliate_links')
      .select('affiliate_id')
      .eq('tracking_code', ref)
      .single()

    // Get visitor info
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Create attribution session
    const sid = generateSid()

    await (supabaseAdmin as any)
      .from('attribution_sessions')
      .insert({
        sid,
        affiliate_id: link?.affiliate_id || null,
        affiliate_code: ref,
        entry_type: entryType,
        entry_product_slug: productSlug || null,
        ip_hash: hashValue(ip),
        user_agent_hash: hashValue(userAgent),
      })

    // Record click for backward compatibility
    if (link?.affiliate_id) {
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

    // Redirect to destination with sid
    const redirectUrl = new URL(dest, baseUrl)
    redirectUrl.searchParams.set('sid', sid)
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('Attribution redirect error:', err)
    // Fail gracefully - send them to the page without attribution
    return NextResponse.redirect(new URL(dest, baseUrl))
  }
}

