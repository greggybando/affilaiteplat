import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: post, error } = await (supabaseAdmin.from('community_posts') as any)
      .select(`
        *,
        user:affiliates!community_posts_user_id_fkey (
          id,
          avatar_name,
          avatar_url,
          name
        )
      `)
      .eq('id', params.postId)
      .single()

    if (error) throw error
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Get like status
    const { data: likes } = await supabaseAdmin
      .from('community_likes')
      .select('id')
      .eq('user_id', affiliate.id)
      .eq('post_id', params.postId)
      .limit(1)

    const like = likes && likes.length > 0 ? likes[0] : null

    // Get likes count
    const { count: likesCount } = await supabaseAdmin
      .from('community_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', params.postId)

    const formattedPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      imageUrls: post.image_urls || [],
      pinned: post.pinned,
      createdAt: post.created_at,
      user: {
        id: post.user.id,
        name: post.user.avatar_name || post.user.name,
        avatar: post.user.avatar_url
      },
      likesCount: likesCount || 0,
      isLiked: !!like
    }

    return NextResponse.json({ post: formattedPost })
  } catch (error: any) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

