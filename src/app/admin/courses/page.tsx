import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { CourseManagementClient } from './CourseManagementClient'

export default async function CourseManagementPage() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  if (affiliate.role !== 'admin' && affiliate.role !== 'moderator') {
    redirect('/dashboard')
  }

  return <CourseManagementClient affiliate={affiliate as any} />
}


