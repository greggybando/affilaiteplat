import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate, getAuthCookie, verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Link generation request received')
    
    // Get landing_page_id from request body first (before auth check)
    const body = await request.json()
    const { landing_page_id, affiliate_id } = body
    console.log('📄 Request body:', { landing_page_id, affiliate_id_provided: !!affiliate_id })
    
    // Debug: Check all cookies
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    console.log('🍪 All cookies received:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length || 0 })))
    
    // Check for token in cookie or Authorization header
    let token = getAuthCookie()
    const authHeader = request.headers.get('authorization')
    if (!token && authHeader) {
      token = authHeader.replace('Bearer ', '')
      console.log('🎫 Token from Authorization header:', {
        found: !!token,
        length: token?.length || 0,
      })
    } else {
      console.log('🎫 Token from cookie:', {
        found: !!token,
        length: token?.length || 0,
        preview: token ? `${token.substring(0, 20)}...` : 'none',
      })
    }
    
    // Try to get affiliate from cookie
    let affiliate = await getCurrentAffiliate()
    
    // If no affiliate from cookie but affiliate_id provided in body, verify it
    if (!affiliate && affiliate_id) {
      console.log('⚠️  No cookie auth, but affiliate_id provided in body - verifying...')
      const { data: affiliateData } = await supabaseAdmin
        .from('affiliates')
        .select('*')
        .eq('id', affiliate_id)
        .maybeSingle()
      
      if (affiliateData) {
        console.log('✅ Verified affiliate_id from request body')
        affiliate = affiliateData as any
      } else {
        console.error('❌ Invalid affiliate_id provided in body')
      }
    }
    
    console.log('👤 Affiliate:', affiliate ? { id: affiliate.id, email: affiliate.email, name: affiliate.name } : 'not found')
    
    if (!affiliate) {
      console.error('❌ Unauthorized - no affiliate found')
      console.error('   This could mean:')
      console.error('   1. No affiliate_token cookie was sent')
      console.error('   2. Token is invalid or expired')
      console.error('   3. JWT_SECRET mismatch')
      console.error('   4. Affiliate not found in database')
      console.error('   5. No affiliate_id provided in request body')
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    if (!landing_page_id) {
      console.error('❌ Missing landing_page_id')
      return NextResponse.json(
        { error: 'landing_page_id is required' },
        { status: 400 }
      )
    }

    // Check if landing page exists
    const { data: landingPage, error: pageError } = await supabaseAdmin
      .from('landing_pages')
      .select('id, slug, product_id, product:products(slug)')
      .eq('id', landing_page_id)
      .maybeSingle()

    if (pageError) {
      console.error('Error fetching landing page:', pageError)
      return NextResponse.json(
        { error: 'Failed to fetch landing page' },
        { status: 500 }
      )
    }

    if (!landingPage) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      )
    }

    // Check if link already exists for this affiliate + landing_page combination
    console.log('🔍 Checking for existing link...')
    const { data: existingLink, error: checkError } = await supabaseAdmin
      .from('affiliate_links')
      .select('id, tracking_code')
      .eq('affiliate_id', affiliate.id)
      .eq('landing_page_id', landing_page_id)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Error checking existing link:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing links', details: checkError.message },
        { status: 500 }
      )
    }

    // If link exists, return it
    if (existingLink) {
      console.log('✅ Existing link found:', existingLink)
      const linkData = existingLink as { id: string; tracking_code: string }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://millionairelifedesign.com'
      const productSlug = (landingPage as any).product?.slug || 'adhd-course'
      const pageSlug = (landingPage as any).slug || 'main'
      const fullUrl = `${appUrl}/go/${linkData.tracking_code}`
      
      console.log('🔗 Returning existing link URL:', fullUrl)
      return NextResponse.json({
        success: true,
        link: {
          id: linkData.id,
          tracking_code: linkData.tracking_code,
          url: fullUrl,
          landing_page: {
            id: landing_page_id,
            slug: pageSlug,
            product_slug: productSlug,
          },
        },
      })
    }

    console.log('📝 No existing link found, creating new one...')

    // Generate unique tracking code
    let trackingCode: string
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      trackingCode = nanoid(8)
      
      // Check if code already exists
      const { data: existing } = await supabaseAdmin
        .from('affiliate_links')
        .select('id')
        .eq('tracking_code', trackingCode)
        .maybeSingle()

      if (!existing) {
        isUnique = true
      } else {
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique tracking code' },
        { status: 500 }
      )
    }

    // Create new affiliate link
    const { data: newLink, error: insertError } = await supabaseAdmin
      .from('affiliate_links')
      .insert({
        affiliate_id: affiliate.id,
        landing_page_id: landing_page_id,
        tracking_code: trackingCode!,
      } as any)
      .select('id, tracking_code')
      .single()

    if (insertError) {
      console.error('Error creating affiliate link:', insertError)
      return NextResponse.json(
        { 
          error: 'Failed to create affiliate link',
          details: insertError.message 
        },
        { status: 500 }
      )
    }

    const linkData = newLink as { id: string; tracking_code: string }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://millionairelifedesign.com'
    const productSlug = (landingPage as any).product?.slug || 'adhd-course'
    const pageSlug = (landingPage as any).slug || 'main'
    const fullUrl = `${appUrl}/go/${linkData.tracking_code}`

    console.log('✅ New link created successfully:', {
      id: linkData.id,
      tracking_code: linkData.tracking_code,
      url: fullUrl,
    })

    return NextResponse.json({
      success: true,
      link: {
        id: linkData.id,
        tracking_code: linkData.tracking_code,
        url: fullUrl,
        landing_page: {
          id: landing_page_id,
          slug: pageSlug,
          product_slug: productSlug,
        },
      },
    })
  } catch (error: any) {
    console.error('Link generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
