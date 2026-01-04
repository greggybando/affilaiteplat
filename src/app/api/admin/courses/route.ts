import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch course structure
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courseType = new URL(request.url).searchParams.get('courseType') || 'mindset'

    // Fetch categories
    const { data: categories, error: catError } = await supabaseAdmin
      .from('course_categories')
      .select('*')
      .eq('course_type', courseType)
      .order('display_order', { ascending: true })

    if (catError) throw catError

    // Fetch sections for each category
    const categoryIds = (categories || []).map((c: any) => c.id)
    const { data: sections, error: secError } = await supabaseAdmin
      .from('course_sections')
      .select('*')
      .in('category_id', categoryIds)
      .order('display_order', { ascending: true })

    if (secError) throw secError

    // Fetch videos for each section
    const sectionIds = (sections || []).map((s: any) => s.id)
    const { data: videos, error: vidError } = await supabaseAdmin
      .from('course_videos')
      .select('*')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true })

    if (vidError) throw vidError

    // Build nested structure
    const structure = (categories || []).map((category: any) => ({
      ...category,
      sections: (sections || [])
        .filter((s: any) => s.category_id === category.id)
        .map((section: any) => ({
          ...section,
          videos: (videos || []).filter((v: any) => v.section_id === section.id)
        }))
    }))

    return NextResponse.json({ structure })
  } catch (error: any) {
    console.error('Error fetching course structure:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// POST - Save course structure
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseType, structure } = await request.json()

    // Delete existing structure for this course type
    const { data: existingCategories } = await supabaseAdmin
      .from('course_categories')
      .select('id')
      .eq('course_type', courseType)

    const categoryIds = existingCategories?.map(c => c.id) || []
    
    if (categoryIds.length > 0) {
      const { data: existingSections } = await supabaseAdmin
        .from('course_sections')
        .select('id')
        .in('category_id', categoryIds)

      const sectionIds = existingSections?.map(s => s.id) || []
      
      if (sectionIds.length > 0) {
        await supabaseAdmin.from('course_videos').delete().in('section_id', sectionIds)
      }
      
      await supabaseAdmin.from('course_sections').delete().in('category_id', categoryIds)
    }
    
    await supabaseAdmin.from('course_categories').delete().eq('course_type', courseType)

    // Insert new structure
    for (let catIndex = 0; catIndex < structure.length; catIndex++) {
      const category = structure[catIndex]
      
      const { data: newCategory, error: catError } = await supabaseAdmin
        .from('course_categories')
        .insert({
          course_type: courseType,
          category_id: category.category_id,
          title: category.title,
          is_start_here: category.is_start_here || false,
          display_order: catIndex
        })
        .select()
        .single()

      if (catError) throw catError

      for (let secIndex = 0; secIndex < category.sections.length; secIndex++) {
        const section = category.sections[secIndex]
        
        const { data: newSection, error: secError } = await supabaseAdmin
          .from('course_sections')
          .insert({
            category_id: newCategory.id,
            section_id: section.section_id,
            number: section.number,
            title: section.title,
            description: section.description,
            display_order: secIndex
          })
          .select()
          .single()

        if (secError) throw secError

        for (let vidIndex = 0; vidIndex < section.videos.length; vidIndex++) {
          const video = section.videos[vidIndex]
          
          await supabaseAdmin
            .from('course_videos')
            .insert({
              section_id: newSection.id,
              video_id: video.video_id,
              title: video.title,
              youtube_id: video.youtube_id,
              loom_id: video.loom_id,
              display_order: vidIndex
            })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving course structure:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

