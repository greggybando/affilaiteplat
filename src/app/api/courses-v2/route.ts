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
    const isAdmin = affiliate.role === 'admin' || affiliate.role === 'moderator'

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const showAll = searchParams.get('all') === 'true' // Admin flag to show drafts

    // If courseId provided, fetch single course with full details
    if (courseId) {
      // Try slug first (most common case), then ID
      let course = null
      let courseError = null
      
      // First try by slug
      const { data: courseBySlug, error: slugError } = await (supabaseAdmin
        .from('courses') as any)
        .select('*')
        .eq('slug', courseId)
        .maybeSingle()
      
      if (courseBySlug && !slugError) {
        course = courseBySlug
      } else {
        // Try by ID if slug didn't work
        const { data: courseById, error: idError } = await (supabaseAdmin
          .from('courses') as any)
          .select('*')
          .eq('id', courseId)
          .maybeSingle()
        
        if (courseById && !idError) {
          course = courseById
        } else {
          courseError = idError || slugError
        }
      }

      if (courseError || !course) {
        console.error('Course lookup error:', courseError)
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }

      // Only allow access to unpublished courses if admin
      if (!course.is_published && !isAdmin) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }

      // Fetch sections (use course.id not courseId since we might have fetched by slug)
      const { data: sections, error: sectionsError } = await (supabaseAdmin
        .from('course_modules') as any)
        .select('*')
        .eq('course_id', course.id)
        .eq('is_published', true)
        .order('sort_order', { ascending: true })

      if (sectionsError) throw sectionsError

      // Fetch lessons for each section
      const sectionIds = (sections || []).map((s: any) => s.id)
      const { data: lessons, error: lessonsError } = await (supabaseAdmin
        .from('course_lessons') as any)
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

    // Otherwise, fetch all courses (for classroom grid)
    // Show drafts if admin AND showAll flag is set
    let query = (supabaseAdmin
      .from('courses') as any)
      .select('id, slug, title, description, emoji, color, thumbnail_url, sort_order, is_published')
      .order('sort_order', { ascending: true })
    
    // Only filter by published status if not admin or if admin hasn't requested all
    if (!isAdmin || !showAll) {
      query = query.eq('is_published', true)
    }

    const { data: courses, error } = await query

    if (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get section/lesson counts for each course
    const coursesWithCounts = await Promise.all(
      (courses || []).map(async (course: any) => {
        const { data: sections } = await (supabaseAdmin
          .from('course_modules') as any)
          .select('id')
          .eq('course_id', course.id)
          .eq('is_published', true)

        const sectionIds = (sections || []).map((s: any) => s.id)
        const { data: lessons } = await (supabaseAdmin
          .from('course_lessons') as any)
          .select('id')
          .in('module_id', sectionIds.length ? sectionIds : [''])
          .eq('is_published', true)

        // Get user progress for this course
        const lessonIds = (lessons || []).map((l: any) => l.id)
        const { data: progress } = await (supabaseAdmin
          .from('user_lesson_progress') as any)
          .select('id, completed')
          .eq('user_id', affiliate.id)
          .in('lesson_id', lessonIds.length ? lessonIds : [''])

        const completedCount = (progress || []).filter((p: any) => p.completed).length
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

