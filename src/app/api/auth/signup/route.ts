import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, generateToken, generateTrackingCode } from '@/lib/auth'
import { strictRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 signups per minute per IP
    const { success, limit, remaining, reset } = await strictRateLimit(request)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again in a minute.' },
        { status: 429, headers: getRateLimitHeaders(limit, remaining, reset) }
      )
    }

    const body = await request.json()
    const { name, email, password, payout_method, paypal_email, referral_code, discount_code } = body

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (payout_method === 'paypal' && !paypal_email) {
      return NextResponse.json(
        { error: 'PayPal email is required for PayPal payouts' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingAffiliate } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingAffiliate) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Check discount code (case-insensitive)
    const validCodes = (process.env.FREE_ACCESS_CODES || '').split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
    const hasValidCode = discount_code && validCodes.includes(discount_code.trim().toLowerCase())
    
    // Hash password
    const passwordHash = await hashPassword(password)

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    // Create FirstPromoter affiliate account
    let fpPromoterId: string | null = null
    let fpRefId: string | null = null
    
    if (process.env.FIRSTPROMOTER_API_KEY) {
      try {
        // Split name into first and last name
        const nameParts = (name as string).trim().split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        console.log('📤 Creating FirstPromoter account:', {
          email: (email as string).toLowerCase(),
          firstName,
          lastName,
        })
        
        const createResponse = await fetch(
          'https://firstpromoter.com/api/v1/promoters/create.json',
          {
            method: 'POST',
            headers: {
              'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: (email as string).toLowerCase(),
              first_name: firstName,
              last_name: lastName,
            }),
          }
        )

        const createData = await createResponse.json()
        console.log('📥 FirstPromoter create response:', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          data: JSON.stringify(createData, null, 2),
        })

        if (createResponse.ok && createData.id) {
          fpPromoterId = createData.id.toString()
          fpRefId = createData.default_ref_id || createData.ref_id || null
          console.log(`✅ FirstPromoter account created: ${fpPromoterId}, ref_id: ${fpRefId}`)
        } else if (createData.error && createData.error.includes('already exists')) {
          // Account already exists, find it by email
          console.log('⚠️ Account already exists, fetching by email...')
          
          const findResponse = await fetch(
            `https://firstpromoter.com/api/v1/promoters/show.json?email=${encodeURIComponent((email as string).toLowerCase())}`,
            {
              method: 'GET',
              headers: {
                'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
                'Content-Type': 'application/json',
              },
            }
          )

          const findData = await findResponse.json()
          console.log('📥 FirstPromoter find by email response:', {
            status: findResponse.status,
            statusText: findResponse.statusText,
            data: JSON.stringify(findData, null, 2),
          })

          if (findResponse.ok && findData.id) {
            fpPromoterId = findData.id.toString()
            fpRefId = findData.default_ref_id || findData.ref_id || null
            console.log(`✅ Found existing FirstPromoter account: ${fpPromoterId}, ref_id: ${fpRefId}`)
          } else {
            console.error('❌ Failed to find existing FirstPromoter account:', findData)
          }
        } else {
          console.error('❌ FirstPromoter account creation failed:', {
            status: createResponse.status,
            error: createData.error || createData.message || 'Unknown error',
            fullResponse: JSON.stringify(createData, null, 2),
          })
          // Continue with signup even if FirstPromoter fails
        }
      } catch (fpError: any) {
        console.error('❌ Error creating/finding FirstPromoter account:', {
          error: fpError.message,
          stack: fpError.stack,
          name: fpError.name,
        })
        // Continue with signup even if FirstPromoter fails
      }
    }

    // Create affiliate record
    // If valid discount code, create with 'trial' status, otherwise 'pending_payment'
    const accountStatus = hasValidCode ? 'trial' : 'pending_payment'
    
    const { data: affiliate, error: insertError } = await supabaseAdmin
      .from('affiliates')
      .insert({
        name: name as string,
        email: (email as string).toLowerCase(),
        password_hash: passwordHash,
        payout_method: payout_method as string || null,
        paypal_email: payout_method === 'paypal' ? (paypal_email as string) : null,
        status: accountStatus,
        trial_ends_at: accountStatus === 'trial' ? trialEndsAt.toISOString() : null,
        fp_promoter_id: fpPromoterId,
        fp_ref_id: fpRefId,
      } as any)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating affiliate:', insertError)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    const affiliateData = affiliate as {
      id: string
      name: string
      email: string
      status: string
      trial_ends_at: string | null
    }

    // Handle referral code if provided
    if (referral_code) {
      const { data: referrerCode } = await (supabaseAdmin as any)
        .from('referral_codes')
        .select('affiliate_id')
        .eq('code', referral_code.toUpperCase())
        .eq('is_active', true)
        .single()

      if (referrerCode && (referrerCode as any).affiliate_id !== affiliateData.id) {
        // Create referral record
        await (supabaseAdmin as any)
          .from('subscription_referrals')
          .insert({
            referrer_id: (referrerCode as any).affiliate_id,
            referred_id: affiliateData.id,
            referral_code: referral_code.toUpperCase(),
            status: 'pending'
          })
      }
    }

    // If valid discount code, proceed with normal signup flow
    if (hasValidCode) {
      // Generate auth token
      const token = generateToken({
        affiliateId: affiliateData.id,
        email: affiliateData.email,
      })

      // Create response
      const response = NextResponse.json({
        success: true,
        affiliate: {
          id: affiliateData.id,
          name: affiliateData.name,
          email: affiliateData.email,
          status: affiliateData.status,
          trial_ends_at: affiliateData.trial_ends_at,
        },
        token: token,
      })
      
      // Set cookie
      const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production'
      const secure = isProduction
      
      response.cookies.set('affiliate_token', token, {
        path: '/',
        maxAge: 60 * 60 * 24,
        httpOnly: false,
        secure: secure,
        sameSite: 'lax',
      })
      
      return response
    }

    // No valid discount code - create Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.millionairelifedesign.com'
    const priceId = (process.env.STRIPE_AFFILIATE_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID)?.trim()
    
    if (!priceId) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    // Create Stripe checkout session
    const checkoutParams = new URLSearchParams({
      'customer_email': (email as string).toLowerCase(),
      'mode': 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `${baseUrl}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${baseUrl}/signup?cancelled=true`,
      'metadata[affiliate_id]': affiliateData.id,
      'metadata[signup_type]': 'platform_subscription',
      'subscription_data[metadata][affiliate_id]': affiliateData.id,
    })

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: checkoutParams.toString(),
    })

    const checkoutSession = await stripeResponse.json()

    if (!stripeResponse.ok || checkoutSession.error) {
      console.error('Stripe checkout error:', checkoutSession.error)
      return NextResponse.json(
        { error: checkoutSession.error?.message || 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout URL' },
        { status: 500 }
      )
    }

    // Return checkout URL - user will complete payment before account activation
    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      message: 'Please complete payment to activate your account',
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
