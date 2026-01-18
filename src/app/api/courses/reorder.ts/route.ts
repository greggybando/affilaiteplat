import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Force rebuild - fixes type errors
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, courseType, items, categoryId, sectionId, moduleId } = body

    if (!type || !courseType || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing type, courseType, or items array' }, { status: 400 })
    }

    console.log('Reordering request:', { type, courseType, categoryId, sectionId, moduleId, itemsCount: items.length })
    
    const errors: string[] = []

    // Mindset world is sometimes stored under course_type='lifedesign'.
    // Allow reorder requests using either label to still hit the correct rows.
    const resolveCourseTypeCandidates = (ct: string) => {
      if (ct === 'mindset') return ['mindset', 'lifedesign']
      if (ct === 'lifedesign') return ['lifedesign', 'mindset']
      return [ct]
    }

    const resolveCategoryCandidates = async (ct: string, catId: string) => {
      const candidates = resolveCourseTypeCandidates(ct)
      const { data } = await (supabaseAdmin as any)
        .from('course_categories')
        .select('id, course_type, category_id')
        .in('course_type', candidates)
        .eq('category_id', catId)
      return (data || []) as any[]
    }

    const resolveCategoryDbIds = async (ct: string, catId: string) => {
      const categoryCandidates = await resolveCategoryCandidates(ct, catId)
      return categoryCandidates
    }

    const resolveSectionDbIds = async (ct: string, catId: string, sectionNumericId: string | number) => {
      const categoryCandidates = await resolveCategoryDbIds(ct, catId)
      if (categoryCandidates.length === 0) return []

      const sectionDbIds: string[] = []
      for (const cat of categoryCandidates) {
        const { data: section } = await (supabaseAdmin as any)
          .from('course_sections')
          .select('id')
          .eq('category_id', cat.id)
          .eq('section_id', sectionNumericId.toString())
          .maybeSingle()
        if (section?.id) sectionDbIds.push(section.id)
      }
      return sectionDbIds
    }
    
    // Update display_order for each item
    for (const item of items) {
      const sortOrder = Number(item.sortOrder)
      console.log(`Processing ${type} item:`, { id: item.id, sortOrder })
      
      if (type === 'module') {
        // For DreamJob, modules are sections in the 'main' category
        // Find the section by section_id
        const { data: category, error: catError } = await (supabaseAdmin as any)
          .from('course_categories')
          .select('id')
          .eq('course_type', courseType)
          .eq('category_id', 'main')
          .single()

        if (catError) {
          console.error('Error finding category for module reorder:', catError)
          continue
        }

        if (category) {
          const { error: updateError } = await (supabaseAdmin as any)
            .from('course_sections')
            .update({ display_order: sortOrder } as Record<string, unknown>)
            .eq('category_id', (category as any).id)
            .eq('section_id', item.id.toString())
          
          if (updateError) {
            console.error('Error updating module order:', updateError, { item, sortOrder })
          }
        }
      } else if (type === 'section') {
        // Find ALL matching categories by categoryId (mindset vs lifedesign duplicates)
        const categories = await resolveCategoryDbIds(courseType, categoryId)
        if (!categories || categories.length === 0) {
          const errorMsg = `Category not found: ${categoryId}`
          console.error(errorMsg)
          errors.push(errorMsg)
          continue
        }

        for (const cat of categories) {
          const { data: updatedSection, error: updateError } = await (supabaseAdmin as any)
            .from('course_sections')
            .update({ display_order: sortOrder } as Record<string, unknown>)
            .eq('category_id', cat.id)
            .eq('section_id', item.id.toString())
            .select()

          if (updateError) {
            const errorMsg = `Error updating section order: ${updateError.message}`
            console.error(errorMsg, { 
              item, 
              sortOrder, 
              categoryId, 
              categoryDbId: cat.id,
              sectionId: item.id.toString()
            })
            errors.push(errorMsg)
          }

          if (!updatedSection || updatedSection.length === 0) {
            console.error('No section found to update:', { 
              categoryId, 
              categoryDbId: cat.id,
              sectionId: item.id.toString()
            })
          }
        }
      } else if (type === 'category') {
        const candidates = resolveCourseTypeCandidates(courseType)
        let updated = false
        for (const candidate of candidates) {
          const { data: updatedRows, error: updateError } = await (supabaseAdmin as any)
            .from('course_categories')
            .update({ display_order: sortOrder } as Record<string, unknown>)
            .eq('course_type', candidate)
            .eq('category_id', item.id.toString())
            .select('id')
          if (updateError) {
            console.error('Error updating category order:', updateError, { item, sortOrder, candidate })
            continue
          }
          if (updatedRows && updatedRows.length > 0) {
            updated = true
            // Do NOT break — update both if duplicates exist so UI + backend stay consistent.
          }
        }
        if (!updated) {
          console.error('Category reorder updated 0 rows:', { courseType, item, sortOrder })
        }
      } else if (type === 'video') {
        // Find the section by section_id or moduleId
        let sectionDbIds: string[] = []
        const targetSectionId = sectionId || moduleId // This is the section_id (not the database id)
        
        if (categoryId) {
          // For Mindset world: resolve ALL matching DB section rows (important when duplicates exist across course_type)
          if (targetSectionId) {
            sectionDbIds = await resolveSectionDbIds(courseType, categoryId, targetSectionId)
          }
        } else {
          // For DreamJob: find section by moduleId
          const { data: category } = await (supabaseAdmin as any)
            .from('course_categories')
            .select('id')
            .eq('course_type', courseType)
            .eq('category_id', 'main')
            .single()

          if (category && targetSectionId) {
            const { data: section } = await (supabaseAdmin as any)
              .from('course_sections')
              .select('id')
              .eq('category_id', (category as any).id)
              .eq('section_id', targetSectionId.toString())
              .single()
            
            if (section) {
              sectionDbIds = [(section as any).id]
            }
          }
        }

        if (sectionDbIds.length > 0) {
          for (const sid of sectionDbIds) {
            const { error: updateError } = await (supabaseAdmin as any)
              .from('course_videos')
              .update({ display_order: sortOrder } as Record<string, unknown>)
              .eq('section_id', sid)
              .eq('video_id', item.id.toString())
            
            if (updateError) {
              console.error('Error updating video order:', updateError, { sectionDbId: sid })
            }
          }
        } else {
          console.error('Could not find section for video reorder:', { categoryId, sectionId, moduleId, courseType })
        }
      }
    }

    if (errors.length > 0) {
      console.error('Reordering completed with errors:', errors)
      return NextResponse.json({ 
        success: false, 
        error: errors.join('; '),
        errors 
      }, { status: 500 })
    }

    console.log('Reordering completed successfully')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error reordering:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

