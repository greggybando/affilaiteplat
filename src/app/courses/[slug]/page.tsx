import CourseDetailClient from './CourseDetailClient'

export const dynamic = 'force-dynamic'

export default function CoursePage({ params }: { params: { slug: string } }) {
  return <CourseDetailClient slug={params.slug} />
}

