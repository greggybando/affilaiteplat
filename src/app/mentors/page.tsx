import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { MentorLeaderboardClient } from './MentorLeaderboardClient'

export default async function MentorLeaderboardPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  return <MentorLeaderboardClient />
}

