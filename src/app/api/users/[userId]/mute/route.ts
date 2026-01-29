import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin/moderator
    const isAdmin = affiliate.role === 'admin' || affiliate.role === 'moderator'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can mute users' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body // action: 'mute' or 'unmute'

    if (action !== 'mute' && action !== 'unmute') {
      return NextResponse.json({ error: 'Invalid action. Use "mute" or "unmute"' }, { status: 400 })
    }

    // Prevent muting yourself
    if (params.userId === affiliate.id) {
      return NextResponse.json({ error: 'You cannot mute yourself' }, { status: 400 })
    }

    // Get target user to check if they're an admin
    const { data: targetUser } = await (supabaseAdmin.from('affiliates') as any)
      .select('id, role')
      .eq('id', params.userId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent muting other admins (unless you're the super admin)
    if (targetUser.role === 'admin' && affiliate.role !== 'admin') {
      return NextResponse.json({ error: 'You cannot mute an admin' }, { status: 403 })
    }

    // Update mute status
    const { data: updatedUser, error } = await (supabaseAdmin.from('affiliates') as any)
      .update({ group_chat_muted: action === 'mute' })
      .eq('id', params.userId)
      .select('id, group_chat_muted')
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      user: updatedUser,
      message: action === 'mute' ? 'User muted successfully' : 'User unmuted successfully'
    })
  } catch (error: any) {
    console.error('Error muting/unmuting user:', error)
    return NextResponse.json({ error: error.message || 'Failed to mute/unmute user' }, { status: 500 })
  }
}

