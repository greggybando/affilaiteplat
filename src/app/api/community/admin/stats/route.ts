import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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

    // Get total members
    const { count: totalMembers } = await supabaseAdmin
      .from('affiliates')
      .select('*', { count: 'exact', head: true })

    // Get new members this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { count: newMembers } = await supabaseAdmin
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString())

    // Get total posts
    const { count: totalPosts } = await supabaseAdmin
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    // Get new posts this week
    const { count: newPosts } = await supabaseAdmin
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', weekAgo.toISOString())

    // Get pending reports
    const { count: pendingReports } = await supabaseAdmin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Get engagement rate (likes + replies / posts)
    const { count: totalLikes } = await supabaseAdmin
      .from('community_likes')
      .select('*', { count: 'exact', head: true })

    const { count: totalReplies } = await supabaseAdmin
      .from('community_replies')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    const engagementRate = totalPosts && totalPosts > 0
      ? Math.round(((totalLikes || 0) + (totalReplies || 0)) / totalPosts * 100) / 100
      : 0

    return NextResponse.json({
      stats: {
        totalMembers: totalMembers || 0,
        newMembers: newMembers || 0,
        totalPosts: totalPosts || 0,
        newPosts: newPosts || 0,
        pendingReports: pendingReports || 0,
        engagementRate
      }
    })
  } catch (error: any) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}





