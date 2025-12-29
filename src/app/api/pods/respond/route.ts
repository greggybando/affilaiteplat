import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Accept or decline pod invite
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inviteId, response } = body // 'accept' or 'decline'

    if (!inviteId || !response || !['accept', 'decline'].includes(response)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Check if user is already in a pod (for accept)
    if (response === 'accept') {
      const { data: existingPod } = await supabaseAdmin
        .from('pod_members')
        .select('pod_id')
        .eq('affiliate_id', affiliate.id)
        .eq('status', 'accepted')
        .maybeSingle()

      if (existingPod) {
        return NextResponse.json({ error: 'You are already in a pod. Leave your current pod to join another.' }, { status: 400 })
      }
    }

    // Get the invite
    const { data: invite } = await supabaseAdmin
      .from('pod_members')
      .select('id, pod_id, status')
      .eq('id', inviteId)
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Update invite status
    const updateData: any = {
      status: response === 'accept' ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    }

    const { error } = await (supabaseAdmin
      .from('pod_members') as any)
      .update(updateData)
      .eq('id', inviteId)

    if (error) {
      console.error('Error responding to invite:', error)
      return NextResponse.json({ error: 'Failed to respond to invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Respond to invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

