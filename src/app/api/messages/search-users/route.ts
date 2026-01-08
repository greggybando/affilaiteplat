import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const currentUserId = session.userId

    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Search for users by name or avatar_name, excluding current user
    const { data: users, error } = await (supabaseAdmin as any)
      .from('affiliates')
      .select('id, name, avatar_name, avatar_url')
      .neq('id', currentUserId)
      .or(`name.ilike.%${query}%,avatar_name.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    // Format results to use avatar_name if available, otherwise name
    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      name: user.avatar_name || user.name,
      avatar_url: user.avatar_url
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('Error in search-users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

