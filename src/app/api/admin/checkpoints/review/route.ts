import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET - Get review queue (needs_review submissions)
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'needs_review' // needs_review, all, approved, denied
    const courseType = searchParams.get('courseType')
    const sectionId = searchParams.get('sectionId')
    const userId = searchParams.get('userId')

    let query = supabaseAdmin
      .from('user_checkpoints')
      .select(`
        *,
        checkpoint:checkpoints(
          id,
          title,
          requirements,
          section:course_sections(
            id,
            title,
            category:course_categories(
              id,
              course_type,
              title
            )
          )
        ),
        user:affiliates(
          id,
          name,
          email
        )
      `)

    // Apply filters
    if (filter === 'needs_review') {
      query = query.eq('status', 'needs_review')
    } else if (filter === 'approved') {
      query = query.eq('status', 'approved')
    } else if (filter === 'denied') {
      query = query.eq('status', 'denied')
    }
    // 'all' shows everything

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: submissions, error } = await query.order('submitted_at', { ascending: false })

    if (error) {
      throw error
    }

    // Filter by course/section if needed (client-side filter for now)
    let filteredSubmissions = submissions || []
    if (courseType) {
      filteredSubmissions = filteredSubmissions.filter((sub: any) => 
        sub.checkpoint?.section?.category?.course_type === courseType
      )
    }
    if (sectionId) {
      filteredSubmissions = filteredSubmissions.filter((sub: any) => 
        sub.checkpoint?.section_id === sectionId
      )
    }

    // Get AI review stats
    const { data: allSubmissions } = await supabaseAdmin
      .from('user_checkpoints')
      .select('status, ai_status, ai_confidence')

    const stats = {
      total: allSubmissions?.length || 0,
      approved: allSubmissions?.filter((s: any) => s.status === 'approved').length || 0,
      denied: allSubmissions?.filter((s: any) => s.status === 'denied').length || 0,
      needsReview: allSubmissions?.filter((s: any) => s.status === 'needs_review').length || 0,
      aiApproved: allSubmissions?.filter((s: any) => s.ai_status === 'approved').length || 0,
      aiDenied: allSubmissions?.filter((s: any) => s.ai_status === 'denied').length || 0,
      avgConfidence: allSubmissions && allSubmissions.length > 0
        ? allSubmissions
            .filter((s: any) => s.ai_confidence !== null)
            .reduce((sum: number, s: any) => sum + (s.ai_confidence || 0), 0) /
          (allSubmissions.filter((s: any) => s.ai_confidence !== null).length || 1)
        : 0
    }

    return NextResponse.json({
      submissions: filteredSubmissions,
      stats
    })

  } catch (error: any) {
    console.error('Error fetching review queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review queue', message: error.message },
      { status: 500 }
    )
  }
}

// POST - Review submission (approve/deny)
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && !affiliate.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submissionId, status, feedback } = await request.json()

    if (!submissionId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: submissionId, status' },
        { status: 400 }
      )
    }

    if (!['approved', 'denied'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved or denied' },
        { status: 400 }
      )
    }

    // Update submission
    const { data: submission, error } = await (supabaseAdmin as any)
      .from('user_checkpoints')
      .update({
        status: status,
        admin_feedback: feedback || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select(`
        *,
        checkpoint:checkpoints(id, section_id)
      `)
      .single()

    if (error) {
      throw error
    }

    // If approved, unlock next sections/courses
    if (status === 'approved' && submission) {
      // Trigger unlock check (async)
      const checkpointId = (submission as any).checkpoint_id
      const userId = (submission as any).user_id
      
      // This will be handled by database functions or a separate unlock service
      console.log(`Checkpoint ${checkpointId} approved for user ${userId}. Unlock triggered.`)
    }

    return NextResponse.json({ submission })

  } catch (error: any) {
    console.error('Error reviewing submission:', error)
    return NextResponse.json(
      { error: 'Failed to review submission', message: error.message },
      { status: 500 }
    )
  }
}

