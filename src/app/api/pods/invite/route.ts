import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Invite affiliate to pod
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { podId, affiliateId } = body

    if (!podId || !affiliateId) {
      return NextResponse.json({ error: 'podId and affiliateId are required' }, { status: 400 })
    }

    // Verify user is in the pod
    const { data: membership } = await supabaseAdmin
      .from('pod_members')
      .select('pod_id')
      .eq('pod_id', podId)
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this pod' }, { status: 403 })
    }

    // Check if already invited or member
    const { data: existing } = await supabaseAdmin
      .from('pod_members')
      .select('id, status')
      .eq('pod_id', podId)
      .eq('affiliate_id', affiliateId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Affiliate is already invited or a member' }, { status: 400 })
    }

    // Send invite
    const { error } = await (supabaseAdmin
      .from('pod_members') as any)
      .insert({
        pod_id: podId,
        affiliate_id: affiliateId,
        status: 'pending',
      })

    if (error) {
      console.error('Error sending invite:', error)
      return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

