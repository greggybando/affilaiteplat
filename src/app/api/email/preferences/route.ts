import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: preferences, error } = await supabaseAdmin
      .from('email_preferences')
      .select('*')
      .eq('user_id', affiliate.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    // Return defaults if no preferences exist
    if (!preferences) {
      return NextResponse.json({
        preferences: {
          notify_replies: true,
          notify_reply_to_comment: true,
          notify_mentions: true,
          notify_likes: false,
          digest_frequency: 'weekly',
          unsubscribed: false
        }
      })
    }

    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Error fetching email preferences:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      notify_replies,
      notify_reply_to_comment,
      notify_mentions,
      notify_likes,
      digest_frequency
    } = body

    const { data, error } = await (supabaseAdmin.from('email_preferences') as any)
      .upsert({
        user_id: affiliate.id,
        notify_replies: notify_replies ?? true,
        notify_reply_to_comment: notify_reply_to_comment ?? true,
        notify_mentions: notify_mentions ?? true,
        notify_likes: notify_likes ?? false,
        digest_frequency: digest_frequency || 'weekly',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ preferences: data })
  } catch (error: any) {
    console.error('Error updating email preferences:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

