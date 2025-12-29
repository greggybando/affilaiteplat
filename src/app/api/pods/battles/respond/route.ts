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
      return NextResponse.json({ error: 'Only pod leader can respond to challenges' }, { status: 403 })
    }

    // Get battle
    const { data: battle } = await supabaseAdmin
      .from('pod_battles')
      .select('*')
      .eq('id', battleId)
      .eq('defender_pod_id', podId)
      .eq('status', 'pending')
      .maybeSingle()

    if (!battle) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    const battleData = battle as any

    if (response === 'accept') {
      // Start battle
      const startDate = new Date()
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + battleData.duration_days)

      const { error: updateError } = await (supabaseAdmin
        .from('pod_battles') as any)
        .update({
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        })
        .eq('id', battleId)

      if (updateError) {
        console.error('Error starting battle:', updateError)
        return NextResponse.json({ error: 'Failed to start battle' }, { status: 500 })
      }

      // Initialize battle stats for both pods (check if they exist first)
      const { data: existingStats } = await supabaseAdmin
        .from('pod_battle_stats')
        .select('id')
        .eq('battle_id', battleId)

      if (!existingStats || existingStats.length === 0) {
        const { error: insertError } = await (supabaseAdmin.from('pod_battle_stats') as any).insert([
          {
            battle_id: battleId,
            pod_id: battleData.challenger_pod_id,
            total_sales: 0,
            total_conversions: 0,
            sales_per_member: 0,
          },
          {
            battle_id: battleId,
            pod_id: battleData.defender_pod_id,
            total_sales: 0,
            total_conversions: 0,
            sales_per_member: 0,
          },
        ])

        if (insertError) {
          console.error('Error initializing battle stats:', insertError)
          // Don't fail the request if stats init fails - battle is still active
        }
      }
    } else {
      // Decline
      const { error: updateError } = await (supabaseAdmin
        .from('pod_battles') as any)
        .update({ status: 'declined' })
        .eq('id', battleId)

      if (updateError) {
        console.error('Error declining battle:', updateError)
        return NextResponse.json({ error: 'Failed to decline challenge' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Respond to battle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

