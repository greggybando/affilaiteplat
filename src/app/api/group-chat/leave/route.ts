import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Leave the chat
    const { error } = await (supabaseAdmin
      .from('group_chat_participants') as any)
      .delete()
      .eq('affiliate_id', affiliate.id)

    if (error) {
      console.error('Error leaving group chat:', error)
      return NextResponse.json({ error: 'Failed to leave chat' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API group chat leave error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






