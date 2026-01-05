import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail, generateEmailTemplate } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (affiliate.role !== 'admin' && affiliate.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requestBody = await request.json()
    const { subject, body_html, body_text, audience, scheduled_for, send_test } = requestBody

    if (send_test) {
      // Send test email to admin
      const { data: admin } = await (supabaseAdmin.from('affiliates') as any)
        .select('email, avatar_name, name')
        .eq('id', affiliate.id)
        .single()

      if (!admin?.email) {
        return NextResponse.json({ error: 'Admin email not found' }, { status: 400 })
      }

      const html = generateEmailTemplate({
        title: subject,
        body: body_html,
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token=test`
      })

      const result = await sendEmail({
        to: admin.email,
        subject: `[TEST] ${subject}`,
        html
      })

      return NextResponse.json({ success: result.success, test: true })
    }

    // Create broadcast
    const { data: broadcast, error: broadcastError } = await (supabaseAdmin.from('broadcasts') as any).insert({
      admin_id: affiliate.id,
      subject,
      body_html,
      body_text: body_text || body_html.replace(/<[^>]*>/g, ''),
      audience,
      status: scheduled_for ? 'scheduled' : 'draft',
      scheduled_for: scheduled_for || null
    })
      .select()
      .single()

    if (broadcastError) throw broadcastError

    // Get recipients based on audience
    let recipientsQuery = supabaseAdmin
      .from('affiliates')
      .select('id, email, avatar_name, name')

    switch (audience) {
      case 'active':
        // Users who posted/commented in last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const { data: activePosts } = await supabaseAdmin
          .from('community_posts')
          .select('user_id')
          .gte('created_at', thirtyDaysAgo.toISOString())
        const { data: activeReplies } = await supabaseAdmin
          .from('community_replies')
          .select('user_id')
          .gte('created_at', thirtyDaysAgo.toISOString())
        const activeUserIds = Array.from(new Set([
          ...((activePosts as any)?.map((u: any) => u.user_id) || []),
          ...((activeReplies as any)?.map((u: any) => u.user_id) || [])
        ]))
        if (activeUserIds.length > 0) {
          recipientsQuery = recipientsQuery.in('id', activeUserIds)
        } else {
          recipientsQuery = recipientsQuery.eq('id', '00000000-0000-0000-0000-000000000000') // No results
        }
        break
      case 'new':
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        recipientsQuery = recipientsQuery.gte('created_at', sevenDaysAgo.toISOString())
        break
      case 'role_member':
        recipientsQuery = recipientsQuery.eq('role', 'member').or('role.is.null')
        break
      case 'role_mod':
        recipientsQuery = recipientsQuery.eq('role', 'moderator')
        break
      case 'role_admin':
        recipientsQuery = recipientsQuery.eq('role', 'admin')
        break
      // 'all' - no filter
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery

    if (recipientsError) throw recipientsError

    // Filter out unsubscribed users
    const { data: unsubscribed } = await supabaseAdmin
      .from('email_preferences')
      .select('user_id')
      .eq('unsubscribed', true)

    const unsubscribedIds = new Set((unsubscribed as any)?.map((u: any) => u.user_id) || [])
    const validRecipients = (recipients as any)?.filter((r: any) => !unsubscribedIds.has(r.id)) || []

    // Create recipient records
    const recipientRecords = validRecipients.map((recipient: any) => ({
      broadcast_id: broadcast.id,
      user_id: recipient.id,
      email: recipient.email,
      status: 'pending'
    }))

    if (recipientRecords.length > 0) {
      const { error: insertError } = await (supabaseAdmin.from('broadcast_recipients') as any)
        .insert(recipientRecords)

      if (insertError) throw insertError
    }

    // Update recipient count
    await (supabaseAdmin.from('broadcasts') as any)
      .update({ recipient_count: validRecipients.length })
      .eq('id', broadcast.id)

    // If sending now (not scheduled), start sending
    if (!scheduled_for) {
      // Queue sending in background (don't wait)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/broadcast/${broadcast.id}/send`, {
        method: 'POST'
      }).catch(err => console.error('Error starting broadcast:', err))
    }

    return NextResponse.json({
      success: true,
      broadcast: {
        ...broadcast,
        recipient_count: validRecipients.length
      }
    })
  } catch (error: any) {
    console.error('Error creating broadcast:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (affiliate.role !== 'admin' && affiliate.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: broadcasts, error } = await (supabaseAdmin.from('broadcasts') as any)
      .select(`
        *,
        admin:affiliates!broadcasts_admin_id_fkey (
          id,
          avatar_name,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ broadcasts: broadcasts || [] })
  } catch (error: any) {
    console.error('Error fetching broadcasts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

