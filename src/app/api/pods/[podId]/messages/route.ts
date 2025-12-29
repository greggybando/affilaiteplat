import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> | { podId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle both Promise and direct params (for compatibility)
    const resolvedParams = 'then' in params ? await params : params
    const podId = resolvedParams.podId
    
    if (!podId) {
      return NextResponse.json({ error: 'Pod ID is required' }, { status: 400 })
    }

    // Verify user is a member of this pod
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('pod_members')
      .select('id')
      .eq('pod_id', podId)
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'accepted')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not a pod member' }, { status: 403 })
    }

    // Fetch last 100 messages
    const { data: messages, error } = await supabaseAdmin
      .from('pod_messages')
      .select(`
        id,
        message,
        created_at,
        affiliate_id,
        affiliates!inner (
          avatar_name,
          avatar_url
        )
      `)
      .eq('pod_id', podId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Format messages
    const formatted = (messages || []).map((msg: any) => {
      const affiliate = msg.affiliates as any
      return {
        id: msg.id,
        message: msg.message,
        createdAt: msg.created_at,
        affiliateId: msg.affiliate_id,
        avatarName: affiliate?.avatar_name || 'Unknown',
        avatarUrl: affiliate?.avatar_url || null,
      }
    })

    return NextResponse.json({ messages: formatted })
  } catch (error: any) {
    console.error('Messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> | { podId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle both Promise and direct params (for compatibility)
    const resolvedParams = 'then' in params ? await params : params
    const podId = resolvedParams.podId
    
    if (!podId) {
      return NextResponse.json({ error: 'Pod ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { message } = body

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 500) {
      return NextResponse.json({ error: 'Message must be 500 characters or less' }, { status: 400 })
    }

    // Verify user is a member of this pod
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('pod_members')
      .select('id')
      .eq('pod_id', podId)
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'accepted')
      .single()

    if (membershipError || !membership) {
      console.error('Membership check error:', membershipError)
      return NextResponse.json({ error: 'Not a pod member' }, { status: 403 })
    }

    // Insert message
    const { data: newMessage, error: insertError } = await supabaseAdmin
      .from('pod_messages')
      .insert({
        pod_id: podId,
        affiliate_id: affiliate.id,
        message: message.trim(),
      } as any)
      .select(`
        id,
        message,
        created_at,
        affiliate_id,
        affiliates!inner (
          avatar_name,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      console.error('Error inserting message:', insertError)
      console.error('Insert error code:', insertError.code)
      console.error('Insert error message:', insertError.message)
      console.error('Insert error details:', JSON.stringify(insertError, null, 2))
      
      // Check if table doesn't exist
      if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database table not found. Please run the pod_messages migration.',
          details: insertError.message
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to send message',
        details: insertError.message || insertError.code || 'Unknown error',
        code: insertError.code
      }, { status: 500 })
    }

    // Format response
    const msgData = newMessage as any
    const affiliateData = msgData.affiliates as any
    const formatted = {
      id: msgData.id,
      message: msgData.message,
      createdAt: msgData.created_at,
      affiliateId: msgData.affiliate_id,
      avatarName: affiliateData?.avatar_name || 'Unknown',
      avatarUrl: affiliateData?.avatar_url || null,
    }

    return NextResponse.json({ message: formatted })
  } catch (error: any) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

