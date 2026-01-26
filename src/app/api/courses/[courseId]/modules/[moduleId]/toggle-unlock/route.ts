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

    if (unlocked) {
      // Add unlock - first check if it exists
      const { data: existing, error: checkError } = await (supabaseAdmin as any)
        .from('user_module_unlocks')
        .select('id')
        .eq('user_id', affiliate.id)
        .eq('module_id', moduleId)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[Toggle Unlock] Error checking existing unlock:', checkError)
        return NextResponse.json({ error: checkError.message }, { status: 500 })
      }

      if (existing) {
        // Already exists, update timestamp
        const { error } = await (supabaseAdmin as any)
          .from('user_module_unlocks')
          .update({
            unlocked_at: new Date().toISOString(),
            unlocked_by: affiliate.id
          })
          .eq('user_id', affiliate.id)
          .eq('module_id', moduleId)

        if (error) {
          console.error('[Toggle Unlock] Error updating unlock:', error)
          return NextResponse.json({ error: error.message, details: error }, { status: 500 })
        }
      } else {
        // Insert new
        const { error } = await (supabaseAdmin as any)
          .from('user_module_unlocks')
          .insert({
            user_id: affiliate.id,
            module_id: moduleId,
            unlocked_at: new Date().toISOString(),
            unlocked_by: affiliate.id
          })

        if (error) {
          console.error('[Toggle Unlock] Error inserting unlock:', error)
          return NextResponse.json({ error: error.message, details: error }, { status: 500 })
        }
      }
    } else {
      // Remove unlock
      const { error } = await (supabaseAdmin as any)
        .from('user_module_unlocks')
        .delete()
        .eq('user_id', affiliate.id)
        .eq('module_id', moduleId)

      if (error) {
        console.error('[Toggle Unlock] Error removing unlock:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    console.log('[Toggle Unlock] Success:', { unlocked })

    return NextResponse.json({ success: true, unlocked })
  } catch (error: any) {
    console.error('[Toggle Unlock] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

