import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail, generateEmailTemplate } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ broadcastId: string }> }
) {
  const { broadcastId } = await params
  try {
    // Get broadcast
    const { data: broadcast, error: broadcastError } = await (supabaseAdmin.from('broadcasts') as any)
      .select('*')
      .eq('id', broadcastId)
      .single()

    if (broadcastError) throw broadcastError

    // Update status to sending
    await (supabaseAdmin.from('broadcasts') as any)
      .update({ status: 'sending' })
      .eq('id', broadcastId)

    // Get pending recipients (batch of 100)
    const { data: recipients, error: recipientsError } = await (supabaseAdmin.from('broadcast_recipients') as any)
      .select('*')
      .eq('broadcast_id', broadcastId)
      .eq('status', 'pending')
      .limit(100)

    if (recipientsError) throw recipientsError

    if (!recipients || recipients.length === 0) {
      // No more recipients, mark as sent
      await (supabaseAdmin.from('broadcasts') as any)
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', broadcastId)
      return NextResponse.json({ success: true, complete: true })
    }

    // Get unsubscribe tokens
    const userIds = (recipients as any)?.map((r: any) => r.user_id) || []
    const { data: preferences } = userIds.length > 0 ? await (supabaseAdmin.from('email_preferences') as any)
      .select('user_id, unsubscribe_token')
      .in('user_id', userIds) : { data: [] }

    const unsubscribeTokens: Record<string, string> = {}
    preferences?.forEach((p: any) => {
      unsubscribeTokens[p.user_id] = p.unsubscribe_token
    })

    // Send emails
    const sendPromises = (recipients as any)?.map(async (recipient: any) => {
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
        await (supabaseAdmin.from('broadcast_recipients') as any)
          .update({
            status: result.success ? 'sent' : 'failed',
            sent_at: result.success ? new Date().toISOString() : null
          })
          .eq('id', recipient.id)

        // Log email
        if (result.success) {
          await (supabaseAdmin.from('email_logs') as any).insert({
            user_id: recipient.user_id,
            type: 'broadcast',
            subject: broadcast.subject,
            status: 'sent'
          })
        }

        return { success: result.success, recipientId: recipient.id }
      } catch (error: any) {
        console.error(`Error sending to ${recipient.email}:`, error)
        await (supabaseAdmin.from('broadcast_recipients') as any)
          .update({ status: 'failed' })
          .eq('id', recipient.id)
        return { success: false, recipientId: recipient.id }
      }
    }) || []

    await Promise.all(sendPromises)

    // Check if more recipients remain
    const { count: remainingCount } = await supabaseAdmin
      .from('broadcast_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('broadcast_id', broadcastId)
      .eq('status', 'pending')

    if (remainingCount === 0) {
      // All sent, mark as complete
      await (supabaseAdmin.from('broadcasts') as any)
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', broadcastId)
    } else {
      // Schedule next batch (call this endpoint again after delay)
      // Note: In production, use a proper job queue or cron job for this
      // For now, we'll just return and let the admin manually trigger the next batch
      // or use Vercel Cron to call this endpoint periodically
    }

    return NextResponse.json({ success: true, sent: recipients.length, remaining: remainingCount || 0 })
  } catch (error: any) {
    console.error('Error sending broadcast:', error)
    
    // Mark as failed
    await (supabaseAdmin.from('broadcasts') as any)
      .update({ status: 'failed' })
      .eq('id', broadcastId)
      .catch(() => {})

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

