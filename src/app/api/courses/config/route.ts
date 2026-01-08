import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET: Fetch course configuration including sections and their unlock requirements
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let courseType = request.nextUrl.searchParams.get('course') || 'dreamjob'

    // Get the course category - try multiple possible names
    let { data: category } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id, course_type, title')
      .eq('course_type', courseType)
      .single()

    // If mindset not found, try lifedesign (alternate name)
    if (!category && courseType === 'mindset') {
      console.log('[Course Config] "mindset" not found, trying "lifedesign"...')
      const result = await (supabaseAdmin as any)
        .from('course_categories')
        .select('id, course_type, title')
        .eq('course_type', 'lifedesign')
        .single()
      category = result.data
      if (category) courseType = 'lifedesign'
    }

    // Also try the reverse - if lifedesign requested but not found, try mindset
    if (!category && courseType === 'lifedesign') {
      console.log('[Course Config] "lifedesign" not found, trying "mindset"...')
      const result = await (supabaseAdmin as any)
        .from('course_categories')
        .select('id, course_type, title')
        .eq('course_type', 'mindset')
        .single()
      category = result.data
      if (category) courseType = 'mindset'
    }

    if (!category) {
      console.error('[Course Config] Course not found for type:', courseType)
      // List available courses for debugging
      const { data: allCourses } = await (supabaseAdmin as any)
        .from('course_categories')
        .select('id, course_type, title')
      console.log('[Course Config] Available courses:', allCourses)
      return NextResponse.json({ 
        error: 'Course not found', 
        requestedType: courseType,
        availableCourses: allCourses?.map((c: any) => c.course_type) || []
      }, { status: 404 })
    }
    
    console.log('[Course Config] Found course:', category.course_type, category.title)

    // Get all sections for this course, ordered by display_order
    const { data: sections } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, title, display_order, section_id')
      .eq('category_id', category.id)
      .order('display_order', { ascending: true })

    if (!sections || sections.length === 0) {
      return NextResponse.json({
        courseType,
        title: category.title,
        sections: [],
        defaultUnlockedCount: 1
      })
    }

    // Get checkpoints for all sections
    const sectionIds = sections.map((s: any) => s.id)
    const { data: checkpoints } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id, section_id, title, requirements')
      .in('section_id', sectionIds)

    // Build section config with checkpoint info
    const sectionsWithConfig = sections.map((section: any, index: number) => {
      const checkpoint = checkpoints?.find((c: any) => c.section_id === section.id)
      
      // Module ID is display_order + 1 (since display_order is 0-indexed)
      const moduleId = section.display_order + 1
      
      return {
        id: section.id,
        moduleId: moduleId,
        title: section.title,
        displayOrder: section.display_order,
        // First section is always unlocked, rest require previous checkpoint
        isDefaultUnlocked: index === 0,
        hasCheckpoint: !!checkpoint,
        checkpointId: checkpoint?.id || null,
        checkpointTitle: checkpoint?.title || null,
        // To unlock THIS section, you need to complete the PREVIOUS section's checkpoint
        requiresPreviousCheckpoint: index > 0
      }
    })

    // Calculate default unlocked count (sections that don't require checkpoints)
    // By default, only the first section is unlocked
    // But if a section has no checkpoint on the previous section, it's also unlocked
    let defaultUnlockedCount = 1
    for (let i = 1; i < sectionsWithConfig.length; i++) {
      const prevSection = sectionsWithConfig[i - 1]
      if (!prevSection.hasCheckpoint) {
        defaultUnlockedCount++
      } else {
        break // Stop at first section that requires a checkpoint
      }
    }

    return NextResponse.json({
      courseType,
      title: category.title,
      sections: sectionsWithConfig,
      defaultUnlockedCount,
      // List of module IDs that are unlocked by default
      defaultUnlockedModuleIds: sectionsWithConfig
        .slice(0, defaultUnlockedCount)
        .map((s: any) => s.moduleId)
    })

  } catch (error: any) {
    console.error('[Course Config] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

