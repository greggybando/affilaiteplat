import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch published courses with sections and lessons
export async function GET(request: NextRequest) {
  try {
    const affiliateData = await getCurrentAffiliate()
    if (!affiliateData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const affiliate = affiliateData as any

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    // If courseId provided, fetch single course with full details
    if (courseId) {
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('is_published', true)
        .single()

      if (courseError || !course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }

      // Fetch sections
      const { data: sections, error: sectionsError } = await supabaseAdmin
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('sort_order', { ascending: true })

      if (sectionsError) throw sectionsError

      // Fetch lessons for each section
      const sectionIds = (sections || []).map((s: any) => s.id)
      const { data: lessons, error: lessonsError } = await supabaseAdmin
        .from('course_lessons')
        .select('*')
        .in('module_id', sectionIds.length ? sectionIds : [''])
        .eq('is_published', true)
        .order('sort_order', { ascending: true })

      if (lessonsError) throw lessonsError

      // Fetch user progress
      const { data: progress, error: progressError } = await supabaseAdmin
        .from('user_lesson_progress')
        .select('*')
        .eq('user_id', affiliate.id)
        .in('lesson_id', (lessons || []).map((l: any) => l.id).concat(['']))

      // Build nested structure
      const sectionsWithLessons = (sections || []).map((section: any) => ({
        ...section,
        lessons: (lessons || [])
          .filter((l: any) => l.module_id === section.id)
          .map((lesson: any) => ({
            ...lesson,
            progress: progress?.find((p: any) => p.lesson_id === lesson.id)
          }))
      }))

      return NextResponse.json({
        course: {
          ...(course as any),
          sections: sectionsWithLessons
        }
      })
    }

    // Otherwise, fetch all published courses (for classroom grid)
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select('id, slug, title, description, emoji, color, thumbnail_url, sort_order')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get section/lesson counts for each course
    const coursesWithCounts = await Promise.all(
      (courses || []).map(async (course) => {
        const { data: sections } = await supabaseAdmin
          .from('course_modules')
          .select('id')
          .eq('course_id', course.id)
          .eq('is_published', true)

        const sectionIds = (sections || []).map(s => s.id)
        const { data: lessons } = await supabaseAdmin
          .from('course_lessons')
          .select('id')
          .in('module_id', sectionIds.length ? sectionIds : [''])
          .eq('is_published', true)

        // Get user progress for this course
        const lessonIds = (lessons || []).map(l => l.id)
        const { data: progress } = await supabaseAdmin
          .from('user_lesson_progress')
          .select('id, completed')
          .eq('user_id', affiliate.id)
          .in('lesson_id', lessonIds.length ? lessonIds : [''])

        const completedCount = (progress || []).filter(p => p.completed).length
        const totalLessons = lessons?.length || 0

        return {
          ...course,
          stats: {
            sections: sections?.length || 0,
            lessons: totalLessons,
            completed: completedCount,
            progress: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
          }
        }
      })
    )

    return NextResponse.json({ courses: coursesWithCounts })
  } catch (error: any) {
    console.error('Error in courses API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

