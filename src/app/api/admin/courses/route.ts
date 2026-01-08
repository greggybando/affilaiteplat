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

    // For 'mindset', also fetch 'lifedesign' since they're combined in the UI as one "world"
    const courseTypesToFetch = courseType === 'mindset' ? ['mindset', 'lifedesign'] : [courseType]

    // Fetch categories
    const { data: rawCategories, error: catError } = await supabaseAdmin
      .from('course_categories')
      .select('*')
      .in('course_type', courseTypesToFetch)
      .order('display_order', { ascending: true })

    if (catError) throw catError

    if (!rawCategories || rawCategories.length === 0) {
      return NextResponse.json({ structure: [] })
    }

    // Deduplicate categories by category_id (may have both mindset and lifedesign records)
    // Prefer the record that has sections attached
    const allCategoryIds = (rawCategories as any[]).map((c: any) => c.id)
    const { data: allSections, error: secError } = await supabaseAdmin
      .from('course_sections')
      .select('*')
      .in('category_id', allCategoryIds)
      .order('display_order', { ascending: true })

    if (secError) throw secError

    const sectionCountByCategoryDbId = new Map<string, number>()
    for (const s of (allSections as any[]) || []) {
      sectionCountByCategoryDbId.set(s.category_id, (sectionCountByCategoryDbId.get(s.category_id) || 0) + 1)
    }

    const byCategoryKey = new Map<string, any>()
    for (const c of rawCategories as any[]) {
      const key = String(c.category_id)
      const existing = byCategoryKey.get(key)
      if (!existing) {
        byCategoryKey.set(key, c)
        continue
      }
      // Prefer the one with more sections
      const existingCount = sectionCountByCategoryDbId.get(existing.id) || 0
      const nextCount = sectionCountByCategoryDbId.get(c.id) || 0
      if (nextCount > existingCount) {
        byCategoryKey.set(key, c)
      }
    }

    // Sort categories by display_order from database (set by admin drag-and-drop)
    // Start Here sections always come first
    const categories = Array.from(byCategoryKey.values()).sort((a: any, b: any) => {
      // Start Here always first
      if (a.is_start_here && !b.is_start_here) return -1
      if (b.is_start_here && !a.is_start_here) return 1
      
      // Then by display_order from database
      const da = typeof a.display_order === 'number' ? a.display_order : 9999
      const db = typeof b.display_order === 'number' ? b.display_order : 9999
      if (da !== db) return da - db
      
      // Fallback to title
      return String(a.title || '').localeCompare(String(b.title || ''))
    })

    // Only keep sections for the deduplicated categories
    const categoryIds = (categories || []).map((c: any) => c.id)
    const sections = (allSections || []).filter((s: any) => categoryIds.includes(s.category_id))

    // Fetch videos for each section
    const sectionIds = (sections || []).map((s: any) => s.id)
    const { data: videos, error: vidError } = await supabaseAdmin
      .from('course_videos')
      .select('id, section_id, video_id, title, youtube_id, loom_id, display_order, created_at, updated_at')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true })

    if (vidError) throw vidError

    // Build nested structure with explicit sorting
    const structure = (categories || []).map((category: any) => ({
      ...category,
      sections: (sections || [])
        .filter((s: any) => s.category_id === category.id)
        .sort((a: any, b: any) => {
          const da = typeof a.display_order === 'number' ? a.display_order : 9999
          const db = typeof b.display_order === 'number' ? b.display_order : 9999
          return da - db
        })
        .map((section: any) => ({
          ...section,
          videos: (videos || [])
            .filter((v: any) => v.section_id === section.id)
            .sort((a: any, b: any) => {
              const da = typeof a.display_order === 'number' ? a.display_order : 9999
              const db = typeof b.display_order === 'number' ? b.display_order : 9999
              return da - db
            })
            .map((v: any) => ({
              id: v.id,
              section_id: v.section_id,
              video_id: v.video_id,
              title: v.title,
              youtube_id: v.youtube_id,
              loom_id: v.loom_id,
              display_order: v.display_order,
              created_at: v.created_at,
              updated_at: v.updated_at
            }))
        }))
    }))

    return NextResponse.json({ structure })
  } catch (error: any) {
    console.error('Error fetching course structure:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// POST - Save course structure (UPSERT to preserve UUIDs for checkpoint links)
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseType, structure } = await request.json()
    const saveCourseType = courseType === 'lifedesign' ? 'mindset' : courseType

    // Get existing data to preserve UUIDs
    const { data: existingCategories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('id, category_id, course_type')
      .eq('course_type', saveCourseType)

    const categoryIdMap = new Map<string, string>() // category_id -> db UUID
    for (const cat of (existingCategories || [])) {
      categoryIdMap.set(cat.category_id, cat.id)
    }

    // Get existing sections
    const existingCategoryDbIds = (existingCategories || []).map((c: any) => c.id)
    const { data: existingSections } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('id, section_id, category_id')
      .in('category_id', existingCategoryDbIds.length ? existingCategoryDbIds : ['00000000-0000-0000-0000-000000000000'])

    // Map: "categoryDbId:section_id" -> section UUID
    const sectionIdMap = new Map<string, string>()
    for (const sec of (existingSections || [])) {
      sectionIdMap.set(`${sec.category_id}:${sec.section_id}`, sec.id)
    }

    // Get existing videos
    const existingSectionDbIds = (existingSections || []).map((s: any) => s.id)
    const { data: existingVideos } = await (supabaseAdmin as any)
      .from('course_videos')
      .select('id, video_id, section_id')
      .in('section_id', existingSectionDbIds.length ? existingSectionDbIds : ['00000000-0000-0000-0000-000000000000'])

    // Map: "sectionDbId:video_id" -> video UUID
    const videoIdMap = new Map<string, string>()
    for (const vid of (existingVideos || [])) {
      videoIdMap.set(`${vid.section_id}:${vid.video_id}`, vid.id)
    }

    // Track what we're keeping
    const keptCategoryIds = new Set<string>()
    const keptSectionIds = new Set<string>()
    const keptVideoIds = new Set<string>()

    // Process each category
    for (let catIndex = 0; catIndex < structure.length; catIndex++) {
      const category = structure[catIndex]
      let categoryDbId = categoryIdMap.get(category.category_id)

      if (categoryDbId) {
        // Update existing category
        await (supabaseAdmin as any)
          .from('course_categories')
          .update({
            title: category.title,
            is_start_here: category.is_start_here || false,
            display_order: catIndex
          })
          .eq('id', categoryDbId)
        keptCategoryIds.add(categoryDbId)
      } else {
        // Insert new category
        const { data: newCat } = await (supabaseAdmin as any)
          .from('course_categories')
          .insert({
            course_type: saveCourseType,
            category_id: category.category_id,
            title: category.title,
            is_start_here: category.is_start_here || false,
            display_order: catIndex
          })
          .select()
          .single()
        categoryDbId = newCat?.id
        if (categoryDbId) keptCategoryIds.add(categoryDbId)
      }

      // Process sections for this category
      for (let secIndex = 0; secIndex < category.sections.length; secIndex++) {
        const section = category.sections[secIndex]
        const sectionKey = `${categoryDbId}:${section.section_id}`
        let sectionDbId = sectionIdMap.get(sectionKey)

        // Also try to find by section's own id if it has one (preserves original UUID)
        if (!sectionDbId && section.id) {
          const { data: existingSec } = await (supabaseAdmin as any)
            .from('course_sections')
            .select('id')
            .eq('id', section.id)
            .single()
          if (existingSec) sectionDbId = existingSec.id
        }

        if (sectionDbId) {
          // Update existing section (preserves UUID for checkpoint links!)
          await (supabaseAdmin as any)
            .from('course_sections')
            .update({
              category_id: categoryDbId,
              title: section.title,
              description: section.description,
              number: section.number,
              display_order: secIndex
            })
            .eq('id', sectionDbId)
          keptSectionIds.add(sectionDbId)
        } else {
          // Insert new section
          const { data: newSec } = await (supabaseAdmin as any)
            .from('course_sections')
            .insert({
              category_id: categoryDbId,
              section_id: section.section_id,
              number: section.number,
              title: section.title,
              description: section.description,
              display_order: secIndex
            })
            .select()
            .single()
          sectionDbId = newSec?.id
          if (sectionDbId) keptSectionIds.add(sectionDbId)
        }

        // Process videos for this section
        for (let vidIndex = 0; vidIndex < section.videos.length; vidIndex++) {
          const video = section.videos[vidIndex]
          const videoKey = `${sectionDbId}:${video.video_id}`
          let videoDbId = videoIdMap.get(videoKey)

          // Also try by video's own id
          if (!videoDbId && video.id) {
            const { data: existingVid } = await (supabaseAdmin as any)
              .from('course_videos')
              .select('id')
              .eq('id', video.id)
              .single()
            if (existingVid) videoDbId = existingVid.id
          }

          if (videoDbId) {
            // Update existing video (preserves UUID for checkpoint links!)
            await (supabaseAdmin as any)
              .from('course_videos')
              .update({
                section_id: sectionDbId,
                title: video.title,
                youtube_id: video.youtube_id,
                loom_id: video.loom_id,
                display_order: vidIndex
              })
              .eq('id', videoDbId)
            keptVideoIds.add(videoDbId)
          } else {
            // Insert new video
            const { data: newVid } = await (supabaseAdmin as any)
              .from('course_videos')
              .insert({
                section_id: sectionDbId,
                video_id: video.video_id,
                title: video.title,
                youtube_id: video.youtube_id,
                loom_id: video.loom_id,
                display_order: vidIndex
              })
              .select()
              .single()
            if (newVid) keptVideoIds.add(newVid.id)
          }
        }
      }
    }

    // Delete items that are no longer in the structure (but only for this course type)
    // Note: We're careful to only delete items we loaded initially to avoid cross-course issues
    const videosToDelete = (existingVideos || []).filter((v: any) => !keptVideoIds.has(v.id)).map((v: any) => v.id)
    const sectionsToDelete = (existingSections || []).filter((s: any) => !keptSectionIds.has(s.id)).map((s: any) => s.id)
    const categoriesToDelete = (existingCategories || []).filter((c: any) => !keptCategoryIds.has(c.id)).map((c: any) => c.id)

    if (videosToDelete.length > 0) {
      await (supabaseAdmin as any).from('course_videos').delete().in('id', videosToDelete)
    }
    if (sectionsToDelete.length > 0) {
      // Note: This will CASCADE delete checkpoints - only do this for truly deleted sections
      await (supabaseAdmin as any).from('course_sections').delete().in('id', sectionsToDelete)
    }
    if (categoriesToDelete.length > 0) {
      await (supabaseAdmin as any).from('course_categories').delete().in('id', categoriesToDelete)
    }

    console.log(`[Admin Courses] Saved structure: ${keptCategoryIds.size} categories, ${keptSectionIds.size} sections, ${keptVideoIds.size} videos`)
    console.log(`[Admin Courses] Deleted: ${categoriesToDelete.length} categories, ${sectionsToDelete.length} sections, ${videosToDelete.length} videos`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving course structure:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

