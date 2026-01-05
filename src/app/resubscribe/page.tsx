import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ResubscribeClient } from './ResubscribeClient'

async function getAffiliateStats(affiliateId: string) {
  const { data: stats } = await (supabaseAdmin.rpc as any)('get_affiliate_stats', {
    p_affiliate_id: affiliateId,
  })
  return stats as any
}

export default async function ResubscribePage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  // If already active, redirect to dashboard
  if (affiliate.status === 'active') {
    redirect('/dashboard')
  }

  // Get frozen stats
  const stats = await getAffiliateStats(affiliate.id)

  return (
    <div className="min-h-screen bg-gray-950">
      <ResubscribeClient affiliate={affiliate} stats={stats} />
    </div>
  )
}

