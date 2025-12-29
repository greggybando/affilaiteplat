import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { battleId, targetMemberId } = body

    if (!battleId || !targetMemberId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get battle
    const { data: battle } = await supabaseAdmin
      .from('pod_battles')
      .select('*')
      .eq('id', battleId)
      .eq('status', 'completed')
      .maybeSingle()

    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 })
    }

    const battleData = battle as any

    // Verify user is winner pod leader
    const { data: winnerPod } = await supabaseAdmin
      .from('pods')
      .select('created_by')
      .eq('id', battleData.winner_pod_id)
      .maybeSingle()

    if (!winnerPod || (winnerPod as any).created_by !== affiliate.id) {
      return NextResponse.json({ error: 'Only winner pod leader can steal members' }, { status: 403 })
    }

    // Verify win margin > 20% and prize is member_steal
    if (!battleData.win_margin_percent || battleData.win_margin_percent <= 20) {
      return NextResponse.json({ error: 'Win margin must be > 20% to steal members' }, { status: 400 })
    }

    if (battleData.prize_type !== 'member_steal') {
      return NextResponse.json({ error: 'This battle did not have member steal prize' }, { status: 400 })
    }

    // Get loser pod
    const loserPodId = battleData.winner_pod_id === battleData.challenger_pod_id
      ? battleData.defender_pod_id
      : battleData.challenger_pod_id

    // Verify target member is in loser pod
    const { data: targetMember } = await supabaseAdmin
      .from('pod_members')
      .select('pod_id, affiliate_id, pod:pods!inner(created_by)')
      .eq('id', targetMemberId)
      .eq('pod_id', loserPodId)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found in losing pod' }, { status: 404 })
    }

    const memberData = targetMember as any
    const pod = memberData.pod as any

    // Protections: Leader cannot be stolen
    if (pod.created_by === memberData.affiliate_id) {
      return NextResponse.json({ error: 'Pod leaders cannot be stolen' }, { status: 400 })
    }

    // Check if member has steal protection
    const { data: memberAffiliate } = await supabaseAdmin
      .from('affiliates')
      .select('steal_protection_until, pod_joined_at')
      .eq('id', memberData.affiliate_id)
      .maybeSingle()

    if (memberAffiliate) {
      const affData = memberAffiliate as any
      const protectionUntil = affData.steal_protection_until
        ? new Date(affData.steal_protection_until)
        : null
      const joinedAt = affData.pod_joined_at ? new Date(affData.pod_joined_at) : null

      // 7-day protection after joining
      if (joinedAt) {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        if (joinedAt > sevenDaysAgo) {
          return NextResponse.json({ error: 'Member has 7-day protection after joining' }, { status: 400 })
        }
      }

      // Check if protected until date
      if (protectionUntil && protectionUntil > new Date()) {
        return NextResponse.json({ error: 'Member is protected from stealing' }, { status: 400 })
      }

      // Check if stolen within last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      if (protectionUntil && protectionUntil > thirtyDaysAgo) {
        return NextResponse.json({ error: 'Member can only be stolen once per 30 days' }, { status: 400 })
      }
    }

    // Remove from loser pod
    await (supabaseAdmin.from('pod_members') as any)
      .update({ status: 'declined' })
      .eq('id', targetMemberId)

    // Add to winner pod with 7-day protection
    const protectionUntil = new Date()
    protectionUntil.setDate(protectionUntil.getDate() + 7)

    await (supabaseAdmin.from('pod_members') as any).insert({
      pod_id: battleData.winner_pod_id,
      affiliate_id: memberData.affiliate_id,
      status: 'accepted',
      contract_expires_at: null,
    })

    // Update affiliate protection
    await (supabaseAdmin.from('affiliates') as any)
      .update({
        steal_protection_until: protectionUntil.toISOString(),
        pod_joined_at: new Date().toISOString(),
      })
      .eq('id', memberData.affiliate_id)

    return NextResponse.json({ success: true, message: 'Member successfully recruited' })
  } catch (error: any) {
    console.error('Steal member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




