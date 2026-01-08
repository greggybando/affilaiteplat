import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { CheckpointReviewClient } from './CheckpointReviewClient'

export default async function CheckpointReviewPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  if (affiliate.role !== 'admin' && !affiliate.is_admin) {
    redirect('/dashboard')
  }

  return <CheckpointReviewClient affiliate={affiliate as any} />
}

