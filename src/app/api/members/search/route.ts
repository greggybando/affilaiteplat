import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Search members by name or email (used for DM search)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ members: [] })
    }

    // Basic sanitization to avoid wildcards misuse
    const term = q.replace(/[%_]/g, '').toLowerCase()

    const { data, error } = await (supabaseAdmin as any)
      .from('affiliates')
      .select('id, name, email, avatar_name, avatar_url')
      .or(`name.ilike.%${term}%,avatar_name.ilike.%${term}%,email.ilike.%${term}%`)
      .order('name', { ascending: true })
      .limit(15)

    if (error) {
      console.error('Member search error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Map to lightweight member objects
    const members = (data || []).map((m: any) => ({
      id: m.id,
      name: m.avatar_name || m.name || 'Unknown',
      avatar: m.avatar_url,
      email: m.email || ''
    }))

    return NextResponse.json({ members })
  } catch (error: any) {
    console.error('Member search exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



