import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch user's unlocked videos for a course/section
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const courseType = searchParams.get('course') || 'dreamjob'
    const sectionId = searchParams.get('section') // Optional: filter by section

    // Build query
    let query = supabaseAdmin
      .from('user_video_unlocks')
      .select('video_id, section_id, unlocked_at')
      .eq('user_id', affiliate.id)
      .eq('course_type', courseType)

    if (sectionId) {
      query = query.eq('section_id', sectionId)
    }

    const { data: unlocks, error } = await query

    if (error) {
      console.error('[Video Unlocks API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get all video checkpoints to determine which videos have gates
    const { data: checkpoints } = await supabaseAdmin
      .from('checkpoints')
      .select('video_id')
      .not('video_id', 'is', null)

    const videosWithCheckpoints = new Set(
      (checkpoints || []).map((cp: any) => cp.video_id)
    )

    // Get user's approved checkpoint submissions for video checkpoints
    const checkpointIds = checkpoints?.map((cp: any) => cp.id) || []
    const { data: approvedSubmissions } = await supabaseAdmin
      .from('user_checkpoints')
      .select('checkpoint_id')
      .eq('user_id', affiliate.id)
      .eq('status', 'approved')
      .in('checkpoint_id', checkpointIds.length > 0 ? checkpointIds : ['none'])

    const approvedCheckpointIds = new Set(
      (approvedSubmissions || []).map((s: any) => s.checkpoint_id)
    )

    return NextResponse.json({
      unlockedVideos: (unlocks || []).map((u: any) => u.video_id),
      bySection: (unlocks || []).reduce((acc: any, u: any) => {
        if (!acc[u.section_id]) acc[u.section_id] = []
        acc[u.section_id].push(u.video_id)
        return acc
      }, {}),
      videosWithCheckpoints: Array.from(videosWithCheckpoints),
      approvedVideoCheckpoints: Array.from(approvedCheckpointIds)
    })

  } catch (error: any) {
    console.error('[Video Unlocks API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


