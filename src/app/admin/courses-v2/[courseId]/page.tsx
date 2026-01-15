import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { CourseBuilderClient } from './CourseBuilderClient'

export default async function CourseBuilderPage({ params }: { params: { courseId: string } }) {
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    redirect('/login')
  }

  if (affiliate.role !== 'admin' && affiliate.role !== 'moderator') {
    redirect('/dashboard')
  }

  return <CourseBuilderClient courseId={params.courseId} />
}

