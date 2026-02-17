import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { formatDistanceToNow, differenceInDays, format } from 'date-fns'
import { SubscriptionPaywall } from './components/SubscriptionPaywall'
import { StatsCards } from './components/StatsCards'
import { FirstPromoterProductList } from './components/FirstPromoterProductList'
import { VideoBanner } from './components/VideoBanner'

async function getFirstPromoterData(affiliateId: string, fpPromoterId: string | null, affiliate: any) {
  // Fetch everything from FirstPromoter API in one call
  // Returns stats and campaigns/products
  const baseStats = {
    affiliate_id: affiliateId,
    email: affiliate.email,
    name: affiliate.name,
    subscription_status: affiliate.status,
    trial_ends_at: affiliate.trial_ends_at || '',
    total_links: 0,
    total_clicks: 0,
    total_conversions: 0,
    pending_cents: 0,
    approved_cents: 0,
    locked_cents: 0,
    paid_cents: 0,
  }

  const baseResult = {
    stats: baseStats,
    campaigns: [],
  }

  if (!process.env.FIRSTPROMOTER_API_KEY || !fpPromoterId) {
    console.warn('FirstPromoter API key or promoter ID not configured, returning empty data')
    return baseResult
  }

  try {
    // FirstPromoter API endpoint - get promoter data (stats + campaigns)
    const response = await fetch(
      `https://firstpromoter.com/api/v1/promoters/show?id=${encodeURIComponent(fpPromoterId)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return baseResult
      }
      
      const errorText = await response.text()
      console.error('FirstPromoter API error:', response.status, errorText)
      return baseResult
    }

    const data = await response.json()

    // Extract campaigns/offers from FirstPromoter response
    // Adjust field names based on FirstPromoter's actual API response structure
    const campaigns = data.campaigns || data.offers || data.links || []
    
    // Map stats
    const stats = {
      ...baseStats,
      total_clicks: data.clicks || data.total_clicks || data.visits || 0,
      total_conversions: data.conversions || data.total_conversions || data.sales || 0,
      pending_cents: Math.round((data.pending || data.pending_amount || 0) * 100),
      approved_cents: Math.round((data.approved || data.approved_amount || data.available || 0) * 100),
      paid_cents: Math.round((data.paid || data.paid_amount || data.total_earned || data.total_paid || 0) * 100),
    }

    return {
      stats,
      campaigns,
    }
  } catch (error: any) {
    console.error('Error fetching FirstPromoter data:', error)
    return baseResult
  }
}

export default async function PortalPage() {
  // Server-side auth check - trust the server
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  // Check subscription status
  const isExpired = affiliate.status === 'expired'
  const isTrial = affiliate.status === 'trial'
  const trialDaysLeft = isTrial
    ? differenceInDays(new Date(affiliate.trial_ends_at), new Date())
    : 0

  // If expired, show paywall
  if (isExpired) {
    const fpData = await getFirstPromoterData(affiliate.id, (affiliate as any).fp_promoter_id, affiliate)
    return <SubscriptionPaywall affiliate={affiliate} stats={fpData.stats} />
  }

  // Get all data from FirstPromoter in one API call
  const fpData = await getFirstPromoterData(affiliate.id, (affiliate as any).fp_promoter_id, affiliate)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-1">
        {/* Tutorial Video Banner */}
        <section className="mb-6">
          <VideoBanner
            videoUrl={process.env.NEXT_PUBLIC_AFFILIATE_TUTORIAL_VIDEO}
            title="How to Use the Affiliate Dashboard"
          />
        </section>

        {/* Stats */}
        <StatsCards stats={fpData.stats} affiliate={affiliate} />

        {/* Products */}
        <section className="mt-6 pb-8">
          <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300 mb-4" style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.5)' }}>Available Products</h2>
          <FirstPromoterProductList
            campaigns={fpData.campaigns}
            refId={(affiliate as any).fp_ref_id}
          />
        </section>
    </main>
  )
}
