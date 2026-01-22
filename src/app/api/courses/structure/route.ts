import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCacheHeaders } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// Auto-cleanup duplicate categories (keeps oldest, deletes newer duplicates)
async function cleanupDuplicateCategories() {
  try {
    const { data: allCategories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('*')
      .order('created_at', { ascending: true })

    // Group by course_type:category_id to find duplicates
    const byCategoryId = new Map<string, any[]>()
    for (const cat of (allCategories || [])) {
      const key = `${cat.course_type}:${cat.category_id}`
      if (!byCategoryId.has(key)) {
        byCategoryId.set(key, [])
      }
      byCategoryId.get(key)!.push(cat)
    }

    // Delete duplicates (keep oldest)
    for (const [key, cats] of Array.from(byCategoryId.entries())) {
      if (cats.length > 1) {
        // Sort by created_at ascending (oldest first)
        cats.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        
        // Delete all except the oldest
        for (let i = 1; i < cats.length; i++) {
          // Delete videos for sections in this category
          const { data: sections } = await (supabaseAdmin as any)
            .from('course_sections')
            .select('id')
            .eq('category_id', cats[i].id)
          
          const sectionIds = (sections || []).map((s: any) => s.id)
          if (sectionIds.length > 0) {
            await (supabaseAdmin as any)
              .from('course_videos')
              .delete()
              .in('section_id', sectionIds)
          }
          
          // Delete sections
          await (supabaseAdmin as any)
            .from('course_sections')
            .delete()
            .eq('category_id', cats[i].id)
          
          // Delete category
          await (supabaseAdmin as any)
            .from('course_categories')
            .delete()
            .eq('id', cats[i].id)
          
          console.log(`Cleaned up duplicate category: ${cats[i].title} (${cats[i].id})`)
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up duplicates:', error)
  }
}

// Fetch course structure from new tables (courses, course_modules, course_lessons)
async function fetchFromNewTables(courseType: 'mindset' | 'lifedesign' | 'dreamjob') {
  try {
    const courseSlug = courseType === 'mindset' || courseType === 'lifedesign' ? 'mindset' : 'dream-job'
    
    // Fetch course
    const { data: course, error: courseError } = await (supabaseAdmin as any)
      .from('courses')
      .select('id, slug, title')
      .eq('slug', courseSlug)
      .eq('is_published', true)
      .single()

    if (courseError || !course) {
      return null // Course not found in new tables, fallback to old
    }

    // Fetch modules
    const { data: modules, error: modulesError } = await (supabaseAdmin as any)
      .from('course_modules')
      .select('id, title, slug, description, sort_order')
      .eq('course_id', course.id)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })

    if (modulesError) {
      console.error('Error fetching modules from new tables:', modulesError)
      return null
    }

    if (!modules || modules.length === 0) {
      return null
    }

    // Fetch lessons for all modules
    const moduleIds = modules.map((m: any) => m.id)
    const { data: lessons, error: lessonsError } = await (supabaseAdmin as any)
      .from('course_lessons')
      .select('id, module_id, title, slug, video_url, video_type, sort_order')
      .in('module_id', moduleIds)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })

    if (lessonsError) {
      console.error('Error fetching lessons from new tables:', lessonsError)
      return null
    }

    // Map lessons to videos format
    const lessonsByModule = new Map<string, any[]>()
    for (const lesson of (lessons || [])) {
      if (!lessonsByModule.has(lesson.module_id)) {
        lessonsByModule.set(lesson.module_id, [])
      }
      const videos = lessonsByModule.get(lesson.module_id)!
      
      // Extract video ID from slug (format: "title-video_id")
      // Slug format: "how-to-use-this-course-v0-1" -> extract "v0-1"
      // Look for pattern starting with "v" followed by numbers/hyphens
      let videoId = lesson.slug
      const vIndex = lesson.slug.lastIndexOf('-v')
      if (vIndex !== -1) {
        // Found "-v", extract everything after it (including the "v")
        videoId = lesson.slug.substring(vIndex + 1) // +1 to skip the hyphen
      } else {
        // Fallback: use last part of slug or UUID
        const slugParts = lesson.slug.split('-')
        videoId = slugParts[slugParts.length - 1] || lesson.id
      }
      
      videos.push({
        id: videoId,
        uuid: lesson.id,
        title: lesson.title,
        youtubeId: lesson.video_type === 'youtube' ? lesson.video_url : undefined,
        loomId: lesson.video_type === 'loom' ? lesson.video_url : undefined,
      })
    }

    // For Mindset: modules are sections, need to group them back into categories
    // Module slugs contain category_id: "category_id-section_id-title"
    if (courseType === 'mindset' || courseType === 'lifedesign') {
      // Group modules by category (extract from slug)
      const categoriesMap = new Map<string, any>()
      
      // First, fetch original categories to get their metadata
      const { data: originalCategories } = await (supabaseAdmin as any)
        .from('course_categories')
        .select('category_id, title, is_start_here, display_order')
        .eq('course_type', 'mindset')
        .order('display_order', { ascending: true })
      
      // Initialize categories from original structure
      if (originalCategories) {
        for (const cat of originalCategories) {
          categoriesMap.set(cat.category_id, {
            id: cat.category_id,
            title: cat.title,
            isStartHere: cat.is_start_here || false,
            displayOrder: cat.display_order,
            sections: []
          })
        }
      }
      
      // Group modules (sections) into their categories
      for (const module of modules) {
        // Extract category_id from slug: "category_id-section_id-title"
        const slugParts = module.slug.split('-')
        let categoryId = ''
        
        // Find category_id in slug (it's the first part before the section_id)
        // Known category_ids: starthere, mindset, lifedesign, thinkingtools
        const knownCategoryIds = ['starthere', 'mindset', 'lifedesign', 'thinkingtools']
        for (const knownId of knownCategoryIds) {
          if (module.slug.startsWith(knownId + '-')) {
            categoryId = knownId
            break
          }
        }
        
        // Fallback: try to extract from slug parts
        if (!categoryId && slugParts.length > 0) {
          categoryId = slugParts[0]
        }
        
        // Get or create category
        if (!categoriesMap.has(categoryId)) {
          categoriesMap.set(categoryId, {
            id: categoryId,
            title: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
            isStartHere: categoryId === 'starthere',
            displayOrder: 999,
            sections: []
          })
        }
        
        const category = categoriesMap.get(categoryId)!
        const moduleLessons = lessonsByModule.get(module.id) || []
        
        // Extract section_id from slug (second part after category_id)
        let sectionId = module.slug.split('-')[1] || '0'
        // Try to find numeric section_id
        const sectionIdMatch = module.slug.match(/-(\d+)-/)
        if (sectionIdMatch) {
          sectionId = sectionIdMatch[1]
        }
        
        category.sections.push({
          id: sectionId,
          uuid: module.id,
          number: parseInt(sectionId) || category.sections.length + 1,
          title: module.title,
          description: module.description || undefined,
          videos: moduleLessons,
        })
      }
      
      // Sort categories by display_order, then sort sections within each category
      const categories = Array.from(categoriesMap.values())
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(cat => ({
          id: cat.id,
          title: cat.title,
          isStartHere: cat.isStartHere,
          sections: cat.sections.sort((a: any, b: any) => {
            // Sort by section number if available, otherwise by title
            if (a.number && b.number) {
              return a.number - b.number
            }
            return a.title.localeCompare(b.title)
          })
        }))

      return { courseType, categories }
    }

    // For DreamJob: modules become modules array directly
    if (courseType === 'dreamjob') {
      const modulesList = modules.map((module: any, index: number) => {
        const moduleLessons = lessonsByModule.get(module.id) || []
        
        return {
          id: module.slug,
          uuid: module.id,
          number: index + 1,
          title: module.title,
          description: module.description || '',
          videos: moduleLessons.map((v: any) => ({
            id: v.id,
            title: v.title,
            youtubeId: v.youtubeId || '',
            loomId: v.loomId || '',
          })),
        }
      })

      return { modules: modulesList }
    }

    return null
  } catch (error) {
    console.error('Error fetching from new tables:', error)
    return null
  }
}

// GET - Fetch course structure (categories, sections, videos)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const courseType = searchParams.get('courseType') as 'mindset' | 'lifedesign' | 'dreamjob' | null

    if (!courseType) {
      return NextResponse.json({ error: 'Missing courseType parameter' }, { status: 400 })
    }

    // For foundational courses, try new tables first
    if (courseType === 'mindset' || courseType === 'lifedesign' || courseType === 'dreamjob') {
      const newData = await fetchFromNewTables(courseType)
      if (newData) {
        return NextResponse.json(newData)
      }
      // Fallback to old tables if new tables don't have data
      console.log(`[Course Structure] Course ${courseType} not found in new tables, falling back to old tables`)
    }

    // Auto-cleanup any duplicate categories first (old tables)
    await cleanupDuplicateCategories()

    // Fetch categories - only fetch 'mindset' since we've consolidated everything there
    const isMindsetWorld = courseType === 'mindset' || courseType === 'lifedesign'
    const courseTypesToFetch = isMindsetWorld ? ['mindset'] : [courseType]

    const { data: rawCategories, error: categoriesError } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('*')
      .in('course_type', courseTypesToFetch)
      .order('display_order', { ascending: true })

    if (categoriesError) throw categoriesError

    if (!rawCategories || rawCategories.length === 0) {
      return NextResponse.json({ categories: [] })
    }

    // Fetch sections for each category
    const categoryIds = (rawCategories as any[]).map(c => c.id)
    const { data: sections, error: sectionsError } = await (supabaseAdmin as any)
      .from('course_sections')
      .select('*')
      .in('category_id', categoryIds)
      .order('display_order', { ascending: true })

    if (sectionsError) throw sectionsError

    // Fetch videos for each section
    const sectionIds = (sections as any[])?.map(s => s.id) || []
    const { data: videos, error: videosError } = await (supabaseAdmin as any)
      .from('course_videos')
      .select('id, section_id, video_id, title, youtube_id, loom_id, display_order, created_at, updated_at')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true })

    if (videosError) throw videosError

    // Deduplicate categories by category_id (stable UI id).
    // If duplicates exist across course_types, prefer the one that actually has sections.
    const sectionCountByCategoryDbId = new Map<string, number>()
    for (const s of (sections as any[]) || []) {
      sectionCountByCategoryDbId.set(
        s.category_id,
        (sectionCountByCategoryDbId.get(s.category_id) || 0) + 1
      )
    }

    const byCategoryKey = new Map<string, any>()
    for (const c of rawCategories as any[]) {
      const key = String(c.category_id)
      const existing = byCategoryKey.get(key)
      if (!existing) {
        byCategoryKey.set(key, c)
        continue
      }
      const existingCount = sectionCountByCategoryDbId.get(existing.id) || 0
      const nextCount = sectionCountByCategoryDbId.get(c.id) || 0

      if (nextCount > existingCount) {
        byCategoryKey.set(key, c)
        continue
      }
      if (nextCount === existingCount) {
        // Tie-break: prefer mindset record (except when key itself is lifedesign)
        const existingCt = String(existing.course_type || '').toLowerCase()
        const nextCt = String(c.course_type || '').toLowerCase()
        if (key.toLowerCase() === 'lifedesign') {
          if (nextCt === 'lifedesign' && existingCt !== 'lifedesign') byCategoryKey.set(key, c)
        } else {
          if (nextCt === 'mindset' && existingCt !== 'mindset') byCategoryKey.set(key, c)
        }
      }
    }

    const categories = Array.from(byCategoryKey.values())

    // Sort categories by display_order from database (set by admin drag-and-drop)
    // Start Here sections always come first
    const categoriesSorted = [...(categories as any[])].sort((a: any, b: any) => {
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

    const categoriesWithSections = categoriesSorted.map((category: any) => {
      const categorySections = ((sections as any[]) || [])
        .filter((s: any) => s.category_id === category.id)
        // Explicitly sort by display_order to ensure correct ordering
        .sort((a: any, b: any) => {
          const da = typeof a.display_order === 'number' ? a.display_order : 9999
          const db = typeof b.display_order === 'number' ? b.display_order : 9999
          return da - db
        })
        .map((section: any) => {
          const sectionVideos = ((videos as any[]) || [])
            .filter((v: any) => v.section_id === section.id)
            .sort((a: any, b: any) => {
              const da = typeof a.display_order === 'number' ? a.display_order : 9999
              const db = typeof b.display_order === 'number' ? b.display_order : 9999
              return da - db
            })
            .map((video: any) => ({
              id: video.video_id,
              uuid: video.id,
              title: video.title,
              youtubeId: video.youtube_id || undefined,
              loomId: video.loom_id || undefined,
            }))

          return {
            id: section.section_id,  // Numeric ID for UI
            uuid: section.id,        // UUID for checkpoint linking
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
      const modules = (categoriesWithSections[0] as any).sections.map((section: any) => ({
        id: section.id,
        uuid: section.uuid,  // Include UUID for checkpoint linking
        number: section.number,
        title: section.title,
        description: section.description || '',
        videos: (section.videos as any[]).map((v: any) => ({
          id: v.id,
          title: v.title,
          youtubeId: v.youtubeId || '',
        })),
      }))

      return NextResponse.json({ modules })
    }

    // For Mindset/LifeDesign, return categories with sections
    return NextResponse.json({ courseType, categories: categoriesWithSections })
  } catch (error: any) {
    console.error('Error fetching course structure:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

