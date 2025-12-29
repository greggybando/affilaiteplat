import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { LeaderboardClient } from './LeaderboardClient'

export default async function LeaderboardPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Leaderboard</h1>
        <LeaderboardClient currentAffiliateId={affiliate.id} />
      </div>
    </main>
  )
}




