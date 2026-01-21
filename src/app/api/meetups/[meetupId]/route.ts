import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { meetupId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meetupId = params.meetupId

    // Verify meetup belongs to user
    const { data: meetup, error: fetchError } = await supabaseAdmin
      .from('meetups')
      .select('user_id')
      .eq('id', meetupId)
      .single()

    if (fetchError || !meetup) {
      return NextResponse.json({ error: 'Meetup not found' }, { status: 404 })
    }

    const meetupData = meetup as { user_id: string }
    if (meetupData.user_id !== affiliate.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('meetups')
      .delete()
      .eq('id', meetupId)

    if (error) {
      console.error('Meetup deletion error:', error)
      return NextResponse.json({ error: 'Failed to delete meetup' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API meetups DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

