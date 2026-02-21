import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ResubscribeClient } from './ResubscribeClient'

async function getAffiliateStats(affiliateId: string, fpPromoterId: string | null, affiliate: any) {
  // Calculate stats from database using commission_cents (not revenue)
  // This ensures payout amounts match earnings amounts
  const baseStats = {
    affiliate_id: affiliateId,
    email: affiliate.email,
    name: affiliate.name,
    subscription_status: affiliate.status,
    trial_ends_at: affiliate.trial_ends_at || '',
    total_links: 0,
    total_clicks: 0,
    total_conversions: 0,
    pending_cents: 0,
    approved_cents: 0,
    locked_cents: 0,
    paid_cents: 0,
  }

  // Query affiliate_stats view which correctly calculates from commission_cents
  const { data: stats, error } = await supabaseAdmin
    .from('affiliate_stats')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .single()

  if (error || !stats) {
    console.warn('Could not fetch affiliate stats from database:', error)
    return baseStats
  }

  return {
    ...baseStats,
    total_links: (stats as any).total_links || 0,
    total_clicks: (stats as any).total_clicks || 0,
    total_conversions: (stats as any).total_conversions || 0,
    pending_cents: (stats as any).pending_cents || 0,
    approved_cents: (stats as any).approved_cents || 0,
    locked_cents: (stats as any).locked_cents || 0,
    paid_cents: (stats as any).paid_cents || 0,
  }
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
  const stats = await getAffiliateStats(affiliate.id, (affiliate as any).fp_promoter_id, affiliate)

  return (
    <ResubscribeClient affiliate={affiliate} stats={stats} />
  )
}

