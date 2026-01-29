import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { invalidateAuthCache } from '@/lib/auth'

export async function POST(
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
      return NextResponse.json({ error: 'Only admins can ban users' }, { status: 403 })
    }

    const body = await request.json()
    const { action, reason } = body // action: 'ban' or 'unban'

    if (action !== 'ban' && action !== 'unban') {
      return NextResponse.json({ error: 'Invalid action. Use "ban" or "unban"' }, { status: 400 })
    }

    // Prevent banning yourself
    if (params.userId === affiliate.id) {
      return NextResponse.json({ error: 'You cannot ban yourself' }, { status: 400 })
    }

    // Get target user to check if they're an admin
    const { data: targetUser } = await (supabaseAdmin.from('affiliates') as any)
      .select('id, role, email')
      .eq('id', params.userId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent banning other admins (unless you're the super admin)
    if (targetUser.role === 'admin' && affiliate.role !== 'admin') {
      return NextResponse.json({ error: 'You cannot ban an admin' }, { status: 403 })
    }

    // Build update object
    const updateData: any = {}

    if (action === 'ban') {
      updateData.banned = true
      updateData.banned_at = new Date().toISOString()
      updateData.banned_by = affiliate.id
      updateData.ban_reason = reason || null
    } else if (action === 'unban') {
      updateData.banned = false
      updateData.banned_at = null
      updateData.banned_by = null
      updateData.ban_reason = null
    }

    // Update user
    const { data: updatedUser, error } = await (supabaseAdmin.from('affiliates') as any)
      .update(updateData)
      .eq('id', params.userId)
      .select('id, email, name, banned, banned_at, banned_by, ban_reason')
      .single()

    if (error) throw error

    // Invalidate auth cache for banned user
    invalidateAuthCache(params.userId)

    // Log admin action
    await (supabaseAdmin.from('admin_logs') as any).insert({
      admin_id: affiliate.id,
      action: action,
      target_type: 'user',
      target_id: params.userId,
      details: { 
        target_email: targetUser.email,
        reason: reason || null
      }
    })

    return NextResponse.json({ 
      success: true,
      user: updatedUser,
      message: action === 'ban' ? 'User banned successfully' : 'User unbanned successfully'
    })
  } catch (error: any) {
    console.error('Error banning/unbanning user:', error)
    return NextResponse.json({ error: error.message || 'Failed to ban/unban user' }, { status: 500 })
  }
}

