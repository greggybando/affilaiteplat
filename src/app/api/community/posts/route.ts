import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const excludeCategories = searchParams.get('excludeCategories')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = (supabaseAdmin.from('community_posts') as any)
      .select(`
        id,
        user_id,
        title,
        content,
        category,
        image_urls,
        pinned,
        pinned_at,
        created_at,
        updated_at,
        edited_at,
        deleted_at,
        locked,
        hidden,
        user:affiliates!community_posts_user_id_fkey (
          id,
          avatar_name,
          avatar_url,
          name,
          role
        )
      `)
      .is('deleted_at', null)
      .eq('hidden', false)
      .order('pinned', { ascending: false })
      .order('pinned_at', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category && category !== 'Home' && category !== 'All') {
      query = query.eq('category', category)
    }

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%`)
    }

    const { data: posts, error } = await query

    if (error) throw error

    // Filter out excluded categories after fetching (used for "Home" feed)
    let filteredPosts = posts as any[]
    if (excludeCategories) {
      const excludeList = excludeCategories.split(',').map(c => c.trim())
      filteredPosts = (posts as any[]).filter((post: any) => !excludeList.includes(post.category))
    }

    // Get like status and counts for current user
    const postIds = filteredPosts?.map((p: any) => p.id) || []
    const { data: userLikes } = await supabaseAdmin
      .from('community_likes')
      .select('post_id')
      .eq('user_id', affiliate.id)
      .in('post_id', postIds)

    const likedPostIds = new Set((userLikes as any)?.map((l: any) => l.post_id) || [])

    // Get likes counts
    const { data: likesData } = await supabaseAdmin
      .from('community_likes')
      .select('post_id')
      .in('post_id', postIds)

    const likesByPost = {} as Record<string, number>
    (likesData as any)?.forEach((like: any) => {
      if (like.post_id) {
        likesByPost[like.post_id] = (likesByPost[like.post_id] || 0) + 1
      }
    })

    // Get reply counts and last reply info
    const { data: repliesData } = await supabaseAdmin
      .from('community_replies')
      .select('post_id, created_at, user:affiliates!community_replies_user_id_fkey(avatar_url, avatar_name)')
      .in('post_id', postIds)
      .order('created_at', { ascending: false })

    const repliesByPost = {} as Record<string, any[]>
    const replyCountsByPost = {} as Record<string, number>
    (repliesData as any)?.forEach((reply: any) => {
      replyCountsByPost[reply.post_id] = (replyCountsByPost[reply.post_id] || 0) + 1
      if (!repliesByPost[reply.post_id]) {
        repliesByPost[reply.post_id] = []
      }
      repliesByPost[reply.post_id].push(reply)
    })

    const formattedPosts = filteredPosts?.map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      imageUrls: post.image_urls || [],
      videoUrl: (post as any).video_url || null,
      pinned: post.pinned,
      createdAt: post.created_at,
      user: {
        id: post.user.id,
        name: post.user.avatar_name || post.user.name,
        avatar: post.user.avatar_url,
        role: post.user.role || null
      },
      likesCount: likesByPost[post.id] || 0,
      repliesCount: replyCountsByPost[post.id] || 0,
      isLiked: likedPostIds.has(post.id),
      lastReply: repliesByPost[post.id]?.[0] ? {
        date: repliesByPost[post.id][0].created_at,
        user: {
          avatar: repliesByPost[post.id][0].user?.avatar_url,
          name: repliesByPost[post.id][0].user?.avatar_name
        }
      } : null
    })) || []

    return NextResponse.json({ posts: formattedPosts })
  } catch (error: any) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, category, imageUrls, videoUrl } = body

    // Strip HTML tags to check for actual text content
    const stripHtml = (html: string) => {
      if (!html) return ''
      return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    }
    
    const textContent = stripHtml(content || '')

    // Title is optional - auto-generate from first line of content if not provided
    const autoTitle = title?.trim() || textContent?.split('\n')[0]?.substring(0, 100)?.trim() || 'Untitled Post'

    if (!textContent && (!imageUrls || imageUrls.length === 0) && !videoUrl) {
      return NextResponse.json({ error: 'Content, images, or video is required' }, { status: 400 })
    }

    if (textContent && textContent.length > 2000) {
      return NextResponse.json({ error: 'Content must be 2000 characters or less' }, { status: 400 })
    }

    if (imageUrls && imageUrls.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 images allowed' }, { status: 400 })
    }

    const insertData: any = {
      user_id: affiliate.id,
      title: autoTitle,
      content: content || '',
      category: category || 'Discussion',
      image_urls: imageUrls || []
    }
    
    // Only include video_url if the column exists (will be handled by migration)
    if (videoUrl) {
      insertData.video_url = videoUrl
    }

    const { data: post, error } = await (supabaseAdmin.from('community_posts') as any).insert(insertData)
      .select(`
        id,
        user_id,
        title,
        content,
        category,
        image_urls,
        pinned,
        pinned_at,
        created_at,
        updated_at,
        edited_at,
        deleted_at,
        locked,
        hidden,
        user:affiliates!community_posts_user_id_fkey (
          id,
          avatar_name,
          avatar_url,
          name,
          role
        )
      `)
      .single()

    if (error) throw error

    const formattedPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      imageUrls: post.image_urls || [],
      videoUrl: (post as any).video_url || null,
      pinned: post.pinned,
      createdAt: post.created_at,
      user: {
        id: post.user.id,
        name: post.user.avatar_name || post.user.name,
        avatar: post.user.avatar_url
      },
      likesCount: 0,
      repliesCount: 0,
      isLiked: false,
      lastReply: null
    }

    return NextResponse.json({ post: formattedPost }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

