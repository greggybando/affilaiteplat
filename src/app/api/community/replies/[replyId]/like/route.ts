import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { replyId: string } }
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
      .eq('reply_id', params.replyId)
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

      const { count } = await supabaseAdmin
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .eq('reply_id', params.replyId)

      return NextResponse.json({ liked: false, likesCount: count || 0 })
    } else {
      // Like
      const { error } = await (supabaseAdmin.from('community_likes') as any).insert({
        user_id: affiliate.id,
        reply_id: params.replyId
      })

      if (error) throw error

      const { count } = await supabaseAdmin
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .eq('reply_id', params.replyId)

      return NextResponse.json({ liked: true, likesCount: count || 0 })
    }
  } catch (error: any) {
    console.error('Error toggling like:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

