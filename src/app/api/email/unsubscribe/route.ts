import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, resubscribe } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Find user by unsubscribe token
    const { data: preferences, error: findError } = await (supabaseAdmin.from('email_preferences') as any)
      .select('user_id, unsubscribed')
      .eq('unsubscribe_token', token)
      .single()

    if (findError || !preferences) {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 400 })
    }

    if (resubscribe) {
      // Resubscribe
      await (supabaseAdmin.from('email_preferences') as any)
        .update({ unsubscribed: false })
        .eq('user_id', preferences.user_id)

      return NextResponse.json({
        success: true,
        message: 'You have been resubscribed to email notifications.'
      })
    } else {
      // Unsubscribe
      if (preferences.unsubscribed) {
        return NextResponse.json({
          success: true,
          alreadyUnsubscribed: true,
          message: 'You are already unsubscribed from email notifications.'
        })
      }

      await (supabaseAdmin.from('email_preferences') as any)
        .update({ unsubscribed: true })
        .eq('user_id', preferences.user_id)

      return NextResponse.json({
        success: true,
        message: 'You have been unsubscribed from email notifications.'
      })
    }
  } catch (error: any) {
    console.error('Error processing unsubscribe:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

