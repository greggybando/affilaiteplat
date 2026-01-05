import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail, generateEmailTemplate } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { userId, type, actorName, postTitle, replyContent, postId, actorAvatar } = requestBody

    // Check user's email preferences
    const { data: preferences } = await (supabaseAdmin.from('email_preferences') as any)
      .select('*')
      .eq('user_id', userId)
      .single()

    // Skip if unsubscribed
    if (preferences?.unsubscribed) {
      return NextResponse.json({ success: true, skipped: true })
    }

    // Check if user wants this type of notification
    let shouldSend = false
    switch (type) {
      case 'reply':
        shouldSend = preferences?.notify_replies !== false
        break
      case 'reply_to_comment':
        shouldSend = preferences?.notify_reply_to_comment !== false
        break
      case 'mention':
        shouldSend = preferences?.notify_mentions !== false
        break
      case 'like':
        shouldSend = preferences?.notify_likes === true
        break
    }

    if (!shouldSend) {
      return NextResponse.json({ success: true, skipped: true })
    }

    // Get user email
    const { data: user } = await (supabaseAdmin.from('affiliates') as any)
      .select('email, avatar_name, name')
      .eq('id', userId)
      .single()

    if (!user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Generate email content
    let title = ''
    let emailBody = ''
    let buttonText = 'View conversation'
    let buttonUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://affiliate-platform-three.vercel.app'}/dashboard?post=${postId}`

    switch (type) {
      case 'reply':
        title = `${actorName} replied to your post`
        emailBody = `<p><strong>${actorName}</strong> replied to your post "${postTitle}":</p><p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">${(replyContent || '').substring(0, 200)}${(replyContent || '').length > 200 ? '...' : ''}</p>`
        break
      case 'reply_to_comment':
        title = `${actorName} replied to your comment`
        emailBody = `<p><strong>${actorName}</strong> replied to your comment:</p><p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">${(replyContent || '').substring(0, 200)}${(replyContent || '').length > 200 ? '...' : ''}</p>`
        break
      case 'mention':
        title = `${actorName} mentioned you`
        emailBody = `<p><strong>${actorName}</strong> mentioned you in "${postTitle}":</p><p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">${(replyContent || '').substring(0, 200)}${(replyContent || '').length > 200 ? '...' : ''}</p>`
        break
      case 'like':
        title = `${actorName} liked your post`
        emailBody = `<p><strong>${actorName}</strong> liked your post "${postTitle}"</p>`
        break
    }

    // Get unsubscribe token
    const unsubscribeToken = preferences?.unsubscribe_token || ''
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://affiliate-platform-three.vercel.app'}/unsubscribe?token=${unsubscribeToken}`

    const html = generateEmailTemplate({
      title,
      body: emailBody,
      buttonText,
      buttonUrl,
      unsubscribeUrl
    })

    // Send email
    const result = await sendEmail({
      to: user.email,
      subject: title,
      html
    })

    // Log email
    if (result.success) {
      await (supabaseAdmin.from('email_logs') as any).insert({
        user_id: userId,
        type: type === 'reply' || type === 'reply_to_comment' ? 'reply_notification' : type,
        subject: title,
        status: 'sent'
      })
    }

    return NextResponse.json({ success: result.success, id: result.id })
  } catch (error: any) {
    console.error('Error sending notification email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

