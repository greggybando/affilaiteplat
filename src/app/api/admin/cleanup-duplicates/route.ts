import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Cleanup duplicate categories and keep the ones with correct video order
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || affiliate.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all categories
    const { data: allCategories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('*')
      .order('created_at', { ascending: true })

    // Group by category_id to find duplicates
    const byCategoryId = new Map<string, any[]>()
    for (const cat of (allCategories || [])) {
      const key = `${cat.course_type}:${cat.category_id}`
      if (!byCategoryId.has(key)) {
        byCategoryId.set(key, [])
      }
      byCategoryId.get(key)!.push(cat)
    }

    const duplicates = Array.from(byCategoryId.entries())
      .filter(([_, cats]) => cats.length > 1)

    // For each duplicate group, we need to determine which one to keep
    // The OLDER one (created first) likely has the correct structure from before the admin save broke things
    const toDelete: string[] = []
    const toKeep: string[] = []

    for (const [key, cats] of duplicates) {
      // Sort by created_at ascending (oldest first)
      cats.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      // Keep the oldest, delete the rest
      toKeep.push(cats[0].id)
      for (let i = 1; i < cats.length; i++) {
        toDelete.push(cats[i].id)
      }
    }

    return NextResponse.json({
      totalCategories: allCategories?.length || 0,
      duplicateGroups: duplicates.length,
      categoriesToDelete: toDelete,
      categoriesToKeep: toKeep,
      details: duplicates.map(([key, cats]) => ({
        key,
        categories: cats.map((c: any) => ({
          id: c.id,
          title: c.title,
          created_at: c.created_at
        }))
      })),
      message: 'Call POST to actually delete the duplicates'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || affiliate.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all categories
    const { data: allCategories } = await (supabaseAdmin as any)
      .from('course_categories')
      .select('*')
      .order('created_at', { ascending: true })

    // Group by category_id to find duplicates
    const byCategoryId = new Map<string, any[]>()
    for (const cat of (allCategories || [])) {
      const key = `${cat.course_type}:${cat.category_id}`
      if (!byCategoryId.has(key)) {
        byCategoryId.set(key, [])
      }
      byCategoryId.get(key)!.push(cat)
    }

    const duplicates = Array.from(byCategoryId.entries())
      .filter(([_, cats]) => cats.length > 1)

    const toDelete: string[] = []
    const deleted: any[] = []

    for (const [key, cats] of duplicates) {
      // Sort by created_at ascending (oldest first)
      cats.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      // Delete all except the oldest
      for (let i = 1; i < cats.length; i++) {
        toDelete.push(cats[i].id)
        
        // First delete videos for sections in this category
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
        
        deleted.push({ id: cats[i].id, title: cats[i].title, key })
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleted.length,
      deleted,
      message: 'Duplicate categories and their sections/videos have been deleted'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

