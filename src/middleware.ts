// src/middleware.ts
// Handles authentication and public route access

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // =============================================
  // PUBLIC ROUTES: Allow without auth
  // =============================================
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/go/') ||
    pathname.startsWith('/subscribe') ||
    pathname.startsWith('/upsell') ||
    pathname.startsWith('/resubscribe') ||
    pathname.startsWith('/test') ||
    pathname.startsWith('/adhd') ||
    pathname.startsWith('/charisma') ||
    pathname.startsWith('/disrespect')
  ) {
    return NextResponse.next()
  }

  // =============================================
  // PROTECTED ROUTES: Check for auth cookie
  // =============================================
  const protectedRoutes = [
    '/dashboard',
    '/onboarding',
    '/settings',
    '/affiliate',
    '/mindset',
    '/dreamjob',
    '/community',
    '/courses',
  ]

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))

  if (!isProtected) {
    return NextResponse.next()
  }

  // Check if affiliate_token cookie exists
  // Don't verify JWT here - that happens in server components (Node.js runtime)
  const cookieToken = request.cookies.get('affiliate_token')?.value

  if (!cookieToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Auth-protected routes
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/settings/:path*',
    '/affiliate/:path*',
    '/mindset/:path*',
    '/dreamjob/:path*',
    '/community/:path*',
    '/courses/:path*',
  ],
}
