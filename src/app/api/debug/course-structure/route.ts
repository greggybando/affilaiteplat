import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Debug endpoint to check course structure and checkpoint mapping
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courseType = request.nextUrl.searchParams.get('course') || 'mindset'

    // Get all course categories
    const { data: allCategories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id, course_type, title')

    // Find the requested course (try both names)
    let category = allCategories?.find((c: any) => c.course_type === courseType)
    if (!category && courseType === 'mindset') {
      category = allCategories?.find((c: any) => c.course_type === 'lifedesign')
    }
    if (!category && courseType === 'lifedesign') {
      category = allCategories?.find((c: any) => c.course_type === 'mindset')
    }

    if (!category) {
      return NextResponse.json({
        error: 'Course not found',
        requestedType: courseType,
        availableCourses: allCategories?.map((c: any) => ({
          id: c.id,
          type: c.course_type,
          title: c.title
        }))
      })
    }

    // Get all sections for this course
    const { data: sections } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, title, display_order, section_id, category_id')
      .eq('category_id', category.id)
      .order('display_order', { ascending: true })

    // Get all checkpoints
    const sectionIds = sections?.map((s: any) => s.id) || []
    const { data: checkpoints } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id, section_id, title, requirements')

    // Build debug output
    const sectionsWithCheckpoints = sections?.map((section: any, index: number) => {
      const checkpoint = checkpoints?.find((cp: any) => cp.section_id === section.id)
      return {
        index,
        moduleId: section.display_order + 1,
        uuid: section.id,
        numericSectionId: section.section_id,
        title: section.title,
        displayOrder: section.display_order,
        hasCheckpoint: !!checkpoint,
        checkpoint: checkpoint ? {
          id: checkpoint.id,
          title: checkpoint.title,
          linkedToSectionUUID: checkpoint.section_id
        } : null
      }
    })

    // Check for orphaned checkpoints (linked to sections not in this course)
    const orphanedCheckpoints = checkpoints?.filter((cp: any) => 
      !sectionIds.includes(cp.section_id)
    ).map((cp: any) => ({
      id: cp.id,
      title: cp.title,
      linkedToSectionUUID: cp.section_id,
      note: 'This checkpoint is linked to a section NOT in this course'
    }))

    return NextResponse.json({
      course: {
        id: category.id,
        type: category.course_type,
        title: category.title
      },
      allAvailableCourses: allCategories?.map((c: any) => ({
        id: c.id,
        type: c.course_type,
        title: c.title
      })),
      totalSections: sections?.length || 0,
      totalCheckpoints: checkpoints?.length || 0,
      sections: sectionsWithCheckpoints,
      orphanedCheckpoints: orphanedCheckpoints?.length > 0 ? orphanedCheckpoints : null,
      debug: {
        sectionUUIDs: sectionIds,
        checkpointSectionIds: checkpoints?.map((cp: any) => cp.section_id)
      }
    })

  } catch (error: any) {
    console.error('[Debug Course Structure] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

