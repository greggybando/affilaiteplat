import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  return handleLogout(request)
}

export async function POST(request: NextRequest) {
  return handleLogout(request)
}

async function handleLogout(request: NextRequest) {
  // Get affiliate BEFORE clearing cookie (so we can identify them)
  const affiliate = await getCurrentAffiliate()
  
  // If user is a mentor, set availability to offline
  if (affiliate) {
    try {
      const { data: mentor } = await (supabaseAdmin as any)
        .from('mentors')
        .select('id, is_active')
        .eq('user_id', affiliate.id)
        .maybeSingle()
      
      // Only update if mentor exists and is active
      if (mentor && mentor.is_active) {
        await (supabaseAdmin as any)
          .from('mentors')
          .update({
            availability: 'offline',
            updated_at: new Date().toISOString()
          })
          .eq('id', mentor.id)
      }
    } catch (error) {
      // Don't fail logout if mentor update fails - just log it
      console.error('[Logout] Error setting mentor offline:', error)
    }
  }
  
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
