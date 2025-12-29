import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for authentication check
 * 
 * IMPORTANT: This runs in Edge Runtime, so we CANNOT use jsonwebtoken here.
 * We only check if the affiliate_token cookie exists. Actual JWT verification
 * happens in server components (getCurrentAffiliate) which run in Node.js.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/go/') ||
    pathname.startsWith('/resubscribe')
  ) {
    return NextResponse.next()
  }
  
  // Only check auth for portal and admin routes
  if (!pathname.startsWith('/portal') && !pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Check if affiliate_token cookie exists
  // Don't verify JWT here - that happens in server components (Node.js runtime)
  const cookieToken = request.cookies.get('affiliate_token')?.value
  
  if (!cookieToken) {
    // No cookie found, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Cookie exists, allow access
  // JWT verification will happen in the page component (getCurrentAffiliate)
  return NextResponse.next()
}

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
  // Use default Edge Runtime - no Node.js APIs needed here
}
