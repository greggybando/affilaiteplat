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
    const losingPodId = searchParams.get('losingPodId')

    if (!battleId || !losingPodId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get battle to verify win margin
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
      return NextResponse.json({ error: 'Only winner pod leader can view stealable members' }, { status: 403 })
    }

    // Verify win margin > 20% and prize is member_steal
    if (!battleData.win_margin_percent || battleData.win_margin_percent <= 20) {
      return NextResponse.json({ error: 'Win margin must be > 20%' }, { status: 400 })
    }

    if (battleData.prize_type !== 'member_steal') {
      return NextResponse.json({ error: 'This battle did not have member steal prize' }, { status: 400 })
    }

    // Get losing pod leader
    const { data: losingPod } = await supabaseAdmin
      .from('pods')
      .select('created_by')
      .eq('id', losingPodId)
      .maybeSingle()

    const losingPodLeaderId = losingPod ? (losingPod as any).created_by : null

    // Get all members of losing pod
    const { data: members } = await supabaseAdmin
      .from('pod_members')
      .select(`
        id,
        affiliate_id,
        affiliate:affiliates (
          id,
          name,
          avatar_name,
          avatar_url,
          steal_protection_until,
          pod_joined_at
        )
      `)
      .eq('pod_id', losingPodId)
      .eq('status', 'accepted')

    const now = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const stealableMembers = (members || []).map((m: any) => {
      const affiliate = m.affiliate as any
      const isLeader = affiliate.id === losingPodLeaderId
      const protectionUntil = affiliate.steal_protection_until
        ? new Date(affiliate.steal_protection_until)
        : null
      const joinedAt = affiliate.pod_joined_at ? new Date(affiliate.pod_joined_at) : null

      let isProtected = false
      let protectionReason: string | undefined

      if (isLeader) {
        isProtected = true
        protectionReason = 'Pod leader cannot be stolen'
      } else if (joinedAt && joinedAt > sevenDaysAgo) {
        isProtected = true
        const daysLeft = Math.ceil((sevenDaysAgo.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24))
        protectionReason = `7-day protection (${Math.abs(daysLeft)} days left)`
      } else if (protectionUntil && protectionUntil > now) {
        isProtected = true
        const daysLeft = Math.ceil((protectionUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        protectionReason = `Protected (${daysLeft} days left)`
      } else if (protectionUntil && protectionUntil > thirtyDaysAgo) {
        isProtected = true
        protectionReason = 'Can only be stolen once per 30 days'
      }

      return {
        id: m.id,
        affiliate_id: affiliate.id,
        name: affiliate.name,
        avatarName: affiliate.avatar_name || affiliate.name,
        avatarUrl: affiliate.avatar_url,
        isLeader,
        isProtected,
        protectionReason,
      }
    })

    return NextResponse.json({ members: stealableMembers })
  } catch (error: any) {
    console.error('Get stealable members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




