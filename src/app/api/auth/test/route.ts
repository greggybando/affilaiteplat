import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentAffiliate } from '@/lib/auth'

// Test endpoint to check if cookie is being read correctly
export async function GET() {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  
  const affiliateToken = cookieStore.get('affiliate_token')?.value
  
  console.log('🧪 Test endpoint - Cookie check:', {
    totalCookies: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    affiliateTokenFound: !!affiliateToken,
    affiliateTokenLength: affiliateToken?.length || 0,
  })

  const affiliate = await getCurrentAffiliate()

  return NextResponse.json({
    cookies: {
      total: allCookies.length,
      names: allCookies.map(c => c.name),
      affiliateTokenPresent: !!affiliateToken,
      affiliateTokenLength: affiliateToken?.length || 0,
    },
    affiliate: affiliate ? {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
    } : null,
    authenticated: !!affiliate,
  })
}




