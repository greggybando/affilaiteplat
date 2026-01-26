import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Toggle module unlock for admin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> | { courseId: string; moduleId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = affiliate.role === 'admin' || affiliate.role === 'moderator'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Handle params as Promise (Next.js 14)
    const resolvedParams = await Promise.resolve(params)
    const { courseId, moduleId } = resolvedParams

    const body = await request.json()
    const { unlocked } = body

    if (typeof unlocked !== 'boolean') {
      return NextResponse.json({ error: 'unlocked boolean is required' }, { status: 400 })
    }

    console.log('[Toggle Unlock] Request:', {
      courseId,
      moduleId,
      userId: affiliate.id,
      unlocked,
      isAdmin
    })

    // Update the module's globally_unlocked flag (unlocks for ALL users)
    const { data: updateData, error: updateError } = await (supabaseAdmin as any)
      .from('course_modules')
      .update({ globally_unlocked: unlocked })
      .eq('id', moduleId)
      .select('id, title, globally_unlocked')
      .single()

    if (updateError) {
      console.error('[Toggle Unlock] Error updating module globally_unlocked:', updateError)
      return NextResponse.json({ error: updateError.message, details: updateError }, { status: 500 })
    }

    console.log('[Toggle Unlock] Updated module globally_unlocked:', { 
      moduleId, 
      moduleTitle: updateData?.title,
      globally_unlocked: updateData?.globally_unlocked,
      requested: unlocked
    })

    // Verify the update worked
    if (updateData?.globally_unlocked !== unlocked) {
      console.error('[Toggle Unlock] WARNING: Update may not have worked correctly', {
        expected: unlocked,
        actual: updateData?.globally_unlocked
      })
    }

    console.log('[Toggle Unlock] Success:', { unlocked, verified: updateData?.globally_unlocked })

    return NextResponse.json({ 
      success: true, 
      unlocked: updateData?.globally_unlocked ?? unlocked,
      moduleId,
      moduleTitle: updateData?.title
    })
  } catch (error: any) {
    console.error('[Toggle Unlock] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

