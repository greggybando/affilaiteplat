import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { formatDistanceToNow, differenceInDays, format } from 'date-fns'
import { SubscriptionPaywall } from './components/SubscriptionPaywall'
import { StatsCards } from './components/StatsCards'
import { ProductList } from './components/ProductList'
import { VideoBanner } from './components/VideoBanner'

async function getAffiliateStats(affiliateId: string, fpPromoterId: string | null, affiliate: any) {
  // Fetch stats from FirstPromoter API using promoter_id
  // Return full AffiliateStats shape with affiliate info
  const baseStats = {
    affiliate_id: affiliateId,
    email: affiliate.email,
    name: affiliate.name,
    subscription_status: affiliate.status,
    trial_ends_at: affiliate.trial_ends_at || '',
    total_links: 0, // FirstPromoter doesn't track this separately
    total_clicks: 0,
    total_conversions: 0,
    pending_cents: 0,
    approved_cents: 0,
    locked_cents: 0,
    paid_cents: 0,
  }

  if (!process.env.FIRSTPROMOTER_API_KEY || !fpPromoterId) {
    console.warn('FirstPromoter API key or promoter ID not configured, returning empty stats')
    return baseStats
  }

  try {
    // FirstPromoter API endpoint - get promoter stats by ID
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
      // If affiliate not found in FirstPromoter yet, return base stats
      if (response.status === 404) {
        return baseStats
      }
      
      const errorText = await response.text()
      console.error('FirstPromoter API error:', response.status, errorText)
      return baseStats
    }

    const data = await response.json()

    // Map FirstPromoter stats to our format
    // Adjust these field names based on FirstPromoter's actual API response structure
    return {
      ...baseStats,
      total_clicks: data.clicks || data.total_clicks || data.visits || 0,
      total_conversions: data.conversions || data.total_conversions || data.sales || 0,
      pending_cents: Math.round((data.pending || data.pending_amount || 0) * 100),
      approved_cents: Math.round((data.approved || data.approved_amount || data.available || 0) * 100),
      paid_cents: Math.round((data.paid || data.paid_amount || data.total_earned || data.total_paid || 0) * 100),
    }
  } catch (error: any) {
    console.error('Error fetching FirstPromoter stats:', error)
    // Return base stats on error
    return baseStats
  }
}

async function getProducts() {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      landing_pages (
        id,
        name,
        slug,
        variant_name,
        is_active
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return products || []
}

async function getAffiliateLinks(affiliateId: string) {
  const { data: links } = await supabaseAdmin
    .from('affiliate_links')
    .select(`
      *,
      landing_page:landing_pages (
        id,
        name,
        slug,
        product:products (
          id,
          name,
          slug
        )
      )
    `)
    .eq('affiliate_id', affiliateId)

  return links || []
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
    const stats = await getAffiliateStats(affiliate.id, (affiliate as any).fp_promoter_id, affiliate)
    return <SubscriptionPaywall affiliate={affiliate} stats={stats} />
  }

  // Get data
  const [stats, products, affiliateLinks] = await Promise.all([
    getAffiliateStats(affiliate.id, (affiliate as any).fp_promoter_id, affiliate),
    getProducts(),
    getAffiliateLinks(affiliate.id),
  ])

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-1">
        {/* Get Your Affiliate Links Button */}
        <section className="mb-6">
          <a
            href={process.env.NEXT_PUBLIC_FIRSTPROMOTER_PORTAL_URL || 'https://app.firstpromoter.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Get Your Affiliate Links
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </section>

        {/* Tutorial Video Banner */}
        <section className="mb-6">
          <VideoBanner
            videoUrl={process.env.NEXT_PUBLIC_AFFILIATE_TUTORIAL_VIDEO}
            title="How to Use the Affiliate Dashboard"
          />
        </section>

        {/* Stats */}
        <StatsCards stats={stats} affiliate={affiliate} />

        {/* Products */}
        <section className="mt-6 pb-8">
          <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300 mb-4" style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.5)' }}>Available Products</h2>
          <ProductList
            products={products}
            affiliateLinks={affiliateLinks}
            affiliateId={affiliate.id}
            refId={(affiliate as any).fp_ref_id}
          />
        </section>
    </main>
  )
}
