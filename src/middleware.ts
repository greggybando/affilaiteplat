// src/middleware.ts
// UPDATED: Intercepts ?ref= on product/subscribe routes and redirects through
// the attribution API route for server-side session creation.
// Runs in Edge Runtime - no Node.js APIs, no fetch-to-self.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // =============================================
  // ATTRIBUTION REDIRECT: Intercept ?ref= on product and subscribe pages
  // Redirect through /api/attribution/redirect which creates the session
  // and sends them back with ?sid= instead of ?ref=
  // =============================================
  const ref = searchParams.get('ref')

  if (ref && (pathname.startsWith('/p/') || pathname === '/checkout')) {
    const productSlug = pathname.startsWith('/p/') ? pathname.split('/p/')[1]?.split('/')[0] : null
    const entryType = pathname.startsWith('/p/') ? 'product' : 'subscription'

    // Redirect to attribution API route which runs in Node.js and can access Supabase
    const redirectUrl = new URL('/api/attribution/redirect', request.url)
    redirectUrl.searchParams.set('ref', ref)
    redirectUrl.searchParams.set('dest', pathname)
    if (productSlug) redirectUrl.searchParams.set('product_slug', productSlug)
    redirectUrl.searchParams.set('entry_type', entryType)

    return NextResponse.redirect(redirectUrl)
  }

  // Note: /subscribe?ref= is handled by the /subscribe route.ts directly
  // (it already creates attribution and redirects to /checkout?sid=)

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
    pathname.startsWith('/resubscribe')
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
    // Attribution routes (need middleware for ?ref= interception)
    '/p/:path*',
    '/checkout',
  ],
}
