import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { CommunityClient } from './CommunityClient'

export default async function CommunityPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  // If onboarding not completed, redirect to onboarding
  if (!(affiliate as any).onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <CommunityClient affiliate={affiliate as any} />
    </div>
  )
}





