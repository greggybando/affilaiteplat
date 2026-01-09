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
    <div className="min-h-screen" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Trial Banner */}
      {isTrial && trialDaysLeft <= 7 && (
        <TrialBanner daysLeft={trialDaysLeft} />
      )}

      {/* Header */}
      <header 
        className="border-b sticky top-0 z-10 relative"
        style={{
          background: 'rgba(26,26,46,0.8)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Link 
                href="/dashboard" 
                className="text-[rgba(255,255,255,0.6)] hover:text-cyan-400 text-sm transition-colors flex items-center gap-2"
              >
                ← Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-4xl" style={{
                animation: 'lightning 4s ease-in-out infinite',
                filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.7))'
              }}>
                ⚡
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300" style={{
                  textShadow: '0 0 20px rgba(34, 211, 238, 0.7)',
                  letterSpacing: '0.02em'
                }}>Build Your Side Income</h1>
                <p className="text-sm text-[rgba(255,255,255,0.6)]">Welcome back, {affiliate.name}</p>
              </div>
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes lightning {
            0%, 90%, 100% { opacity: 1; transform: scale(1); }
            5%, 10% { opacity: 0.3; transform: scale(0.95); }
            7.5% { opacity: 1; transform: scale(1.1); }
          }
        `}</style>
      </header>

      {/* Navigation */}
      <PortalNav />

      {/* Page Content */}
      <div className="relative z-1">
        {children}
      </div>
    </div>
  )
}

