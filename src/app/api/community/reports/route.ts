import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { postId, replyId, reason, details } = body

    if (!postId && !replyId) {
      return NextResponse.json({ error: 'Post or reply ID required' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ error: 'Reason required' }, { status: 400 })
    }

    // Check if already reported by this user
    const { data: existing } = await (supabaseAdmin.from('reports') as any)
      .select('id')
      .eq('reporter_id', affiliate.id)
      .eq('post_id', postId || null)
      .eq('reply_id', replyId || null)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already reported' }, { status: 400 })
    }

    const { data: report, error } = await (supabaseAdmin.from('reports') as any).insert({
      reporter_id: affiliate.id,
      post_id: postId || null,
      reply_id: replyId || null,
      reason,
      details: details || null,
      status: 'pending'
    })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ report }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating report:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin/moderator
    if (affiliate.role !== 'admin' && affiliate.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = (supabaseAdmin.from('reports') as any)
      .select(`
        *,
        reporter:affiliates!reports_reporter_id_fkey (
          id,
          avatar_name,
          avatar_url,
          name
        ),
        post:community_posts (
          id,
          title,
          content,
          user_id
        ),
        reply:community_replies (
          id,
          content,
          user_id
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'All') {
      query = query.eq('status', status)
    }

    const { data: reports, error } = await query

    if (error) throw error

    return NextResponse.json({ reports: reports || [] })
  } catch (error: any) {
    console.error('Error fetching reports:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}




