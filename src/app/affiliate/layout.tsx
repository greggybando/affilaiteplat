import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { TrialBanner } from './components/TrialBanner'
import { PortalNav } from './components/PortalNav'
import { differenceInDays } from 'date-fns'
import Link from 'next/link'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  // Redirect expired or cancelled users to resubscribe page
  if (affiliate.status === 'expired' || affiliate.status === 'cancelled') {
    redirect('/resubscribe')
  }

  const isTrial = affiliate.status === 'trial'
  const trialDaysLeft = isTrial
    ? differenceInDays(new Date(affiliate.trial_ends_at), new Date())
    : 0

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Trial Banner */}
      {isTrial && trialDaysLeft <= 7 && (
        <TrialBanner daysLeft={trialDaysLeft} />
      )}

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="text-xl font-bold text-white mt-2">Build Your Side Income</h1>
            <p className="text-sm text-gray-400">Welcome back, {affiliate.name}</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <PortalNav />

      {/* Page Content */}
      {children}
    </div>
  )
}

