import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { MindsetContentClient } from './MindsetContentClient'

export default async function MindsetContentPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  if (!affiliate.onboarding_completed) {
    redirect('/onboarding')
  }

  return <MindsetContentClient affiliate={affiliate} />
}
