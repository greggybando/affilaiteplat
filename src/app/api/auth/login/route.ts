import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('email', email)
      .single()

    if (!affiliate || !await bcrypt.compare(password, affiliate.password_hash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = jwt.sign(
      { affiliateId: affiliate.id, email: affiliate.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production'
    const response = NextResponse.json({ 
      success: true, 
      token: token, // Include token for client-side backup
      affiliate: { id: affiliate.id, email: affiliate.email } 
    })
    
    // Set cookie with explicit options
    // In production (Vercel), always use secure: true because Vercel uses HTTPS
    // In development, use secure: false
    const secure = isProduction
    
    // Set cookie - ensure it works in production
    // Use sameSite: 'none' with secure: true for cross-site, or 'lax' for same-site
    // Since we're on the same domain, 'lax' should work
    response.cookies.set('affiliate_token', token, {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: false, // Allow JavaScript to read it
      secure: secure, // true in production, false in development
      sameSite: 'lax', // Allow cookie to be sent on same-site requests
      // Explicitly don't set domain to use default (current domain)
    })

    console.log('✅ Cookie set in response:', {
      hasToken: !!token,
      tokenLength: token.length,
      path: '/',
      maxAge: 60 * 60 * 24,
      httpOnly: false,
      secure: secure,
      sameSite: 'lax',
      isProduction,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
