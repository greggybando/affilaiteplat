import { supabaseAdmin } from './supabase'

// Helper function to create notifications
export async function createNotification(data: {
  userId: string
  actorId: string
  type: 'like' | 'reply' | 'mention' | 'reply_to_comment'
  postId?: string
  replyId?: string
}) {
  try {
    // Skip if user is notifying themselves
    if (data.userId === data.actorId) {
      return { success: true }
    }

    const { error } = await (supabaseAdmin.from('notifications') as any).insert({
      user_id: data.userId,
      actor_id: data.actorId,
      type: data.type,
      post_id: data.postId || null,
      reply_id: data.replyId || null,
      read: false
    })

    if (error) {
      console.error('Error creating notification:', error)
      return { success: false, error }
    }

    // Send email notification (async, don't wait)
    if (process.env.RESEND_API_KEY) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          type: data.type === 'reply_to_comment' ? 'reply_to_comment' : data.type,
          actorName: '', // Will be fetched in the API
          postTitle: '',
          replyContent: '',
          postId: data.postId,
          actorId: data.actorId
        })
      }).catch(err => console.error('Error triggering email:', err))
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error creating notification:', error)
    return { success: false, error: error.message }
  }
}

