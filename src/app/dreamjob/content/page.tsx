import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { DreamJobContentClient } from './DreamJobContentClient'

export default async function DreamJobContentPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  if (!(affiliate as any).onboarding_completed) {
    redirect('/onboarding')
  }

  return <DreamJobContentClient affiliate={affiliate} />
}
