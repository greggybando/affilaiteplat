import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get referral code
    const { data: referralCode } = await supabaseAdmin
      .from('referral_codes')
      .select('code')
      .eq('affiliate_id', affiliate.id)
      .eq('is_active', true)
      .single()

    // Get active referrals count
    const { count: activeReferrals } = await supabaseAdmin
      .from('subscription_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', affiliate.id)
      .eq('status', 'active')

    // Get total commissions (pending + approved)
    const { data: commissions } = await supabaseAdmin
      .from('subscription_commissions')
      .select('amount_cents, status')
      .eq('referrer_id', affiliate.id)
      .in('status', ['pending', 'approved', 'paid'])

    const totalCommissions = commissions?.reduce((sum, c) => sum + c.amount_cents, 0) || 0
    const pendingCommissions = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount_cents, 0) || 0
    const paidCommissions = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount_cents, 0) || 0

    // Get monthly recurring revenue (MRR)
    const { data: activeCommissions } = await supabaseAdmin
      .from('subscription_commissions')
      .select('amount_cents')
      .eq('referrer_id', affiliate.id)
      .eq('status', 'approved')
      .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const mrr = activeCommissions?.reduce((sum, c) => sum + c.amount_cents, 0) || 0

    return NextResponse.json({
      referralCode: referralCode?.code || null,
      activeReferrals: activeReferrals || 0,
      totalCommissions: totalCommissions,
      pendingCommissions: pendingCommissions,
      paidCommissions: paidCommissions,
      monthlyRecurringRevenue: mrr
    })
  } catch (error: any) {
    console.error('Error fetching referral stats:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

