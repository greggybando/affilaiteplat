import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const battleId = searchParams.get('battleId')

    if (!battleId) {
      return NextResponse.json({ error: 'Missing battleId' }, { status: 400 })
    }

    // Get battle details
    const { data: battle } = await supabaseAdmin
      .from('pod_battles')
      .select(`
        id,
        challenger_pod_id,
        defender_pod_id,
        start_date,
        product_id,
        challenger_pod:pods!pod_battles_challenger_pod_id_fkey (
          id,
          name
        ),
        defender_pod:pods!pod_battles_defender_pod_id_fkey (
          id,
          name
        )
      `)
      .eq('id', battleId)
      .eq('status', 'active')
      .maybeSingle()

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found or not active' }, { status: 404 })
    }

    const battleData = battle as any
    const startDate = battleData.start_date

    // Get all members from both pods
    const { data: challengerMembers } = await supabaseAdmin
      .from('pod_members')
      .select(`
        affiliate_id,
        pod_id,
        affiliate:affiliates!inner (
          id,
          avatar_name,
          avatar_url
        )
      `)
      .eq('pod_id', battleData.challenger_pod_id)
      .eq('status', 'accepted')

    const { data: defenderMembers } = await supabaseAdmin
      .from('pod_members')
      .select(`
        affiliate_id,
        pod_id,
        affiliate:affiliates!inner (
          id,
          avatar_name,
          avatar_url
        )
      `)
      .eq('pod_id', battleData.defender_pod_id)
      .eq('status', 'accepted')

    const allMembers = [
      ...(challengerMembers || []).map((m: any) => ({
        ...m,
        pod: battleData.challenger_pod,
      })),
      ...(defenderMembers || []).map((m: any) => ({
        ...m,
        pod: battleData.defender_pod,
      })),
    ]

    // Get conversions for each member during battle period
    const affiliateIds = allMembers.map((m: any) => m.affiliate_id)
    
    const { data: conversions } = await supabaseAdmin
      .from('conversions')
      .select('affiliate_id, order_amount_cents, status')
      .in('affiliate_id', affiliateIds)
      .eq('product_id', battleData.product_id)
      .gte('converted_at', startDate)
      .neq('status', 'refunded')

    // Calculate stats per member
    const memberStats = allMembers.map((member: any) => {
      const affiliate = member.affiliate as any
      const memberConversions = (conversions || []).filter(
        (c: any) => c.affiliate_id === affiliate.id
      )

      const revenue = memberConversions.reduce(
        (sum: number, c: any) => sum + (c.order_amount_cents || 0),
        0
      )
      const conversionCount = memberConversions.length

      return {
        affiliateId: affiliate.id,
        avatarName: affiliate.avatar_name || 'Unknown',
        avatarUrl: affiliate.avatar_url,
        podName: member.pod.name,
        podId: member.pod.id,
        revenue: revenue / 100, // Convert cents to dollars
        conversions: conversionCount,
      }
    })

    // Sort by revenue (highest first)
    memberStats.sort((a, b) => b.revenue - a.revenue)

    // Find top performer
    const topPerformer = memberStats.length > 0 ? memberStats[0] : null

    return NextResponse.json({
      memberStats,
      topPerformer,
    })
  } catch (error: any) {
    console.error('Get member stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




