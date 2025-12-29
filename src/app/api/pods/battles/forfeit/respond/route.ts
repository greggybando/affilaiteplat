import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { awardTitle, revokeTitle } from '@/lib/titles'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { battleId, response } = body // 'accept' or 'decline'

    if (!battleId || !response || !['accept', 'decline'].includes(response)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Get affiliate's pod
    const { data: podMember } = await supabaseAdmin
      .from('pod_members')
      .select('pod_id, pod:pods!inner(created_by)')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!podMember) {
      return NextResponse.json({ error: 'You must be in a pod' }, { status: 400 })
    }

    const podId = (podMember as any).pod_id
    const pod = (podMember as any).pod as any

    // Verify user is pod leader
    if (pod.created_by !== affiliate.id) {
      return NextResponse.json({ error: 'Only pod leader can respond to forfeit' }, { status: 403 })
    }

    // Get battle
    const { data: battle } = await supabaseAdmin
      .from('pod_battles')
      .select('*')
      .eq('id', battleId)
      .eq('status', 'active')
      .eq('forfeit_status', 'requested')
      .maybeSingle()

    if (!battle) {
      return NextResponse.json({ error: 'Forfeit request not found' }, { status: 404 })
    }

    const battleData = battle as any

    // Verify this pod is the one being asked (not the one that requested)
    if (battleData.forfeit_requested_by_pod_id === podId) {
      return NextResponse.json({ error: 'You cannot respond to your own forfeit request' }, { status: 400 })
    }

    // Verify pod is part of this battle
    if (battleData.challenger_pod_id !== podId && battleData.defender_pod_id !== podId) {
      return NextResponse.json({ error: 'Your pod is not part of this battle' }, { status: 403 })
    }

    if (response === 'accept') {
      // Complete battle - the pod that requested forfeit loses
      const winnerPodId = battleData.forfeit_requested_by_pod_id === battleData.challenger_pod_id
        ? battleData.defender_pod_id
        : battleData.challenger_pod_id

      // Get current stats for win margin calculation
      const { data: stats } = await supabaseAdmin
        .from('pod_battle_stats')
        .select('*')
        .eq('battle_id', battleId)

      const challengerStats = stats?.find((s: any) => s.pod_id === battleData.challenger_pod_id) as any
      const defenderStats = stats?.find((s: any) => s.pod_id === battleData.defender_pod_id) as any

      const challengerSalesPerMember = challengerStats?.sales_per_member || 0
      const defenderSalesPerMember = defenderStats?.sales_per_member || 0

      // Calculate win margin (winner gets 100% margin since forfeit)
      const winMarginPercent = 100

      // Update battle
      await (supabaseAdmin.from('pod_battles') as any)
        .update({
          status: 'completed',
          winner_pod_id: winnerPodId,
          win_margin_percent: winMarginPercent,
          forfeit_status: 'accepted',
        })
        .eq('id', battleId)

      // Get pod leaders for title awarding
      const { data: winnerPod } = await supabaseAdmin
        .from('pods')
        .select('created_by')
        .eq('id', winnerPodId)
        .maybeSingle()

      const winnerLeaderId = winnerPod ? (winnerPod as any).created_by : null

      // Award "Undefeated" title to winner
      if (winnerLeaderId) {
        await awardTitle(winnerLeaderId, 'undefeated', supabaseAdmin)
      }

      // Handle prizes (commission boost, member steal, etc.)
      if (battleData.prize_type === 'commission_boost') {
        // Get all members of winning pod
        const { data: members } = await supabaseAdmin
          .from('pod_members')
          .select('affiliate_id')
          .eq('pod_id', winnerPodId)
          .eq('status', 'accepted')

        if (members && members.length > 0) {
          const boostExpiresAt = new Date()
          boostExpiresAt.setDate(boostExpiresAt.getDate() + 7) // 7 days

          for (const member of members) {
            await (supabaseAdmin.from('affiliates') as any)
              .update({
                commission_boost_percent: 10,
                commission_boost_expires_at: boostExpiresAt.toISOString(),
              })
              .eq('id', (member as any).affiliate_id)
          }
        }
      }

      // Note: Member steal prize is not applicable for forfeits (requires >20% win margin, but forfeit is automatic win)
    } else {
      // Decline forfeit
      await (supabaseAdmin.from('pod_battles') as any)
        .update({
          forfeit_status: 'declined',
        })
        .eq('id', battleId)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Respond to forfeit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




