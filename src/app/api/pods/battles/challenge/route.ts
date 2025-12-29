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
    const { defenderPodId, productId, durationDays, prizeType, trashTalk, originalBattleId } = body

    if (!defenderPodId || !productId || !durationDays || !prizeType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (![7, 14, 30, 60].includes(durationDays)) {
      return NextResponse.json({ error: 'Duration must be 7, 14, 30, or 60 days' }, { status: 400 })
    }

    if (!['bragging_rights', 'commission_boost', 'member_steal'].includes(prizeType)) {
      return NextResponse.json({ error: 'Invalid prize type' }, { status: 400 })
    }

    // Get challenger's pod
    const { data: challengerPodMember } = await supabaseAdmin
      .from('pod_members')
      .select('pod_id')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!challengerPodMember) {
      return NextResponse.json({ error: 'You must be in a pod to challenge' }, { status: 400 })
    }

    const challengerPodId = (challengerPodMember as any).pod_id

    if (challengerPodId === defenderPodId) {
      return NextResponse.json({ error: 'Cannot challenge your own pod' }, { status: 400 })
    }

    // Check max 3 pending outgoing challenges
    const { data: pendingChallenges, error: countError } = await supabaseAdmin
      .from('pod_battles')
      .select('id')
      .eq('challenger_pod_id', challengerPodId)
      .eq('status', 'pending')

    if (countError) {
      console.error('Error checking pending challenges:', countError)
      return NextResponse.json({ error: 'Failed to check pending challenges' }, { status: 500 })
    }

    if ((pendingChallenges || []).length >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 pending challenges allowed. Please wait for responses.' },
        { status: 400 }
      )
    }

    // Create challenge
    const { data: battle, error: createError } = await (supabaseAdmin
      .from('pod_battles') as any)
      .insert({
        challenger_pod_id: challengerPodId,
        defender_pod_id: defenderPodId,
        product_id: productId,
        duration_days: durationDays,
        prize_type: prizeType,
        trash_talk_message: trashTalk || null,
        is_rematch: !!originalBattleId,
        original_battle_id: originalBattleId || null,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating battle:', createError)
      return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
    }

    return NextResponse.json({ success: true, battle })
  } catch (error: any) {
    console.error('Challenge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

