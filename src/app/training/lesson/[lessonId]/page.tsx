import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function LessonPage({ params }: { params: { lessonId: string } }) {
  const { data: lesson } = await supabase
    .from('course_lessons')
    .select('*, course_modules!inner(*, courses(*))')
    .eq('id', params.lessonId)
    .eq('is_published', true)
    .single()

  if (!lesson) {
    notFound()
  }

  const module = (lesson as any).course_modules
  const course = (module as any).courses

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <a
            href={`/training/${course.slug}`}
            className="text-gray-400 hover:text-white text-sm mb-2 inline-block"
          >
            ← Back to {course.title}
          </a>
          <h1 className="text-3xl font-bold text-white mb-2">{lesson.title}</h1>
          {lesson.description && <p className="text-gray-400">{lesson.description}</p>}
        </div>

        {lesson.video_url && (
          <div className="mb-8">
            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${lesson.video_url}`}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {lesson.content && (
          <div className="prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
          </div>
        )}
      </div>
    </div>
  )
}

