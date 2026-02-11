// src/app/subscribe/route.ts
// Handles affiliate subscription links: /subscribe?ref=GRANT123
// Redirects to the checkout page

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.millionairelifedesign.com'
  return NextResponse.redirect(new URL('/checkout', baseUrl))
}

