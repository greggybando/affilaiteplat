import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get affiliate's pod
    const { data: podMember } = await supabaseAdmin
      .from('pod_members')
      .select('pod_id')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!podMember) {
      return NextResponse.json({ battles: [], activeBattles: [], pendingChallenges: [] })
    }

    const podId = (podMember as any).pod_id

    // Get all battles involving this pod
    const { data: battles } = await supabaseAdmin
      .from('pod_battles')
      .select(`
        *,
        challenger_pod:pods!pod_battles_challenger_pod_id_fkey (
          id,
          name,
          created_by
        ),
        defender_pod:pods!pod_battles_defender_pod_id_fkey (
          id,
          name,
          created_by
        ),
        product:products (
          id,
          name,
          slug
        ),
        winner_pod:pods!pod_battles_winner_pod_id_fkey (
          id,
          name
        )
      `)
      .or(`challenger_pod_id.eq.${podId},defender_pod_id.eq.${podId}`)
      .order('created_at', { ascending: false })

    // Get battle stats for active battles
    const activeBattles = (battles || []).filter((b: any) => b.status === 'active')
    const battleIds = activeBattles.map((b: any) => b.id)

    let battleStats: any[] = []
    if (battleIds.length > 0) {
      const { data: stats } = await supabaseAdmin
        .from('pod_battle_stats')
        .select('*')
        .in('battle_id', battleIds)

      battleStats = stats || []
    }

    // Get pod member counts for sales per member calculation
    const allPodIds = [
      ...(battles || []).map((b: any) => b.challenger_pod_id),
      ...(battles || []).map((b: any) => b.defender_pod_id),
    ]
    const podIds = Array.from(new Set(allPodIds))

    const { data: podMembers } = await supabaseAdmin
      .from('pod_members')
      .select('pod_id')
      .in('pod_id', podIds)
      .eq('status', 'accepted')

    const memberCounts: Record<string, number> = {}
    ;(podMembers || []).forEach((m: any) => {
      memberCounts[m.pod_id] = (memberCounts[m.pod_id] || 0) + 1
    })

    // Get 24-hour sales for active battles
    const activeBattleIds = activeBattles.map((b: any) => b.id)
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
    
    let pod24HourSales: Record<string, number> = {}
    if (activeBattleIds.length > 0) {
      // Get all pod IDs from active battles
      const activePodIds = [
        ...activeBattles.map((b: any) => b.challenger_pod_id),
        ...activeBattles.map((b: any) => b.defender_pod_id),
      ]
      const uniquePodIds = Array.from(new Set(activePodIds))
      
      // Get members of these pods
      const { data: activePodMembers } = await supabaseAdmin
        .from('pod_members')
        .select('pod_id, affiliate_id')
        .in('pod_id', uniquePodIds)
        .eq('status', 'accepted')
      
      const podAffiliateMap: Record<string, string[]> = {}
      ;(activePodMembers || []).forEach((m: any) => {
        if (!podAffiliateMap[m.pod_id]) {
          podAffiliateMap[m.pod_id] = []
        }
        podAffiliateMap[m.pod_id].push(m.affiliate_id)
      })
      
      // Get conversions in last 24 hours for these affiliates
      const allAffiliateIds = Object.values(podAffiliateMap).flat()
      if (allAffiliateIds.length > 0) {
        const { data: recentConversions } = await supabaseAdmin
          .from('conversions')
          .select('affiliate_id, order_amount_cents, status')
          .in('affiliate_id', allAffiliateIds)
          .gte('converted_at', twentyFourHoursAgo.toISOString())
          .neq('status', 'refunded')
        
        // Count conversions per pod
        Object.keys(podAffiliateMap).forEach((podId) => {
          const affiliateIds = podAffiliateMap[podId]
          const podConversions = (recentConversions || []).filter(
            (c: any) => affiliateIds.includes(c.affiliate_id)
          )
          pod24HourSales[podId] = podConversions.length
        })
      }
    }

    // Format battles with stats
    const formattedBattles = (battles || []).map((battle: any) => {
      const stats = battleStats.filter((s: any) => s.battle_id === battle.id)
      const challengerStats = stats.find((s: any) => s.pod_id === battle.challenger_pod_id)
      const defenderStats = stats.find((s: any) => s.pod_id === battle.defender_pod_id)

      const challengerMemberCount = memberCounts[battle.challenger_pod_id] || 1
      const defenderMemberCount = memberCounts[battle.defender_pod_id] || 1

      // Use sales_per_member from stats if available, otherwise calculate
      const challengerSalesPerMember = challengerStats?.sales_per_member 
        ? challengerStats.sales_per_member 
        : (challengerStats?.total_sales || 0) / challengerMemberCount
      
      const defenderSalesPerMember = defenderStats?.sales_per_member
        ? defenderStats.sales_per_member
        : (defenderStats?.total_sales || 0) / defenderMemberCount

      // Get 24-hour sales
      const challenger24HourSales = pod24HourSales[battle.challenger_pod_id] || 0
      const defender24HourSales = pod24HourSales[battle.defender_pod_id] || 0

      return {
        ...battle,
        challengerStats: challengerStats
          ? {
              total_sales: challengerStats.total_sales || 0,
              total_conversions: challengerStats.total_conversions || 0,
              salesPerMember: challengerSalesPerMember,
              sales24Hours: challenger24HourSales,
            }
          : { total_sales: 0, total_conversions: 0, salesPerMember: 0, sales24Hours: 0 },
        defenderStats: defenderStats
          ? {
              total_sales: defenderStats.total_sales || 0,
              total_conversions: defenderStats.total_conversions || 0,
              salesPerMember: defenderSalesPerMember,
              sales24Hours: defender24HourSales,
            }
          : { total_sales: 0, total_conversions: 0, salesPerMember: 0, sales24Hours: 0 },
        challengerMemberCount,
        defenderMemberCount,
      }
    })

    const activeBattlesFormatted = formattedBattles.filter((b: any) => b.status === 'active')
    const pendingChallenges = formattedBattles.filter((b: any) => b.status === 'pending')
    const completedBattles = formattedBattles.filter((b: any) => b.status === 'completed')

    return NextResponse.json({
      battles: formattedBattles,
      activeBattles: activeBattlesFormatted,
      pendingChallenges,
      completedBattles,
    })
  } catch (error: any) {
    console.error('Get battles error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

