import { NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'

export async function GET() {
  // Create response and clear cookie on it
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
  
  // Clear cookie - MUST match the exact settings used when setting the cookie
  // Use secure: true in production (Vercel uses HTTPS)
  const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production'
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: false, // Must match login/signup setting
    secure: isProduction, // Must match login/signup setting
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  })
  
  return response
}
