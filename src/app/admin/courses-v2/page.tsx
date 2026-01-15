import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { CourseListClient } from './CourseListClient'

export default async function CoursesV2Page() {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  if (affiliate.role !== 'admin' && affiliate.role !== 'moderator') {
    redirect('/dashboard')
  }

  return <CourseListClient />
}

