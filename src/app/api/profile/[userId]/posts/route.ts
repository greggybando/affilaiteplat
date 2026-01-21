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
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch user's posts
    const { data: posts, error } = await (supabaseAdmin.from('community_posts') as any)
      .select(`
        id,
        title,
        content,
        category,
        image_urls,
        created_at,
        updated_at,
        edited_at,
        likesCount:community_likes(count),
        repliesCount:community_replies(count)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Get actual counts
    const postIds = (posts || []).map((p: any) => p.id)
    
    // Get likes counts
    const { data: likesData } = await supabaseAdmin
      .from('community_likes')
      .select('post_id')
      .in('post_id', postIds)

    const likesByPost = {} as Record<string, number>
    ;(likesData || []).forEach((like: any) => {
      if (like.post_id) {
        likesByPost[like.post_id] = (likesByPost[like.post_id] || 0) + 1
      }
    })

    // Get reply counts
    const { data: repliesData } = await supabaseAdmin
      .from('community_replies')
      .select('post_id')
      .in('post_id', postIds)
      .is('deleted_at', null)

    const repliesByPost = {} as Record<string, number>
    ;(repliesData || []).forEach((reply: any) => {
      if (reply.post_id) {
        repliesByPost[reply.post_id] = (repliesByPost[reply.post_id] || 0) + 1
      }
    })

    const formattedPosts = (posts || []).map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      imageUrls: post.image_urls || [],
      createdAt: post.created_at,
      editedAt: post.edited_at,
      likesCount: likesByPost[post.id] || 0,
      repliesCount: repliesByPost[post.id] || 0
    }))

    return NextResponse.json({ posts: formattedPosts })
  } catch (error: any) {
    console.error('Error fetching user posts:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

