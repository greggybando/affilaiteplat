import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (affiliate.role !== 'admin' && affiliate.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = (supabaseAdmin.from('affiliates') as any)
      .select('id, name, email, avatar_name, avatar_url, role, status, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,avatar_name.ilike.%${search}%`)
    }

    if (role && role !== 'All') {
      query = query.eq('role', role)
    }

    if (status && status !== 'All') {
      query = query.eq('status', status)
    }

    const { data: members, error } = await query

    if (error) throw error

    // Get post counts and report counts for each member
    const memberIds = (members as any)?.map((m: any) => m.id) || []
    
    const { data: postsData } = await (supabaseAdmin.from('community_posts') as any)
      .select('user_id')
      .in('user_id', memberIds)
      .is('deleted_at', null)

    const { data: reportsData } = await (supabaseAdmin.from('reports') as any)
      .select('post_id, reply_id')
      .in('post_id', memberIds)

    const postsByUser = {} as Record<string, number>
    postsData?.forEach((p: any) => {
      postsByUser[p.user_id] = (postsByUser[p.user_id] || 0) + 1
    })

    const formattedMembers = (members as any)?.map((member: any) => ({
      id: member.id,
      name: member.avatar_name || member.name,
      email: member.email,
      avatar: member.avatar_url,
      role: member.role || 'member',
      status: member.status || 'active',
      joinDate: member.created_at,
      postsCount: postsByUser[member.id] || 0,
      reportsCount: 0 // TODO: Calculate reports against this user
    })) || []

    return NextResponse.json({ members: formattedMembers })
  } catch (error: any) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}






