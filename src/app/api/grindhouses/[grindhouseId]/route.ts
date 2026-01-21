import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { grindhouseId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const grindhouseId = params.grindhouseId

    // Verify grindhouse belongs to user
    const { data: grindhouse, error: fetchError } = await supabaseAdmin
      .from('grindhouses')
      .select('user_id')
      .eq('id', grindhouseId)
      .single()

    if (fetchError || !grindhouse) {
      return NextResponse.json({ error: 'Grindhouse not found' }, { status: 404 })
    }

    const grindhouseData = grindhouse as { user_id: string }
    if (grindhouseData.user_id !== affiliate.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('grindhouses')
      .delete()
      .eq('id', grindhouseId)

    if (error) {
      console.error('Grindhouse deletion error:', error)
      return NextResponse.json({ error: 'Failed to delete grindhouse' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API grindhouses DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

