import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ProfilePageClient } from './ProfilePageClient'

export const dynamic = 'force-dynamic'

async function getProfileData(userId: string) {
  const { data: user, error } = await (supabaseAdmin.from('affiliates') as any)
    .select('id, name, avatar_name, avatar_url, bio, created_at, last_active_at, updated_at, role')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return null
  }

  // Calculate stats
  const { count: postsCount } = await supabaseAdmin
    .from('community_posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)

  const { count: commentsCount } = await supabaseAdmin
    .from('community_replies')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)

  const { data: userPosts } = await supabaseAdmin
    .from('community_posts')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)

  const { data: userReplies } = await supabaseAdmin
    .from('community_replies')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)

  const postIds = (userPosts || []).map((p: any) => p.id)
  const replyIds = (userReplies || []).map((r: any) => r.id)

  let likesReceived = 0
  if (postIds.length > 0) {
    const { count: postLikes } = await supabaseAdmin
      .from('community_likes')
      .select('*', { count: 'exact', head: true })
      .in('post_id', postIds)
    likesReceived += postLikes || 0
  }
  if (replyIds.length > 0) {
    const { count: replyLikes } = await supabaseAdmin
      .from('community_likes')
      .select('*', { count: 'exact', head: true })
      .in('reply_id', replyIds)
    likesReceived += replyLikes || 0
  }

  return {
    id: user.id,
    name: user.avatar_name || user.name,
    avatar: user.avatar_url,
    bio: user.bio || null,
    memberSince: user.created_at,
    lastActiveAt: user.last_active_at || user.updated_at,
    role: user.role,
    stats: {
      postsCount: postsCount || 0,
      commentsCount: commentsCount || 0,
      likesReceived
    }
  }
}

export default async function ProfilePage({ params }: { params: { userId: string } }) {
  const currentUser = await getCurrentAffiliate()
  
  if (!currentUser) {
    redirect('/login')
  }

  const profileData = await getProfileData(params.userId)

  if (!profileData) {
    redirect('/dashboard')
  }

  return <ProfilePageClient profileData={profileData} currentUserId={currentUser.id} />
}

