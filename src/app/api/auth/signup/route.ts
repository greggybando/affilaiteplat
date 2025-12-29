import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, generateToken, generateTrackingCode } from '@/lib/auth'
import { createConnectAccount, createConnectOnboardingLink } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, payout_method, paypal_email } = body

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

    // Generate auth token
    const token = generateToken({
      affiliateId: affiliateData.id,
      email: affiliateData.email,
    })

    // Create response object (will be used for all return paths)
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
          `${appUrl}/portal/payout-setup`,
          `${appUrl}/portal`
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
          token: token, // Include token for localStorage
        })
      } catch (stripeError) {
        console.error('Error creating Stripe Connect account:', stripeError)
        // Still return success, they can set up Stripe later
        response = NextResponse.json({
          success: true,
          affiliate: {
            id: affiliateData.id,
            name: affiliateData.name,
            email: affiliateData.email,
            status: affiliateData.status,
            trial_ends_at: affiliateData.trial_ends_at,
          },
          token: token, // Include token for localStorage
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
    
    // Set cookie directly on response with explicit options
    // In production (Vercel), always use secure: true because Vercel uses HTTPS
    // In development, use secure: false
    const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production'
    const secure = isProduction
    
    response.cookies.set('affiliate_token', token, {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours in seconds
      httpOnly: false, // Allow JavaScript to read it
      secure: secure, // true in production, false in development
      sameSite: 'lax',
      // Don't set domain - let browser use default
    })
    
    console.log('✅ Auth cookie set on signup response:', {
      cookieName: 'affiliate_token',
      hasToken: !!token,
      tokenLength: token.length,
      cookieSet: true,
      options: {
        path: '/',
        maxAge: 60 * 60 * 24,
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
      },
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
