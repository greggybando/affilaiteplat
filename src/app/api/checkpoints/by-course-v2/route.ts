import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch checkpoints for SkillBank courses (new course system)
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courseId = request.nextUrl.searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'courseId required' }, { status: 400 })
    }

    // Fetch course modules (sections) for this course
    const { data: modules, error: modulesError } = await (supabaseAdmin as any)
      .from('course_modules')
      .select('id, title, course_id, sort_order')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })

    if (modulesError) {
      console.error('[Checkpoints by Course V2] Error fetching modules:', modulesError)
      return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
    }

    const moduleIds = (modules || []).map((m: any) => m.id)

    // Fetch checkpoints for these modules
    // Note: checkpoints table uses module_id in unified system
    const { data: checkpoints, error: checkpointsError } = await (supabaseAdmin as any)
      .from('checkpoints')
      .select('id, module_id, title, description, requirements, ai_grading_prompt, ai_review_enabled, requires_manual_review')
      .in('module_id', moduleIds.length ? moduleIds : ['00000000-0000-0000-0000-000000000000'])

    if (checkpointsError) {
      console.error('[Checkpoints by Course V2] Error fetching checkpoints:', checkpointsError)
    }

    // Build maps by module ID
    const checkpointMap: Record<string, any> = {}
    const checkpointsByTitle: Record<string, any> = {}

    checkpoints?.forEach((cp: any) => {
      if (!cp.video_id) {
        // Section-level checkpoint
        checkpointMap[cp.section_id] = cp
      }
    })

    // Map by title
    modules?.forEach((module: any) => {
      const checkpoint = checkpointMap[module.id]
      if (checkpoint) {
        checkpointsByTitle[module.title] = checkpoint
      }
    })

    return NextResponse.json({
      courseId,
      checkpoints: checkpoints || [],
      byUUID: checkpointMap,
      byTitle: checkpointsByTitle,
      modules: (modules || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        hasCheckpoint: !!checkpointMap[m.id]
      }))
    })

  } catch (error: any) {
    console.error('[Checkpoints by Course V2] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

