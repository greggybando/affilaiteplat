import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { globalSendId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const globalSendId = params.globalSendId

    // Verify global send belongs to user
    const { data: globalSend, error: fetchError } = await supabaseAdmin
      .from('global_sends')
      .select('user_id')
      .eq('id', globalSendId)
      .single()

    if (fetchError || !globalSend) {
      return NextResponse.json({ error: 'Global send not found' }, { status: 404 })
    }

    const globalSendData = globalSend as { user_id: string }
    if (globalSendData.user_id !== affiliate.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('global_sends')
      .delete()
      .eq('id', globalSendId)

    if (error) {
      console.error('Global send deletion error:', error)
      return NextResponse.json({ error: 'Failed to delete global send' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API global-sends DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

