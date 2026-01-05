import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...updates } = body

    // Get post to check ownership/permissions
    const { data: post } = await (supabaseAdmin.from('community_posts') as any)
      .select('user_id')
      .eq('id', params.postId)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if user is admin/moderator
    const isAdmin = affiliate.role === 'admin' || affiliate.role === 'moderator'
    const isOwner = post.user_id === affiliate.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update object
    const updateData: any = {}

    if (action === 'edit') {
      if (!isOwner) {
        return NextResponse.json({ error: 'Only post owner can edit' }, { status: 403 })
      }
      if (updates.title) updateData.title = updates.title
      if (updates.content) updateData.content = updates.content
      if (updates.category) updateData.category = updates.category
      if (updates.imageUrls) updateData.image_urls = updates.imageUrls
      updateData.edited_at = new Date().toISOString()
    } else if (action === 'delete') {
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      updateData.deleted_at = new Date().toISOString()
    } else if (action === 'pin') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can pin posts' }, { status: 403 })
      }
      updateData.pinned = true
      updateData.pinned_at = new Date().toISOString()
    } else if (action === 'unpin') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can unpin posts' }, { status: 403 })
      }
      updateData.pinned = false
      updateData.pinned_at = null
    } else if (action === 'lock') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can lock posts' }, { status: 403 })
      }
      updateData.locked = true
    } else if (action === 'unlock') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can unlock posts' }, { status: 403 })
      }
      updateData.locked = false
    } else if (action === 'hide') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can hide posts' }, { status: 403 })
      }
      updateData.hidden = true
    } else if (action === 'unhide') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can unhide posts' }, { status: 403 })
      }
      updateData.hidden = false
    }

    const { data: updatedPost, error } = await (supabaseAdmin.from('community_posts') as any)
      .update(updateData)
      .eq('id', params.postId)
      .select()
      .single()

    if (error) throw error

    // Log admin action
    if (isAdmin && action !== 'edit') {
      await (supabaseAdmin.from('admin_logs') as any).insert({
        admin_id: affiliate.id,
        action: action,
        target_type: 'post',
        target_id: params.postId,
        details: { ...updates }
      })
    }

    return NextResponse.json({ post: updatedPost })
  } catch (error: any) {
    console.error('Error moderating post:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}




