import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// PATCH - Update video (replace URL)
export async function PATCH(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId, sectionId, updates } = await request.json()

    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.youtube_id !== undefined) updateData.youtube_id = updates.youtube_id
    if (updates.loom_id !== undefined) updateData.loom_id = updates.loom_id

    updateData.updated_at = new Date().toISOString()

    const { error } = await (supabaseAdmin as any)
      .from('course_videos')
      .update(updateData)
      .eq('section_id', sectionId)
      .eq('video_id', videoId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating video:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

