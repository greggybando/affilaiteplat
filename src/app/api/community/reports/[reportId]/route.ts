import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin/moderator
    if (affiliate.role !== 'admin' && affiliate.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, resolutionNotes } = body

    // Get report
    const { data: report } = await (supabaseAdmin.from('reports') as any)
      .select('*')
      .eq('id', params.reportId)
      .single()

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const updateData: any = {
      resolved_by: affiliate.id,
      resolved_at: new Date().toISOString()
    }

    if (action === 'resolve') {
      updateData.status = 'resolved'
    } else if (action === 'dismiss') {
      updateData.status = 'dismissed'
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // If deleting content, do that first
    if (body.deleteContent) {
      if (report.post_id) {
        await (supabaseAdmin.from('community_posts') as any)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', report.post_id)
      } else if (report.reply_id) {
        await (supabaseAdmin.from('community_replies') as any)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', report.reply_id)
      }
    }

    // If warning user
    if (body.warnUser) {
      const targetUserId = report.post_id 
        ? (await (supabaseAdmin.from('community_posts') as any).select('user_id').eq('id', report.post_id).single()).data?.user_id
        : (await (supabaseAdmin.from('community_replies') as any).select('user_id').eq('id', report.reply_id).single()).data?.user_id

      if (targetUserId) {
        // Create warning notification
        await (supabaseAdmin.from('notifications') as any).insert({
          user_id: targetUserId,
          actor_id: affiliate.id,
          type: 'mention', // Using mention type for warnings
          post_id: report.post_id,
          reply_id: report.reply_id
        })
      }
    }

    // If banning user
    if (body.banUser) {
      const targetUserId = report.post_id 
        ? (await (supabaseAdmin.from('community_posts') as any).select('user_id').eq('id', report.post_id).single()).data?.user_id
        : (await (supabaseAdmin.from('community_replies') as any).select('user_id').eq('id', report.reply_id).single()).data?.user_id

      if (targetUserId) {
        await (supabaseAdmin.from('affiliates') as any)
          .update({
            status: 'banned',
            banned_at: new Date().toISOString(),
            banned_by: affiliate.id
          })
          .eq('id', targetUserId)
      }
    }

    const { data: updatedReport, error } = await (supabaseAdmin.from('reports') as any)
      .update(updateData)
      .eq('id', params.reportId)
      .select()
      .single()

    if (error) throw error

    // Log admin action
    await (supabaseAdmin.from('admin_logs') as any).insert({
      admin_id: affiliate.id,
      action: `resolve_report_${action}`,
      target_type: 'report',
      target_id: params.reportId,
      details: { resolutionNotes, ...body }
    })

    return NextResponse.json({ report: updatedReport })
  } catch (error: any) {
    console.error('Error resolving report:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}






