import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { PodsClient } from './PodsClient'

export default async function PodsPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PodsClient currentAffiliateId={affiliate.id} />
    </main>
  )
}

