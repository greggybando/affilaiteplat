import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { revokeTitle } from '@/lib/titles'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { originalBattleId } = body

    if (!originalBattleId) {
      return NextResponse.json({ error: 'Missing battle ID' }, { status: 400 })
    }

    // Get original battle
    const { data: originalBattle } = await supabaseAdmin
      .from('pod_battles')
      .select('*')
      .eq('id', originalBattleId)
      .eq('status', 'completed')
      .maybeSingle()

    if (!originalBattle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 })
    }

    const battleData = originalBattle as any

    // Verify user is loser pod leader
    const loserPodId = battleData.winner_pod_id === battleData.challenger_pod_id
      ? battleData.defender_pod_id
      : battleData.challenger_pod_id

    const { data: loserPod } = await supabaseAdmin
      .from('pods')
      .select('created_by')
      .eq('id', loserPodId)
      .maybeSingle()

    if (!loserPod || (loserPod as any).created_by !== affiliate.id) {
      return NextResponse.json({ error: 'Only losing pod leader can request rematch' }, { status: 403 })
    }

    // Check if rematch already exists
    const { data: existingRematch } = await supabaseAdmin
      .from('pod_battles')
      .select('id')
      .eq('original_battle_id', originalBattleId)
      .in('status', ['pending', 'active'])
      .maybeSingle()

    if (existingRematch) {
      return NextResponse.json({ error: 'Rematch already requested' }, { status: 400 })
    }

    // Create rematch challenge (same parameters as original)
    const { data: rematch, error: createError } = await (supabaseAdmin
      .from('pod_battles') as any)
      .insert({
        challenger_pod_id: loserPodId, // Loser becomes challenger
        defender_pod_id: battleData.winner_pod_id,
        product_id: battleData.product_id,
        duration_days: battleData.duration_days,
        prize_type: battleData.prize_type,
        is_rematch: true,
        original_battle_id: originalBattleId,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating rematch:', createError)
      return NextResponse.json({ error: 'Failed to create rematch' }, { status: 500 })
    }

    return NextResponse.json({ success: true, battle: rematch })
  } catch (error: any) {
    console.error('Rematch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle rematch response - if declined/ignored, revoke Undefeated title
export async function PUT(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { battleId, response } = body // 'accept' or 'decline'

    if (!battleId || !response) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get rematch battle
    const { data: battle } = await supabaseAdmin
      .from('pod_battles')
      .select('*')
      .eq('id', battleId)
      .eq('is_rematch', true)
      .maybeSingle()

    if (!battle) {
      return NextResponse.json({ error: 'Rematch not found' }, { status: 404 })
    }

    const battleData = battle as any

    // If declined or ignored (48 hours passed), revoke Undefeated title from defender
    if (response === 'decline' || (response === 'timeout' && battleData.status === 'pending')) {
      const { data: defenderPod } = await supabaseAdmin
        .from('pods')
        .select('created_by')
        .eq('id', battleData.defender_pod_id)
        .maybeSingle()

      if (defenderPod) {
        await revokeTitle((defenderPod as any).created_by, 'undefeated', supabaseAdmin)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Rematch response error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




