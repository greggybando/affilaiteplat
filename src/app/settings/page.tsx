import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { SettingsClient } from './SettingsClient'
import { supabaseAdmin } from '@/lib/supabase'

export default async function SettingsPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  // Fetch bio separately since it's not in getCurrentAffiliate
  const { data: affiliateData } = await (supabaseAdmin.from('affiliates') as any)
    .select('bio')
    .eq('id', affiliate.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <SettingsClient affiliate={{ ...affiliate, bio: (affiliateData as any)?.bio || null } as any} />
    </div>
  )
}






