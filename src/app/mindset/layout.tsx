import { redirect } from 'next/navigation'
import { getCurrentAffiliate, isAdmin } from '@/lib/auth'
import Link from 'next/link'
import { MindsetNav } from './components/MindsetNav'

export default async function MindsetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const affiliate = await getCurrentAffiliate()
  const admin = await isAdmin()

  if (!affiliate) {
    redirect('/login')
  }

  // Redirect expired or cancelled users to resubscribe page
  if (affiliate.status === 'expired' || affiliate.status === 'cancelled') {
    redirect('/resubscribe')
  }

  if (!affiliate.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link 
                href="/dashboard" 
                className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-white mt-1 tracking-tight">
                Mindset & Foundations
              </h1>
              <p className="text-sm text-slate-400">
                Welcome back, {affiliate.avatar_name || affiliate.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {affiliate.avatar_url ? (
                <img 
                  src={affiliate.avatar_url} 
                  alt={affiliate.avatar_name || 'Avatar'}
                  className="w-10 h-10 rounded-full ring-2 ring-purple-500/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold ring-2 ring-purple-500/20">
                  {(affiliate.avatar_name || affiliate.name || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <MindsetNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
