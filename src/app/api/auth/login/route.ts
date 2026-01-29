import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { strictRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 attempts per minute per IP
    const { success, limit, remaining, reset } = await strictRateLimit(request)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        { status: 429, headers: getRateLimitHeaders(limit, remaining, reset) }
      )
    }

    const { email, password } = await request.json()

    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('email', email)
      .single()

    if (!affiliate || !await bcrypt.compare(password, affiliate.password_hash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if user is banned
    if ((affiliate as any).banned === true) {
      return NextResponse.json({ 
        error: 'Your account has been banned. Please contact support if you believe this is an error.' 
      }, { status: 403 })
    }

    const token = jwt.sign(
      { affiliateId: affiliate.id, email: affiliate.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    // Determine redirect path based on onboarding status
    const onboardingCompleted = (affiliate as any).onboarding_completed
    const redirectTo = onboardingCompleted ? '/dashboard' : '/onboarding'

    const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production'
    const response = NextResponse.json({ 
      success: true, 
      token: token,
      affiliate: { id: affiliate.id, email: affiliate.email },
      redirectTo: redirectTo
    })
    
    const secure = isProduction
    
    response.cookies.set('affiliate_token', token, {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: false,
      secure: secure,
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
