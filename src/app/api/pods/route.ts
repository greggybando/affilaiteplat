import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get user's pod and pending invites
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current pod membership (accepted status)
    const { data: currentPodMember } = await supabaseAdmin
      .from('pod_members')
      .select(`
        id,
        pod_id,
        status,
        pod:pods (
          id,
          name,
          created_by,
          created_at,
          created_by_affiliate:affiliates!pods_created_by_fkey (
            id,
            name,
            avatar_name
          )
        )
      `)
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'accepted')
      .maybeSingle()

    // Get pending invites
    const { data: pendingInvites } = await supabaseAdmin
      .from('pod_members')
      .select(`
        id,
        pod_id,
        invited_at,
        pod:pods (
          id,
          name,
          created_by,
          created_at,
          created_by_affiliate:affiliates!pods_created_by_fkey (
            id,
            name,
            avatar_name
          )
        )
      `)
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'pending')

    // If in a pod, get all members
    let podMembers: any[] = []
    if (currentPodMember) {
      const { data: members } = await supabaseAdmin
        .from('pod_members')
        .select(`
          id,
          affiliate_id,
          status,
          invited_at,
          responded_at,
          affiliate:affiliates (
            id,
            name,
            email,
            avatar_name,
            avatar_url
          )
        `)
        .eq('pod_id', (currentPodMember as any).pod_id)
        .eq('status', 'accepted')

      podMembers = members || []
    }

    return NextResponse.json({
      currentPod: currentPodMember ? {
        id: (currentPodMember as any).pod.id,
        name: (currentPodMember as any).pod.name,
        createdBy: (currentPodMember as any).pod.created_by_affiliate,
        createdAt: (currentPodMember as any).pod.created_at,
        members: podMembers.map((m: any) => ({
          id: m.affiliate.id,
          name: m.affiliate.name,
          avatarName: m.affiliate.avatar_name || m.affiliate.name,
          avatarUrl: m.affiliate.avatar_url,
        })),
      } : null,
      pendingInvites: (pendingInvites || []).map((invite: any) => ({
        id: invite.id,
        podId: invite.pod_id,
        podName: invite.pod.name,
        createdBy: invite.pod.created_by_affiliate,
        invitedAt: invite.invited_at,
      })),
    })
  } catch (error: any) {
    console.error('Get pods error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create pod
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, memberIds } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Pod name is required' }, { status: 400 })
    }

    // Check if user is already in a pod
    const { data: existingPod } = await supabaseAdmin
      .from('pod_members')
      .select('pod_id')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (existingPod) {
      return NextResponse.json({ error: 'You are already in a pod. Leave your current pod to create a new one.' }, { status: 400 })
    }

    // Create pod
    const { data: pod, error: podError } = await (supabaseAdmin
      .from('pods') as any)
      .insert({
        name: name.trim(),
        created_by: affiliate.id,
      })
      .select()
      .single()

    if (podError) {
      console.error('Error creating pod:', podError)
      return NextResponse.json({ error: 'Failed to create pod' }, { status: 500 })
    }

    // Add creator as accepted member
    await (supabaseAdmin
      .from('pod_members') as any)
      .insert({
        pod_id: pod.id,
        affiliate_id: affiliate.id,
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })

    // Add invited members as pending
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const invites = memberIds.map((memberId: string) => ({
        pod_id: pod.id,
        affiliate_id: memberId,
        status: 'pending',
      }))

      await (supabaseAdmin
        .from('pod_members') as any)
        .insert(invites)
    }

    return NextResponse.json({ success: true, pod })
  } catch (error: any) {
    console.error('Create pod error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

