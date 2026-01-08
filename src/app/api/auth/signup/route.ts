import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, generateToken, generateTrackingCode } from '@/lib/auth'
import { createConnectAccount, createConnectOnboardingLink } from '@/lib/stripe'
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
    const { name, email, password, payout_method, paypal_email, referral_code } = body

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

    // Hash password
    const passwordHash = await hashPassword(password)

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    // Create affiliate record
    const { data: affiliate, error: insertError } = await supabaseAdmin
      .from('affiliates')
      .insert({
        name: name as string,
        email: (email as string).toLowerCase(),
        password_hash: passwordHash,
        payout_method: payout_method as string || null,
        paypal_email: payout_method === 'paypal' ? (paypal_email as string) : null,
        status: 'trial' as const,
        trial_ends_at: trialEndsAt.toISOString(),
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

    // Generate auth token
    const token = generateToken({
      affiliateId: affiliateData.id,
      email: affiliateData.email,
    })

    // Create response object
    let response: NextResponse

    // If Stripe payout method, create Connect account and return onboarding URL
    if (payout_method === 'stripe') {
      try {
        const connectAccount = await createConnectAccount(email, affiliateData.id)

        // Update affiliate with Stripe account ID
        await (supabaseAdmin
          .from('affiliates') as any)
          .update({ stripe_account_id: connectAccount.id })
          .eq('id', affiliateData.id)

        // Generate onboarding link
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const onboardingLink = await createConnectOnboardingLink(
          connectAccount.id,
          `${appUrl}/affiliate/payout-setup`,
          `${appUrl}/onboarding`
        )

        response = NextResponse.json({
          success: true,
          affiliate: {
            id: affiliateData.id,
            name: affiliateData.name,
            email: affiliateData.email,
            status: affiliateData.status,
            trial_ends_at: affiliateData.trial_ends_at,
          },
          stripeOnboardingUrl: onboardingLink.url,
          token: token,
        })
      } catch (stripeError) {
        console.error('Error creating Stripe Connect account:', stripeError)
        response = NextResponse.json({
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
      }
    } else {
      response = NextResponse.json({
        success: true,
        affiliate: {
          id: affiliateData.id,
          name: affiliateData.name,
          email: affiliateData.email,
          status: affiliateData.status,
          trial_ends_at: affiliateData.trial_ends_at,
        },
      })
    }
    
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
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
