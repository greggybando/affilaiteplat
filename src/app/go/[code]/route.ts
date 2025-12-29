import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

// GET /go/[code] - Track click and redirect to landing page
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params

  try {
    // Find the affiliate link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('affiliate_links')
      .select(`
        id,
        affiliate_id,
        landing_page:landing_pages (
          id,
          slug,
          product:products (
            slug
          )
        )
      `)
      .eq('tracking_code', code)
      .single()

    if (linkError || !link) {
      // Invalid link, redirect to homepage
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Get or create visitor ID
    const cookieStore = cookies()
    let visitorId = cookieStore.get('vid')?.value
    if (!visitorId) {
      visitorId = nanoid(16)
    }

    // Record the click
    const linkData = link as { id: string; affiliate_id: string }
    const { error: clickError } = await supabaseAdmin
      .from('clicks')
      .insert({
        affiliate_link_id: linkData.id,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        user_agent: request.headers.get('user-agent') || null,
        referer: request.headers.get('referer') || null,
        visitor_id: visitorId,
      } as any)

    if (clickError) {
      console.error('Error recording click:', clickError)
      // Don't fail the redirect, just log the error
    }

    // Build redirect URL to landing page
    const linkWithPage = link as any
    const landingPage = linkWithPage.landing_page
    const productSlug = landingPage.product.slug
    const pageSlug = landingPage.slug
    const redirectUrl = new URL(`/p/${productSlug}/${pageSlug}`, request.url)

    // Create response with redirect
    const response = NextResponse.redirect(redirectUrl)

    // Set visitor cookie (30 days) and affiliate attribution cookie
    response.cookies.set('vid', visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    // Store affiliate attribution (for conversion tracking)
    response.cookies.set('aff', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days attribution window
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Click tracking error:', error)
    // On error, redirect to homepage
    return NextResponse.redirect(new URL('/', request.url))
  }
}
