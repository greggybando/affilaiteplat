import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Leave pod
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { podId } = body

    if (!podId) {
      return NextResponse.json({ error: 'podId is required' }, { status: 400 })
    }

    // Remove membership
    const { error } = await (supabaseAdmin
      .from('pod_members') as any)
      .delete()
      .eq('pod_id', podId)
      .eq('affiliate_id', affiliate.id)

    if (error) {
      console.error('Error leaving pod:', error)
      return NextResponse.json({ error: 'Failed to leave pod' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Leave pod error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

