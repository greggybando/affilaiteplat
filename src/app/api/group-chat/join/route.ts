import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already joined
    const { data: existing } = await supabaseAdmin
      .from('group_chat_participants')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already joined' })
    }

    // Join the chat
    const { error } = await (supabaseAdmin
      .from('group_chat_participants') as any)
      .insert({
        affiliate_id: affiliate.id,
        joined_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error joining group chat:', error)
      return NextResponse.json({ error: 'Failed to join chat' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API group chat join error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

