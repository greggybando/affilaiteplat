// src/app/api/attribution/create-session/route.ts
// Creates a server-side attribution session when someone clicks an affiliate link.
// Returns the sid to pass through all URLs in the funnel.

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ref, product_slug, entry_type = 'product' } = body

    if (!ref) {
      return NextResponse.json({ error: 'ref is required' }, { status: 400 })
    }

    // Look up the affiliate by their code
    const { data: link } = await (supabaseAdmin as any)
      .from('affiliate_links')
      .select('affiliate_id, tracking_code')
      .eq('tracking_code', ref)
      .single()

    // Also check if ref matches an affiliate_code directly
    let affiliateId = link?.affiliate_id
    let affiliateCode = ref

    if (!affiliateId) {
      // Try looking up by affiliate code/email or other identifier
      // For now, we still create the session even if affiliate not found
      // This prevents losing the click data
      console.warn(`No affiliate found for ref: ${ref}`)
    }

    // Get visitor fingerprint
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const sid = generateSid()

    const { data: session, error } = await (supabaseAdmin as any)
      .from('attribution_sessions')
      .insert({
        sid,
        affiliate_id: affiliateId || null,
        affiliate_code: affiliateCode,
        entry_type,
        entry_product_slug: product_slug || null,
        ip_hash: hashValue(ip),
        user_agent_hash: hashValue(userAgent),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating attribution session:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Also record the click in the existing clicks table for backward compatibility
    if (link) {
      await (supabaseAdmin as any)
        .from('clicks')
        .insert({
          affiliate_link_id: link.affiliate_id ? undefined : null,
          ip_address: ip,
          user_agent: userAgent,
          visitor_id: sid,
        })
        .catch((err: any) => console.error('Error recording click:', err))
    }

    return NextResponse.json({ sid, session_id: sid })
  } catch (err: any) {
    console.error('Attribution session error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

