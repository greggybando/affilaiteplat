import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch single course
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', params.courseId)
      .single()

    if (error) {
      console.error('Error fetching course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ course })
  } catch (error: any) {
    console.error('Error in course GET API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update course
export async function PATCH(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    console.log('[API] PATCH course:', { courseId: params.courseId, updates })

    // Update course
    const { data: course, error } = await (supabaseAdmin as any)
      .from('courses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', params.courseId)
      .select()
      .single()

    if (error) {
      console.error('[API] Error updating course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[API] Course updated successfully:', course)
    return NextResponse.json({ course })
  } catch (error: any) {
    console.error('[API] Error in course PATCH API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    console.log('[API DELETE] Received delete request for courseId:', params.courseId)
    
    const affiliate = await getCurrentAffiliate()
    console.log('[API DELETE] Affiliate:', affiliate?.id, 'Role:', affiliate?.role)
    
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      console.error('[API DELETE] Unauthorized - affiliate:', affiliate?.id, 'role:', affiliate?.role)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API DELETE] Attempting to delete course:', params.courseId)
    
    const { data, error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', params.courseId)
      .select()

    console.log('[API DELETE] Delete result - data:', data, 'error:', error)

    if (error) {
      console.error('[API DELETE] Error deleting course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[API DELETE] Course deleted successfully:', params.courseId)
    return NextResponse.json({ success: true, deleted: data })
  } catch (error: any) {
    console.error('[API DELETE] Exception in course delete API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

