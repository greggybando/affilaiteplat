import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { TrialBanner } from './components/TrialBanner'
import { PortalNav } from './components/PortalNav'
import { AvatarSetupCheck } from './components/AvatarSetupCheck'
import { differenceInDays } from 'date-fns'

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

  const avatarName = (affiliate as any).avatar_name

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Trial Banner */}
      {isTrial && trialDaysLeft <= 7 && (
        <TrialBanner daysLeft={trialDaysLeft} />
      )}

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-white">Affiliate Portal</h1>
          <p className="text-sm text-gray-400">Welcome back, {affiliate.name}</p>
        </div>
      </header>

      {/* Navigation */}
      <PortalNav />

      {/* Avatar Setup Check */}
      {!avatarName && <AvatarSetupCheck affiliate={affiliate as any} />}

      {/* Page Content */}
      {children}
    </div>
  )
}

