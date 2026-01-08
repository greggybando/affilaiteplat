import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  if (affiliate.role !== 'admin' && affiliate.role !== 'moderator') {
    redirect('/dashboard')
  }

  return <AdminDashboardClient affiliate={affiliate as any} />
}






