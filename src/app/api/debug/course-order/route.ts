import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Debug endpoint to see exact database order
export async function GET(request: NextRequest) {
  try {
    // Get ALL categories (not just mindset/lifedesign) to find duplicates
    const { data: allCategories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id, course_type, category_id, title, display_order')
      .order('display_order', { ascending: true })
    
    // Get ALL sections to find duplicates
    const { data: allSections } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, category_id, section_id, title, display_order')
      .order('display_order', { ascending: true })
    
    // Find duplicate sections by title
    const sectionsByTitle = new Map<string, any[]>()
    for (const s of (allSections || [])) {
      const title = s.title
      if (!sectionsByTitle.has(title)) {
        sectionsByTitle.set(title, [])
      }
      sectionsByTitle.get(title)!.push(s)
    }
    
    const duplicateSections = Array.from(sectionsByTitle.entries())
      .filter(([_, sections]) => sections.length > 1)
      .map(([title, sections]) => ({ title, count: sections.length, sections }))

    // Get raw database data for mindset world
    const { data: categories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id, course_type, category_id, title, display_order')
      .in('course_type', ['mindset', 'lifedesign'])
      .order('display_order', { ascending: true })

    const categoryIds = (categories || []).map((c: any) => c.id)
    
    const { data: sections } = await supabaseAdmin
      .from('course_sections')
      .select('id, category_id, section_id, title, display_order')
      .in('category_id', categoryIds)
      .order('display_order', { ascending: true })

    const sectionIds = (sections || []).map((s: any) => s.id)
    
    const { data: videos } = await supabaseAdmin
      .from('course_videos')
      .select('id, section_id, video_id, title, display_order')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true })

    // Build a readable structure
    const structure = (categories || []).map((cat: any) => ({
      dbId: cat.id,
      courseType: cat.course_type,
      categoryId: cat.category_id,
      title: cat.title,
      displayOrder: cat.display_order,
      sections: (sections || [])
        .filter((s: any) => s.category_id === cat.id)
        .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
        .map((sec: any) => ({
          dbId: sec.id,
          sectionId: sec.section_id,
          title: sec.title,
          displayOrder: sec.display_order,
          videos: (videos || [])
            .filter((v: any) => v.section_id === sec.id)
            .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
            .map((vid: any) => ({
              dbId: vid.id,
              videoId: vid.video_id,
              title: vid.title,
              displayOrder: vid.display_order
            }))
        }))
    }))

    // Find which category each section belongs to
    const categoryMap = new Map<string, any>()
    for (const c of (allCategories || [])) {
      categoryMap.set(c.id, c)
    }
    
    const allSectionsWithCategory = (allSections || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      section_id: s.section_id,
      category_id: s.category_id,
      categoryInfo: categoryMap.get(s.category_id) || null
    }))

    return NextResponse.json({ 
      rawCategoryCount: categories?.length || 0,
      rawSectionCount: sections?.length || 0,
      rawVideoCount: videos?.length || 0,
      allCategoriesCount: allCategories?.length || 0,
      allSectionsCount: allSections?.length || 0,
      duplicateSections,
      allCategories: allCategories?.map((c: any) => ({ id: c.id, course_type: c.course_type, category_id: c.category_id, title: c.title })),
      allSectionsWithCategory,
      structure 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

