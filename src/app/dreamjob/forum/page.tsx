import { getCurrentAffiliate } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ForumClient } from './ForumClient'

export default async function DreamJobForumPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  return (
    <ForumClient 
      userAvatarUrl={(affiliate as any).avatar_url}
      userAvatarName={(affiliate as any).avatar_name || affiliate.name}
    />
  )
}
