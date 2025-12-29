import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, etc.)
// It auto-completes battles that have passed their end_date
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if set (for security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find all active battles that have ended
    const { data: expiredBattles, error: fetchError } = await (supabaseAdmin
      .from('pod_battles') as any)
      .select('*')
      .eq('status', 'active')
      .lte('end_date', now.toISOString())

    if (fetchError) {
      console.error('Error fetching expired battles:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch battles' }, { status: 500 })
    }

    if (!expiredBattles || expiredBattles.length === 0) {
      return NextResponse.json({ message: 'No battles to complete', completed: 0 })
    }

    let completed = 0
    const errors: string[] = []

    for (const battle of expiredBattles) {
      const battleData = battle as any

      try {
        // Get battle stats
        const { data: stats } = await supabaseAdmin
          .from('pod_battle_stats')
          .select('*')
          .eq('battle_id', battleData.id)

        if (!stats || stats.length !== 2) {
          errors.push(`Battle ${battleData.id}: Invalid battle stats`)
          continue
        }

        const challengerStats = stats.find((s: any) => s.pod_id === battleData.challenger_pod_id) as any
        const defenderStats = stats.find((s: any) => s.pod_id === battleData.defender_pod_id) as any

        if (!challengerStats || !defenderStats) {
          errors.push(`Battle ${battleData.id}: Missing stats`)
          continue
        }

        // Get member counts
        const { data: challengerMembers } = await supabaseAdmin
          .from('pod_members')
          .select('id')
          .eq('pod_id', battleData.challenger_pod_id)
          .eq('status', 'accepted')

        const { data: defenderMembers } = await supabaseAdmin
          .from('pod_members')
          .select('id')
          .eq('pod_id', battleData.defender_pod_id)
          .eq('status', 'accepted')

        const challengerMemberCount = (challengerMembers || []).length || 1
        const defenderMemberCount = (defenderMembers || []).length || 1

        const challengerSalesPerMember = (challengerStats.total_sales || 0) / challengerMemberCount
        const defenderSalesPerMember = (defenderStats.total_sales || 0) / defenderMemberCount

        // Determine winner (tie goes to defender)
        let winnerPodId: string | null = null
        let winMarginPercent: number | null = null
        
        if (challengerSalesPerMember > defenderSalesPerMember) {
          winnerPodId = battleData.challenger_pod_id
          winMarginPercent = defenderSalesPerMember > 0
            ? ((challengerSalesPerMember - defenderSalesPerMember) / defenderSalesPerMember) * 100
            : 100
        } else {
          winnerPodId = battleData.defender_pod_id
          winMarginPercent = challengerSalesPerMember > 0
            ? ((defenderSalesPerMember - challengerSalesPerMember) / challengerSalesPerMember) * 100
            : 100
        }

        // Update battle stats with sales_per_member
        await (supabaseAdmin.from('pod_battle_stats') as any)
          .update({ sales_per_member: challengerSalesPerMember })
          .eq('battle_id', battleData.id)
          .eq('pod_id', battleData.challenger_pod_id)

        await (supabaseAdmin.from('pod_battle_stats') as any)
          .update({ sales_per_member: defenderSalesPerMember })
          .eq('battle_id', battleData.id)
          .eq('pod_id', battleData.defender_pod_id)

        // Update battle
        await (supabaseAdmin.from('pod_battles') as any)
          .update({
            status: 'completed',
            winner_pod_id: winnerPodId,
            win_margin_percent: winMarginPercent,
          })
          .eq('id', battleData.id)

        // Note: Full prize and title logic is handled in /api/pods/battles/complete
        // This cron job just marks battles as completed with winners

        completed++
        console.log(`Auto-completed battle ${battleData.id}, winner: ${winnerPodId}`)
      } catch (err: any) {
        errors.push(`Battle ${battleData.id}: ${err.message}`)
        console.error(`Error completing battle ${battleData.id}:`, err)
      }
    }

    return NextResponse.json({
      message: `Completed ${completed} of ${expiredBattles.length} battles`,
      completed,
      total: expiredBattles.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

