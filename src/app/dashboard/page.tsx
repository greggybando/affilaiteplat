import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  // If onboarding not completed, redirect to onboarding
  if (!(affiliate as any).onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <DashboardClient affiliate={affiliate as any} />
  )
}

