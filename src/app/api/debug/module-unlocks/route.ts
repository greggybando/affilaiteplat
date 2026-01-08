import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Debug endpoint to see user's module unlocks
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    const courseType = request.nextUrl.searchParams.get('course') || 'dreamjob'

    // Check user_module_unlocks table
    const { data: moduleUnlocks, error: moduleError } = await (supabaseAdmin as any)
      .from('user_module_unlocks')
      .select('*')
      .eq('user_id', affiliate.id)
      .eq('course_type', courseType)

    // Check user_checkpoints table
    const { data: checkpoints, error: checkpointError } = await (supabaseAdmin as any)
      .from('user_checkpoints')
      .select('id, checkpoint_id, status, submitted_at, ai_status')
      .eq('user_id', affiliate.id)

    return NextResponse.json({
      userId: affiliate.id,
      email: affiliate.email,
      courseType,
      moduleUnlocks: moduleUnlocks || [],
      moduleUnlocksError: moduleError?.message,
      checkpoints: checkpoints || [],
      checkpointsError: checkpointError?.message,
      summary: {
        unlockedModules: moduleUnlocks?.map((u: any) => u.module_id) || [],
        approvedCheckpoints: checkpoints?.filter((c: any) => c.status === 'approved').length || 0,
        totalCheckpoints: checkpoints?.length || 0
      }
    })

  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

