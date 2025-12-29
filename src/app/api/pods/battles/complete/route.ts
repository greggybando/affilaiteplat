import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { awardTitle, revokeTitle, TITLES } from '@/lib/titles'
import { calculatePodWeightClass } from '@/lib/pod-battles'

// This should be called by a cron job or scheduled task to complete expired battles
export async function POST(request: NextRequest) {
  try {
    const now = new Date()

    // Find all active battles that have ended
    const { data: expiredBattles } = await supabaseAdmin
      .from('pod_battles')
      .select('*')
      .eq('status', 'active')
      .lte('end_date', now.toISOString())

    if (!expiredBattles || expiredBattles.length === 0) {
      return NextResponse.json({ message: 'No battles to complete', completed: 0 })
    }

    let completed = 0

    for (const battle of expiredBattles) {
      const battleData = battle as any

      // Get battle stats
      const { data: stats } = await supabaseAdmin
        .from('pod_battle_stats')
        .select('*')
        .eq('battle_id', battleData.id)

      if (!stats || stats.length !== 2) {
        console.error('Invalid battle stats for battle:', battleData.id)
        continue
      }

      const challengerStats = stats.find((s: any) => s.pod_id === battleData.challenger_pod_id) as any
      const defenderStats = stats.find((s: any) => s.pod_id === battleData.defender_pod_id) as any

      if (!challengerStats || !defenderStats) {
        console.error('Missing stats for battle:', battleData.id)
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

      const challengerSalesPerMember =
        (challengerStats.total_sales || 0) / challengerMemberCount
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
        .update({
          sales_per_member: challengerSalesPerMember,
        })
        .eq('battle_id', battleData.id)
        .eq('pod_id', battleData.challenger_pod_id)

      await (supabaseAdmin.from('pod_battle_stats') as any)
        .update({
          sales_per_member: defenderSalesPerMember,
        })
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

      if (!winnerPodId) {
        console.error('No winner determined for battle:', battleData.id)
        continue
      }

      const loserPodId = winnerPodId === battleData.challenger_pod_id
        ? battleData.defender_pod_id
        : battleData.challenger_pod_id

      // Get pod leaders for title awarding
      const { data: winnerPod } = await supabaseAdmin
        .from('pods')
        .select('created_by')
        .eq('id', winnerPodId)
        .maybeSingle()

      const { data: loserPod } = await supabaseAdmin
        .from('pods')
        .select('created_by')
        .eq('id', loserPodId)
        .maybeSingle()

      const winnerLeaderId = winnerPod ? (winnerPod as any).created_by : null
      const loserLeaderId = loserPod ? (loserPod as any).created_by : null

      // Award titles and handle prizes
      if (winnerPodId && winnerLeaderId) {
        // Get weight classes for title calculations
        const challengerClass = await calculatePodWeightClass(battleData.challenger_pod_id, supabaseAdmin as any)
        const defenderClass = await calculatePodWeightClass(battleData.defender_pod_id, supabaseAdmin as any)
        const classDiff = Math.abs(challengerClass.level - defenderClass.level)

        // Award "Undefeated" title (will be revoked on next loss)
        await awardTitle(winnerLeaderId, 'undefeated', supabaseAdmin)

        // Award "Giant Killer" if beat pod 2+ levels above
        if (classDiff >= 2) {
          const wasUnderdog = (winnerPodId === battleData.challenger_pod_id && challengerClass.level < defenderClass.level) ||
                              (winnerPodId === battleData.defender_pod_id && defenderClass.level < challengerClass.level)
          if (wasUnderdog) {
            await awardTitle(winnerLeaderId, 'giant_killer', supabaseAdmin)
            await awardTitle(winnerLeaderId, 'underdog', supabaseAdmin)
          }
        }

        // Check win streak for "Ironman" title
        const { data: recentWins } = await supabaseAdmin
          .from('pod_battles')
          .select('id')
          .or(`challenger_pod_id.eq.${winnerPodId},defender_pod_id.eq.${winnerPodId}`)
          .eq('status', 'completed')
          .eq('winner_pod_id', winnerPodId)
          .order('end_date', { ascending: false })
          .limit(5)

        if ((recentWins || []).length >= 5) {
          await awardTitle(winnerLeaderId, 'ironman', supabaseAdmin)
        }

        // Check defense count for "Defender" title
        const { data: defenses } = await supabaseAdmin
          .from('pod_battles')
          .select('id')
          .eq('defender_pod_id', winnerPodId)
          .eq('status', 'completed')
          .eq('winner_pod_id', winnerPodId)

        if ((defenses || []).length >= 3) {
          await awardTitle(winnerLeaderId, 'defender', supabaseAdmin)
        }
      }

      // Revoke "Undefeated" title from loser
      if (loserLeaderId) {
        await revokeTitle(loserLeaderId, 'undefeated', supabaseAdmin)
      }

      // Apply prize based on type
      if (battleData.prize_type === 'commission_boost' && winnerPodId) {
        const { data: winnerMembers } = await supabaseAdmin
          .from('pod_members')
          .select('affiliate_id')
          .eq('pod_id', winnerPodId)
          .eq('status', 'accepted')

        if (winnerMembers) {
          const affiliateIds = winnerMembers.map((m: any) => m.affiliate_id)
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

          // Update all winning pod members
          for (const memberId of affiliateIds) {
            // Check if already has boost
            const { data: affiliate } = await supabaseAdmin
              .from('affiliates')
              .select('commission_boost_percent, commission_boost_expires_at')
              .eq('id', memberId)
              .maybeSingle()

            if (affiliate) {
              const affData = affiliate as any
              const currentExpires = affData.commission_boost_expires_at
                ? new Date(affData.commission_boost_expires_at)
                : null

              // If boost exists and hasn't expired, extend it; otherwise set new boost
              if (currentExpires && currentExpires > new Date()) {
                // Extend expiration
                await (supabaseAdmin.from('affiliates') as any)
                  .update({
                    commission_boost_expires_at: expiresAt.toISOString(),
                  })
                  .eq('id', memberId)
              } else {
                // Set new boost
                await (supabaseAdmin.from('affiliates') as any)
                  .update({
                    commission_boost_percent: 10,
                    commission_boost_expires_at: expiresAt.toISOString(),
                  })
                  .eq('id', memberId)
              }
            }
          }
        }
      }

      // Handle member steal (only if win margin > 20% and prize is member_steal)
      if (battleData.prize_type === 'member_steal' && winMarginPercent && winMarginPercent > 20 && winnerPodId) {
        // Create a special "recruitment invite" that winner leader can use
        // This will be handled via a separate API endpoint when leader picks a member
        // For now, just mark that member steal is available
        console.log(`Member steal available: Winner pod ${winnerPodId} can recruit from ${loserPodId}`)
      }

      // Check for bounties and auto-claim if target pod was beaten
      const { data: activeBounties } = await supabaseAdmin
        .from('bounties')
        .select('*')
        .eq('target_pod_id', loserPodId)
        .eq('product_id', battleData.product_id)
        .eq('status', 'active')
        .gte('expires_at', now.toISOString())

      if (activeBounties && activeBounties.length > 0) {
        for (const bounty of activeBounties) {
          const bountyData = bounty as any
          
          // Claim bounty
          await (supabaseAdmin.from('bounties') as any)
            .update({
              status: 'claimed',
              claimed_by_pod_id: winnerPodId,
            })
            .eq('id', bountyData.id)

          // Apply reward
          if (bountyData.reward_type === 'cash') {
            // Add to payout balance for all winner pod members
            const { data: winnerMembers } = await supabaseAdmin
              .from('pod_members')
              .select('affiliate_id')
              .eq('pod_id', winnerPodId)
              .eq('status', 'accepted')

            if (winnerMembers) {
              const perMember = Math.floor(bountyData.reward_amount_cents / (winnerMembers.length || 1))
              for (const member of winnerMembers) {
                // Update affiliate stats (this would need to be done via RPC or direct update)
                // For now, log it - would need to integrate with payout system
                console.log(`Bounty reward: ${perMember} cents to affiliate ${(member as any).affiliate_id}`)
              }
            }
          } else if (bountyData.reward_type === 'commission_boost') {
            // Apply commission boost to all winner pod members
            const { data: winnerMembers } = await supabaseAdmin
              .from('pod_members')
              .select('affiliate_id')
              .eq('pod_id', winnerPodId)
              .eq('status', 'accepted')

            if (winnerMembers) {
              const expiresAt = new Date()
              expiresAt.setDate(expiresAt.getDate() + 7)

              for (const member of winnerMembers) {
                await (supabaseAdmin.from('affiliates') as any)
                  .update({
                    commission_boost_percent: 10,
                    commission_boost_expires_at: expiresAt.toISOString(),
                  })
                  .eq('id', (member as any).affiliate_id)
              }
            }
          }
        }
      }

      completed++
    }

    return NextResponse.json({ message: 'Battles completed', completed })
  } catch (error: any) {
    console.error('Complete battles error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

