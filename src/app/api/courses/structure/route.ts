import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch course structure (categories, sections, videos)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const courseType = searchParams.get('courseType') as 'mindset' | 'dreamjob' | null

    if (!courseType) {
      return NextResponse.json({ error: 'Missing courseType parameter' }, { status: 400 })
    }

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('course_categories')
      .select('*')
      .eq('course_type', courseType)
      .order('display_order', { ascending: true })

    if (categoriesError) throw categoriesError

    if (!categories || categories.length === 0) {
      return NextResponse.json({ categories: [] })
    }

    // Fetch sections for each category
    const categoryIds = categories.map(c => c.id)
    const { data: sections, error: sectionsError } = await supabaseAdmin
      .from('course_sections')
      .select('*')
      .in('category_id', categoryIds)
      .order('display_order', { ascending: true })

    if (sectionsError) throw sectionsError

    // Fetch videos for each section
    const sectionIds = sections?.map(s => s.id) || []
    const { data: videos, error: videosError } = await supabaseAdmin
      .from('course_videos')
      .select('*')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true })

    if (videosError) throw videosError

    // Build nested structure
    const categoriesWithSections = categories.map(category => {
      const categorySections = (sections || [])
        .filter(s => s.category_id === category.id)
        .map(section => {
          const sectionVideos = (videos || [])
            .filter(v => v.section_id === section.id)
            .map(video => ({
              id: video.video_id,
              title: video.title,
              youtubeId: video.youtube_id || undefined,
              loomId: video.loom_id || undefined,
            }))

          return {
            id: section.section_id,
            number: section.number,
            title: section.title,
            description: section.description || undefined,
            videos: sectionVideos,
          }
        })

      return {
        id: category.category_id,
        title: category.title,
        isStartHere: category.is_start_here || false,
        sections: categorySections,
      }
    })

    // For DreamJob, return modules (sections) directly since there's only one category
    if (courseType === 'dreamjob' && categoriesWithSections.length > 0) {
      const modules = categoriesWithSections[0].sections.map(section => ({
        id: section.id,
        number: section.number,
        title: section.title,
        description: section.description || '',
        videos: section.videos.map(v => ({
          id: v.id,
          title: v.title,
          youtubeId: v.youtubeId || '',
        })),
      }))

      return NextResponse.json({ modules })
    }

    // For Mindset, return categories with sections
    return NextResponse.json({ categories: categoriesWithSections })
  } catch (error: any) {
    console.error('Error fetching course structure:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

