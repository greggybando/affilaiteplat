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
    const { battleId } = body

    if (!battleId) {
      return NextResponse.json({ error: 'battleId is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Only pod leader can request forfeit' }, { status: 403 })
    }

    // Get battle
    const { data: battle } = await supabaseAdmin
      .from('pod_battles')
      .select('*')
      .eq('id', battleId)
      .eq('status', 'active')
      .maybeSingle()

    if (!battle) {
      return NextResponse.json({ error: 'Active battle not found' }, { status: 404 })
    }

    const battleData = battle as any

    // Verify pod is part of this battle
    if (battleData.challenger_pod_id !== podId && battleData.defender_pod_id !== podId) {
      return NextResponse.json({ error: 'Your pod is not part of this battle' }, { status: 403 })
    }

    // Check if forfeit already requested
    if (battleData.forfeit_requested_by_pod_id) {
      return NextResponse.json({ error: 'Forfeit already requested for this battle' }, { status: 400 })
    }

    // Request forfeit
    const { error: updateError } = await (supabaseAdmin
      .from('pod_battles') as any)
      .update({
        forfeit_requested_by_pod_id: podId,
        forfeit_status: 'requested',
      })
      .eq('id', battleId)

    if (updateError) {
      console.error('Error requesting forfeit:', updateError)
      return NextResponse.json({ error: 'Failed to request forfeit' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Request forfeit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




