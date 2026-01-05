import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already liked
    const { data: existingLikes } = await supabaseAdmin
      .from('community_likes')
      .select('id')
      .eq('user_id', affiliate.id)
      .eq('post_id', params.postId)
      .limit(1)

    const existingLike = existingLikes && existingLikes.length > 0 ? existingLikes[0] : null

    if (existingLike) {
      // Unlike
      const likeId = (existingLike as { id: string }).id
      const { error } = await supabaseAdmin
        .from('community_likes')
        .delete()
        .eq('id', likeId)

      if (error) throw error

      // Get updated count
      const { count } = await supabaseAdmin
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', params.postId)

      return NextResponse.json({ liked: false, likesCount: count || 0 })
    } else {
      // Like
      // Get post owner for notification
      const { data: post } = await (supabaseAdmin.from('community_posts') as any)
        .select('user_id')
        .eq('id', params.postId)
        .single()

      const { error } = await (supabaseAdmin.from('community_likes') as any).insert({
        user_id: affiliate.id,
        post_id: params.postId
      })

      if (error) throw error

      // Create notification
      if (post?.user_id) {
        await createNotification({
          userId: post.user_id,
          actorId: affiliate.id,
          type: 'like',
          postId: params.postId
        })
      }

      // Get updated count
      const { count } = await supabaseAdmin
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', params.postId)

      return NextResponse.json({ liked: true, likesCount: count || 0 })
    }
  } catch (error: any) {
    console.error('Error toggling like:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

