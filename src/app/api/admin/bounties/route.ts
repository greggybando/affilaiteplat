import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - List all bounties
export async function GET() {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: bounties, error } = await supabaseAdmin
      .from('bounties')
      .select(`
        *,
        target_pod:pods!bounties_target_pod_id_fkey (
          id,
          name
        ),
        product:products (
          id,
          name
        ),
        claimed_by_pod:pods!bounties_claimed_by_pod_id_fkey (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bounties:', error)
      return NextResponse.json({ error: 'Failed to fetch bounties' }, { status: 500 })
    }

    return NextResponse.json({ bounties: bounties || [] })
  } catch (error: any) {
    console.error('Get bounties error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new bounty
export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { targetPodId, productId, rewardAmountCents, rewardType, description, expiresAt } = body

    if (!targetPodId || !productId || !rewardAmountCents || !rewardType || !expiresAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['cash', 'commission_boost'].includes(rewardType)) {
      return NextResponse.json({ error: 'Invalid reward type' }, { status: 400 })
    }

    const { data: bounty, error: createError } = await (supabaseAdmin
      .from('bounties') as any)
      .insert({
        target_pod_id: targetPodId,
        product_id: productId,
        reward_amount_cents: rewardAmountCents,
        reward_type: rewardType,
        description: description || null,
        expires_at: expiresAt,
        status: 'active',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating bounty:', createError)
      return NextResponse.json({ error: 'Failed to create bounty' }, { status: 500 })
    }

    return NextResponse.json({ success: true, bounty })
  } catch (error: any) {
    console.error('Create bounty error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




