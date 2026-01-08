import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { UnlockRulesManagementClient } from './UnlockRulesManagementClient'

export default async function UnlockRulesManagementPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  if (affiliate.role !== 'admin' && !affiliate.is_admin) {
    redirect('/dashboard')
  }

  return <UnlockRulesManagementClient affiliate={affiliate as any} />
}

