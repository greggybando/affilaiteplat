// src/app/go/[code]/route.ts
// Affiliate link redirect

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

    // Get visitor info
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Determine the product slug
    const landingPage = (link as any).landing_pages
    const product = landingPage?.products
    const productSlug = product?.slug

    // Record click
    await (supabaseAdmin as any)
      .from('clicks')
      .insert({
        affiliate_link_id: link.id,
        ip_address: ip,
        user_agent: userAgent,
      })
      .catch(() => {})

    // Redirect to the appropriate page
    if (productSlug && product?.status === 'active') {
      // Product sales page
      return NextResponse.redirect(new URL(`/p/${productSlug}`, baseUrl))
    } else {
      // Fallback to landing page slug or subscription checkout
      const landingSlug = landingPage?.slug || '/checkout'
      return NextResponse.redirect(new URL(landingSlug, baseUrl))
    }
  } catch (err: any) {
    console.error('Error in go redirect:', err)
    return NextResponse.redirect(new URL('/', baseUrl))
  }
}

