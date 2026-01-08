import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: notifications, error } = await (supabaseAdmin.from('notifications') as any)
      .select(`
        *,
        actor:affiliates!notifications_actor_id_fkey (
          id,
          avatar_name,
          avatar_url,
          name
        ),
        post:community_posts (
          id,
          title
        ),
        reply:community_replies (
          id,
          content
        )
      `)
      .eq('user_id', affiliate.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const formatted = (notifications as any)?.map((notif: any) => ({
      id: notif.id,
      type: notif.type,
      read: notif.read,
      createdAt: notif.created_at,
      actor: {
        id: notif.actor.id,
        name: notif.actor.avatar_name || notif.actor.name,
        avatar: notif.actor.avatar_url
      },
      post: notif.post ? {
        id: notif.post.id,
        title: notif.post.title
      } : null,
      reply: notif.reply ? {
        id: notif.reply.id,
        content: notif.reply.content
      } : null
    })) || []

    // Get unread count
    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', affiliate.id)
      .eq('read', false)

    return NextResponse.json({
      notifications: formatted,
      unreadCount: unreadCount || 0
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      const { error } = await (supabaseAdmin.from('notifications') as any)
        .update({ read: true })
        .eq('user_id', affiliate.id)
        .eq('read', false)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (notificationId) {
      const { error } = await (supabaseAdmin.from('notifications') as any)
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', affiliate.id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}





