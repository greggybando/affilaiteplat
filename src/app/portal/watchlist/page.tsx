import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { WatchListClient } from './WatchListClient'

export default async function WatchListPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Watch List</h1>
        <WatchListClient currentAffiliateId={affiliate.id} />
      </div>
    </main>
  )
}




