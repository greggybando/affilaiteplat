import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { SettingsClient } from './SettingsClient'
import { supabaseAdmin } from '@/lib/supabase'

async function getAffiliateTitles(affiliateId: string) {
  const { data: titles } = await supabaseAdmin
    .from('affiliate_titles')
    .select('title_slug')
    .eq('affiliate_id', affiliateId)

  return (titles || []).map((t: any) => t.title_slug)
}

export default async function SettingsPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  const affiliateData = affiliate as any
  const titles = await getAffiliateTitles(affiliate.id)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
        <SettingsClient
          currentAvatarName={affiliateData.avatar_name}
          currentAvatarUrl={affiliateData.avatar_url}
          currentSignature={affiliateData.signature}
          commissionBoostPercent={affiliateData.commission_boost_percent || 0}
          commissionBoostExpiresAt={affiliateData.commission_boost_expires_at}
          stealProtectionUntil={affiliateData.steal_protection_until}
          titles={titles}
        />
      </div>
    </main>
  )
}

