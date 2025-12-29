import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Search affiliates by avatar name
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (!query || query.length < 2) {
      return NextResponse.json({ affiliates: [] })
    }

    // Search by avatar_name or name
    const { data: affiliates, error } = await supabaseAdmin
      .from('affiliates')
      .select('id, name, email, avatar_name, avatar_url')
      .or(`avatar_name.ilike.%${query}%,name.ilike.%${query}%`)
      .neq('id', affiliate.id) // Exclude self
      .limit(20)

    if (error) {
      console.error('Error searching affiliates:', error)
      return NextResponse.json({ error: 'Failed to search affiliates' }, { status: 500 })
    }

    return NextResponse.json({
      affiliates: (affiliates || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        avatarName: a.avatar_name || a.name,
        avatarUrl: a.avatar_url,
      })),
    })
  } catch (error: any) {
    console.error('Search affiliates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




