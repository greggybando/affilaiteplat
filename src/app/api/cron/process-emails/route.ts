/**
 * Email Queue Processor
 * 
 * Processes pending broadcast emails in batches.
 * Should be called by Vercel Cron every minute.
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-emails",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail, generateEmailTemplate } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 second timeout

// Process 10 emails per batch to avoid timeouts
const BATCH_SIZE = 10
// Delay between emails to avoid rate limiting
const DELAY_MS = 500

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function GET(request: NextRequest) {
  // Verify cron secret (protect from unauthorized access)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find broadcasts that are currently sending
    const { data: broadcasts, error: broadcastError } = await supabaseAdmin
      .from('broadcasts')
      .select('*')
      .eq('status', 'sending')
      .limit(1)

    if (broadcastError) {
      console.error('Error fetching broadcasts:', broadcastError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!broadcasts || broadcasts.length === 0) {
      return NextResponse.json({ message: 'No broadcasts to process', processed: 0 })
    }

    const broadcast = broadcasts[0] as any

    // Get pending recipients
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from('broadcast_recipients')
      .select('*')
      .eq('broadcast_id', broadcast.id)
      .eq('status', 'pending')
      .limit(BATCH_SIZE)

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!recipients || recipients.length === 0) {
      // No more recipients, mark broadcast as complete
      await (supabaseAdmin as any)
        .from('broadcasts')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', broadcast.id)

      return NextResponse.json({ message: 'Broadcast complete', processed: 0 })
    }

    // Get unsubscribe tokens
    const userIds = recipients.map((r: any) => r.user_id)
    const { data: preferences } = await supabaseAdmin
      .from('email_preferences')
      .select('user_id, unsubscribe_token')
      .in('user_id', userIds)

    const unsubscribeTokens: Record<string, string> = {}
    preferences?.forEach((p: any) => {
      unsubscribeTokens[p.user_id] = p.unsubscribe_token
    })

    // Process emails sequentially with delay
    let successCount = 0
    let failCount = 0

    for (const recipient of recipients as any[]) {
      try {
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://millionairelifedesign.com'}/unsubscribe?token=${unsubscribeTokens[recipient.user_id] || ''}`

        const html = generateEmailTemplate({
          title: broadcast.subject,
          body: broadcast.body_html,
          unsubscribeUrl
        })

        const result = await sendEmail({
          to: recipient.email,
          subject: broadcast.subject,
          html
        })

        // Update recipient status
        await (supabaseAdmin as any)
          .from('broadcast_recipients')
          .update({
            status: result.success ? 'sent' : 'failed',
            sent_at: result.success ? new Date().toISOString() : null
          })
          .eq('id', recipient.id)

        if (result.success) {
          successCount++
          // Log email
          await (supabaseAdmin as any).from('email_logs').insert({
            user_id: recipient.user_id,
            type: 'broadcast',
            subject: broadcast.subject,
            status: 'sent'
          })
        } else {
          failCount++
        }

        // Delay between emails
        await delay(DELAY_MS)

      } catch (error: any) {
        console.error(`Error sending to ${recipient.email}:`, error)
        await (supabaseAdmin as any)
          .from('broadcast_recipients')
          .update({ status: 'failed' })
          .eq('id', recipient.id)
        failCount++
      }
    }

    // Check if more recipients remain
    const { count: remainingCount } = await supabaseAdmin
      .from('broadcast_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('broadcast_id', broadcast.id)
      .eq('status', 'pending')

    // Update broadcast progress
    if (remainingCount === 0) {
      await (supabaseAdmin as any)
        .from('broadcasts')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', broadcast.id)
    }

    return NextResponse.json({
      success: true,
      processed: successCount + failCount,
      sent: successCount,
      failed: failCount,
      remaining: remainingCount || 0,
      broadcastId: broadcast.id
    })

  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

