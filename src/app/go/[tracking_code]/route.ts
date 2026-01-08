import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

const MAX_CLICKS_PER_HOUR = 3

// GET /go/[tracking_code] - Track click and redirect to landing page
export async function GET(
  request: NextRequest,
  { params }: { params: { tracking_code: string } }
) {
  const { tracking_code } = params
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '0.0.0.0'
  const userAgent = request.headers.get('user-agent') || ''
  const referer = request.headers.get('referer') || ''

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
      .eq('tracking_code', tracking_code)
      .single()

    if (linkError || !link) {
      // Invalid link, redirect to homepage
      return NextResponse.redirect(new URL('/', request.url))
    }

    const linkData = link as any

    // Check blocklist
    const { data: blocked } = await (supabaseAdmin as any)
      .from('fraud_blocklist')
      .select('id')
      .eq('block_type', 'ip')
      .eq('block_value', ip)
      .limit(1)
    
    if (blocked?.length) {
      // Still redirect but don't record click
      return redirectToLandingPage(linkData)
    }

    // Check velocity (clicks per hour from same IP for same link)
    const windowStart = new Date()
    windowStart.setMinutes(0, 0, 0)
    
    const { data: velocity } = await (supabaseAdmin as any)
      .from('click_velocity')
      .select('click_count')
      .eq('ip_address', ip)
      .eq('affiliate_link_id', linkData.id)
      .eq('window_start', windowStart.toISOString())
      .single()

    const clickCount = velocity?.click_count || 0

    if (clickCount >= MAX_CLICKS_PER_HOUR) {
      // Flag as potential fraud but still redirect
      await (supabaseAdmin as any).from('fraud_flags').insert({
        affiliate_id: linkData.affiliate_id,
        flag_type: 'click_velocity',
        severity: 'medium',
        details: { ip, velocity_count: clickCount, tracking_code },
      })
      return redirectToLandingPage(linkData)
    }

    // Get or create visitor ID
    const cookieStore = cookies()
    let visitorId = cookieStore.get('visitor_id')?.value
    if (!visitorId) {
      visitorId = nanoid(16)
    }

    // Detect bot
    const botPatterns = ['bot', 'crawler', 'spider', 'curl', 'wget', 'python', 'java/', 'headless', 'phantom', 'selenium']
    const isBot = botPatterns.some(p => userAgent.toLowerCase().includes(p))

    // Detect device
    const ua = userAgent.toLowerCase()
    const deviceType = /mobile|android|iphone/.test(ua) ? 'mobile' : /ipad|tablet/.test(ua) ? 'tablet' : 'desktop'
    const browser = ua.includes('chrome') ? 'chrome' : ua.includes('safari') ? 'safari' : ua.includes('firefox') ? 'firefox' : 'other'
    const os = ua.includes('windows') ? 'windows' : ua.includes('mac') ? 'macos' : ua.includes('linux') ? 'linux' : ua.includes('android') ? 'android' : ua.includes('iphone') ? 'ios' : 'other'

    // Record click
    await (supabaseAdmin as any).from('clicks').insert({
      affiliate_link_id: linkData.id,
      ip_address: ip,
      user_agent: userAgent,
      referer,
      visitor_id: visitorId,
      is_bot: isBot,
      device_type: deviceType,
      browser,
      os,
    })

    // Update velocity
    await (supabaseAdmin as any).from('click_velocity').upsert({
      ip_address: ip,
      affiliate_link_id: linkData.id,
      window_start: windowStart.toISOString(),
      click_count: clickCount + 1,
      last_click_at: new Date().toISOString(),
    }, { onConflict: 'ip_address,affiliate_link_id,window_start' })

    // Build redirect URL to landing page
    const landingPage = linkData.landing_page
    const productSlug = landingPage?.product?.slug || 'default'
    const pageSlug = landingPage?.slug || 'default'
    const redirectUrl = new URL(`/p/${productSlug}/${pageSlug}`, request.url)

    // Create response with redirect
    const response = NextResponse.redirect(redirectUrl)

    // Set visitor cookie (30 days) and affiliate attribution cookie
    response.cookies.set('visitor_id', visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    // Store affiliate attribution (for conversion tracking)
    response.cookies.set('aff', tracking_code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days attribution window
      path: '/',
    })

    // Store detailed attribution in aff_attr cookie
    response.cookies.set('aff_attr', JSON.stringify({
      affiliate_id: linkData.affiliate_id,
      link_id: linkData.id,
      click_time: Date.now(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Click tracking error:', error)
    // On error, redirect to homepage
    return NextResponse.redirect(new URL('/', request.url))
  }
}

function redirectToLandingPage(link: any): NextResponse {
  const productSlug = link.landing_pages?.products?.slug || link.landing_page?.product?.slug || 'default'
  const pageSlug = link.landing_pages?.slug || link.landing_page?.slug || 'default'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://affiliate-platform-three.vercel.app'
  return NextResponse.redirect(new URL(`/p/${productSlug}/${pageSlug}`, appUrl))
}


