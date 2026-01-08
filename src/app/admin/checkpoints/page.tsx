import { getCurrentAffiliate } from '@/lib/auth'
import { CheckpointsManagementClient } from './CheckpointsManagementClient'

export default async function CheckpointsManagementPage() {
  // Auth check is handled by layout
  const affiliate = await getCurrentAffiliate()

  return <CheckpointsManagementClient affiliate={affiliate as any} />
}

