import CourseDetailClient from './CourseDetailClient'

export const dynamic = 'force-dynamic'

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CourseDetailClient slug={slug} />
}

