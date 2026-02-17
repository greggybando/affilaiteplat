import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { formatDistanceToNow, differenceInDays, format } from 'date-fns'
import { SubscriptionPaywall } from './components/SubscriptionPaywall'
import { StatsCards } from './components/StatsCards'
import { FirstPromoterProductList } from './components/FirstPromoterProductList'
import { VideoBanner } from './components/VideoBanner'
import { FirstPromoterDashboardClient } from './FirstPromoterDashboardClient'

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

  // If expired, show paywall (still need stats for paywall)
  if (isExpired) {
    // Fetch stats for paywall
    const baseStats = {
      affiliate_id: affiliate.id,
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
    return <SubscriptionPaywall affiliate={affiliate} stats={baseStats} />
  }

  // Use client component to fetch FirstPromoter data
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-1">
        {/* Tutorial Video Banner */}
        <section className="mb-6">
          <VideoBanner
            videoUrl={process.env.NEXT_PUBLIC_AFFILIATE_TUTORIAL_VIDEO}
            title="How to Use the Affiliate Dashboard"
          />
        </section>

        {/* Client component handles FirstPromoter API calls */}
        <FirstPromoterDashboardClient affiliate={affiliate} />
    </main>
  )
}
