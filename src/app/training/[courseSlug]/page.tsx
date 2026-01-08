import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import CourseContent from './CourseContent'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function CoursePage({ params }: { params: { courseSlug: string } }) {
  // Check if user is admin
  const cookieStore = cookies()
  const token = cookieStore.get('affiliate_token')?.value
  let isAdmin = false

  if (token) {
    try {
      const jwt = require('jsonwebtoken')
      const payload = jwt.verify(token, process.env.JWT_SECRET!)
      if (payload?.affiliateId) {
        const { data } = await supabase
          .from('affiliates')
          .select('is_admin')
          .eq('id', payload.affiliateId)
          .single()
        isAdmin = data?.is_admin || false
      }
    } catch (e) {
      // Token invalid or expired
    }
  }

  const { data: course } = await supabase
    .from('courses')
    .select(`*, course_modules (*, course_lessons (*, course_attachments_new (*)))`)
    .eq('slug', params.courseSlug)
    .eq('is_published', true)
    .single()

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Course not found</div>
      </div>
    )
  }

  // Sort modules and lessons
  course.course_modules?.sort((a: any, b: any) => a.sort_order - b.sort_order)
  course.course_modules?.forEach((m: any) => {
    m.course_lessons?.sort((a: any, b: any) => a.sort_order - b.sort_order)
  })

  return <CourseContent course={course} isAdmin={isAdmin} />
}



