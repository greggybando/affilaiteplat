import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  // If already completed onboarding, redirect to dashboard
  if ((affiliate as any).onboarding_completed) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <OnboardingClient 
        currentAvatarName={(affiliate as any).avatar_name}
        currentAvatarUrl={(affiliate as any).avatar_url}
      />
    </div>
  )
}




