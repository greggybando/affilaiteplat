import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get active bounties for public display
export async function GET() {
  try {
    const now = new Date()

    const { data: bounties, error } = await supabaseAdmin
      .from('bounties')
      .select(`
        *,
        target_pod:pods!bounties_target_pod_id_fkey (
          id,
          name
        ),
        product:products (
          id,
          name
        ),
        claimed_by_pod:pods!bounties_claimed_by_pod_id_fkey (
          id,
          name
        )
      `)
      .eq('status', 'active')
      .gte('expires_at', now.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bounties:', error)
      return NextResponse.json({ error: 'Failed to fetch bounties' }, { status: 500 })
    }

    return NextResponse.json({ bounties: bounties || [] })
  } catch (error: any) {
    console.error('Get bounties error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




