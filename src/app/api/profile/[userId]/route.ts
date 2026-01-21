import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await getCurrentAffiliate()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.userId

    // Fetch user profile
    const { data: user, error: userError } = await supabaseAdmin
      .from('affiliates')
      .select('id, name, avatar_name, avatar_url, bio, created_at, last_active_at, updated_at')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate stats
    // Posts count
    const { count: postsCount } = await supabaseAdmin
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)

    // Comments count
    const { count: commentsCount } = await supabaseAdmin
      .from('community_replies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)

    // Likes received (on posts and replies)
    const { data: userPosts } = await supabaseAdmin
      .from('community_posts')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)

    const { data: userReplies } = await supabaseAdmin
      .from('community_replies')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)

    const postIds = (userPosts || []).map((p: any) => p.id)
    const replyIds = (userReplies || []).map((r: any) => r.id)

    let likesReceived = 0
    if (postIds.length > 0) {
      const { count: postLikes } = await supabaseAdmin
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds)
      likesReceived += postLikes || 0
    }
    if (replyIds.length > 0) {
      const { count: replyLikes } = await supabaseAdmin
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .in('reply_id', replyIds)
      likesReceived += replyLikes || 0
    }

    return NextResponse.json({
      id: user.id,
      name: user.avatar_name || user.name,
      avatar: user.avatar_url,
      bio: user.bio || null,
      memberSince: user.created_at,
      lastActiveAt: user.last_active_at || user.updated_at,
      stats: {
        postsCount: postsCount || 0,
        commentsCount: commentsCount || 0,
        likesReceived
      }
    })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

