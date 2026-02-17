import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ResubscribeClient } from './ResubscribeClient'

async function getAffiliateStats(affiliateId: string, fpPromoterId: string | null, affiliate: any) {
  // Fetch stats from FirstPromoter API using promoter_id
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

  if (!process.env.FIRSTPROMOTER_API_KEY || !fpPromoterId) {
    console.warn('FirstPromoter API key or promoter ID not configured, returning empty stats')
    return baseStats
  }

  try {
    const response = await fetch(
      `https://firstpromoter.com/api/v1/promoters/show?id=${encodeURIComponent(fpPromoterId)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return baseStats
      }
      
      const errorText = await response.text()
      console.error('FirstPromoter API error:', response.status, errorText)
      return baseStats
    }

    const data = await response.json()

    return {
      ...baseStats,
      total_clicks: data.clicks || data.total_clicks || data.visits || 0,
      total_conversions: data.conversions || data.total_conversions || data.sales || 0,
      pending_cents: Math.round((data.pending || data.pending_amount || 0) * 100),
      approved_cents: Math.round((data.approved || data.approved_amount || data.available || 0) * 100),
      paid_cents: Math.round((data.paid || data.paid_amount || data.total_earned || data.total_paid || 0) * 100),
    }
  } catch (error: any) {
    console.error('Error fetching FirstPromoter stats:', error)
    return baseStats
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

