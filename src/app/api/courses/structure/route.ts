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

// GET - Fetch course structure (categories, sections, videos)
export async function GET(request: NextRequest) {
  try {
    // Auto-cleanup any duplicate categories first
    await cleanupDuplicateCategories()
    
    const searchParams = request.nextUrl.searchParams
    const courseType = searchParams.get('courseType') as 'mindset' | 'lifedesign' | 'dreamjob' | null

    if (!courseType) {
      return NextResponse.json({ error: 'Missing courseType parameter' }, { status: 400 })
    }

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

