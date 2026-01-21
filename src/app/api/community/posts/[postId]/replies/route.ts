import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: replies, error } = await (supabaseAdmin.from('community_replies') as any)
      .select(`
        *,
        user:affiliates!community_replies_user_id_fkey (
          id,
          avatar_name,
          avatar_url,
          name,
          role
        )
      `)
      .eq('post_id', params.postId)
      .is('parent_reply_id', null)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Get nested replies (max 2 levels)
    const topLevelIds = (replies as any)?.map((r: any) => r.id) || []
    const { data: nestedReplies } = topLevelIds.length > 0 ? await (supabaseAdmin.from('community_replies') as any)
      .select(`
        *,
        user:affiliates!community_replies_user_id_fkey (
          id,
          avatar_name,
          avatar_url,
          name,
          role
        )
      `)
      .in('parent_reply_id', topLevelIds)
      .order('created_at', { ascending: true }) : { data: [] }

    // Get like status for current user
    const allReplyIds = [
      ...((replies as any)?.map((r: any) => r.id) || []),
      ...((nestedReplies as any)?.map((r: any) => r.id) || [])
    ]
    const { data: userLikes } = allReplyIds.length > 0 ? await supabaseAdmin
      .from('community_likes')
      .select('reply_id')
      .eq('user_id', affiliate.id)
      .in('reply_id', allReplyIds) : { data: [] }

    const likedReplyIds = new Set(userLikes?.map((l: any) => l.reply_id) || [])

    // Get likes counts
    const { data: likesData } = allReplyIds.length > 0 ? await supabaseAdmin
      .from('community_likes')
      .select('reply_id')
      .in('reply_id', allReplyIds) : { data: [] }

    const likesByReply = {} as Record<string, number>
    (likesData as any)?.forEach((like: any) => {
      if (like.reply_id) {
        likesByReply[like.reply_id] = (likesByReply[like.reply_id] || 0) + 1
      }
    })

    // Build nested structure
    const nestedMap = {} as Record<string, any[]>
    (nestedReplies as any)?.forEach((reply: any) => {
      if (!nestedMap[reply.parent_reply_id]) {
        nestedMap[reply.parent_reply_id] = []
      }
      nestedMap[reply.parent_reply_id].push({
        id: reply.id,
        content: reply.content,
        imageUrl: reply.image_url,
        createdAt: reply.created_at,
        user: {
          id: reply.user.id,
          name: reply.user.avatar_name || reply.user.name,
          avatar: reply.user.avatar_url,
          role: reply.user.role
        },
        likesCount: likesByReply[reply.id] || 0,
        isLiked: likedReplyIds.has(reply.id)
      })
    })

    const formattedReplies = (replies as any)?.map((reply: any) => ({
      id: reply.id,
      content: reply.content,
      imageUrl: reply.image_url,
      createdAt: reply.created_at,
      user: {
        id: reply.user.id,
        name: reply.user.avatar_name || reply.user.name,
        avatar: reply.user.avatar_url
      },
      likesCount: likesByReply[reply.id] || 0,
      isLiked: likedReplyIds.has(reply.id),
      replies: nestedMap[reply.id] || []
    })) || []

    return NextResponse.json({ replies: formattedReplies })
  } catch (error: any) {
    console.error('Error fetching replies:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, parentReplyId, imageUrl } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Content must be 500 characters or less' }, { status: 400 })
    }

    const { data: reply, error } = await (supabaseAdmin.from('community_replies') as any).insert({
      post_id: params.postId,
      user_id: affiliate.id,
      content,
      parent_reply_id: parentReplyId || null,
      image_url: imageUrl || null
    })
      .select(`
        *,
        user:affiliates!community_replies_user_id_fkey (
          id,
          avatar_name,
          avatar_url,
          name,
          role
        )
      `)
      .single()

    if (error) throw error

    // Get post owner for notification
    const { data: post } = await (supabaseAdmin.from('community_posts') as any)
      .select('user_id')
      .eq('id', params.postId)
      .single()

    // Create notification for post owner
    if (post?.user_id && post.user_id !== affiliate.id) {
      await createNotification({
        userId: post.user_id,
        actorId: affiliate.id,
        type: parentReplyId ? 'reply_to_comment' : 'reply',
        postId: params.postId,
        replyId: reply.id
      })

      // Send email notification
      if (process.env.RESEND_API_KEY) {
        const { data: postData } = await (supabaseAdmin.from('community_posts') as any)
          .select('title')
          .eq('id', params.postId)
          .single()

        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: post.user_id,
            type: parentReplyId ? 'reply_to_comment' : 'reply',
            actorName: reply.user.avatar_name || reply.user.name,
            postTitle: postData?.title || 'your post',
            replyContent: reply.content,
            postId: params.postId
          })
        }).catch(err => console.error('Error sending email:', err))
      }
    }

    // If replying to a reply, notify the parent reply owner
    if (parentReplyId) {
      const { data: parentReply } = await (supabaseAdmin.from('community_replies') as any)
        .select('user_id')
        .eq('id', parentReplyId)
        .single()

      if (parentReply?.user_id && parentReply.user_id !== affiliate.id) {
        await createNotification({
          userId: parentReply.user_id,
          actorId: affiliate.id,
          type: 'reply_to_comment',
          postId: params.postId,
          replyId: reply.id
        })

        // Send email notification
        if (process.env.RESEND_API_KEY) {
          const { data: postData } = await (supabaseAdmin.from('community_posts') as any)
            .select('title')
            .eq('id', params.postId)
            .single()

          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: parentReply.user_id,
              type: 'reply_to_comment',
              actorName: reply.user.avatar_name || reply.user.name,
              postTitle: postData?.title || 'your post',
              replyContent: reply.content,
              postId: params.postId
            })
          }).catch(err => console.error('Error sending email:', err))
        }
      }
    }

    // Check for mentions (@username)
    const mentionRegex = /@(\w+)/g
    const mentions = reply.content.match(mentionRegex)
    if (mentions) {
      // Find mentioned users and create notifications
      for (const mention of mentions) {
        const username = mention.substring(1)
        const { data: mentionedUser } = await (supabaseAdmin.from('affiliates') as any)
          .select('id')
          .or(`avatar_name.ilike.%${username}%,name.ilike.%${username}%`)
          .limit(1)
          .single()

        if (mentionedUser?.id && mentionedUser.id !== affiliate.id) {
          await createNotification({
            userId: mentionedUser.id,
            actorId: affiliate.id,
            type: 'mention',
            postId: params.postId,
            replyId: reply.id
          })

          // Send email notification
          if (process.env.RESEND_API_KEY) {
            const { data: postData } = await (supabaseAdmin.from('community_posts') as any)
              .select('title')
              .eq('id', params.postId)
              .single()

            fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: mentionedUser.id,
                type: 'mention',
                actorName: reply.user.avatar_name || reply.user.name,
                postTitle: postData?.title || 'a post',
                replyContent: reply.content,
                postId: params.postId
              })
            }).catch(err => console.error('Error sending email:', err))
          }
        }
      }
    }

    const formattedReply = {
      id: reply.id,
      content: reply.content,
      imageUrl: reply.image_url,
      createdAt: reply.created_at,
      user: {
        id: reply.user.id,
        name: reply.user.avatar_name || reply.user.name,
        avatar: reply.user.avatar_url
      },
      likesCount: 0,
      isLiked: false,
      replies: []
    }

    return NextResponse.json({ reply: formattedReply }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating reply:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

