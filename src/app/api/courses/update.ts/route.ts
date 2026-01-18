import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, categoryId, sectionId, videoId, updates } = await request.json()

    if (type === 'category') {
      const { error } = await (supabaseAdmin as any)
        .from('course_categories')
        .update({ title: updates.title, updated_at: new Date().toISOString() })
        .eq('category_id', categoryId)

      if (error) throw error
    } else if (type === 'section') {
      // Find category first
      const { data: category } = await (supabaseAdmin as any)
        .from('course_categories')
        .select('id')
        .eq('category_id', categoryId)
        .single()

      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }

      const { error } = await (supabaseAdmin as any)
        .from('course_sections')
        .update({ 
          title: updates.title, 
          description: updates.description,
          updated_at: new Date().toISOString() 
        })
        .eq('category_id', (category as any).id)
        .eq('section_id', sectionId)

      if (error) throw error
    } else if (type === 'video') {
      // Find section first
      const { data: category } = await (supabaseAdmin as any)
        .from('course_categories')
        .select('id')
        .eq('category_id', categoryId)
        .single()

      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }

      const { data: section } = await (supabaseAdmin as any)
        .from('course_sections')
        .select('id')
        .eq('category_id', (category as any).id)
        .eq('section_id', sectionId)
        .single()

      if (!section) {
        return NextResponse.json({ error: 'Section not found' }, { status: 404 })
      }

      const updateData: any = {
        title: updates.title,
        updated_at: new Date().toISOString()
      }
      if (updates.youtubeId !== undefined) updateData.youtube_id = updates.youtubeId
      if (updates.loomId !== undefined) updateData.loom_id = updates.loomId

      const { error } = await (supabaseAdmin as any)
        .from('course_videos')
        .update(updateData)
        .eq('section_id', (section as any).id)
        .eq('video_id', videoId)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating course:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

