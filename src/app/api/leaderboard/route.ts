import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get top 10 affiliates with at least 1 sale, ordered by total sales (paid_cents)
    // Only include affiliates who have at least 1 conversion
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('affiliate_stats')
      .select('affiliate_id, name, email, paid_cents, total_conversions, total_clicks, approved_cents')
      .gt('total_conversions', 0) // Only affiliates with at least 1 sale
      .order('paid_cents', { ascending: false })
      .limit(10) // Top 10 only

    if (statsError) {
      console.error('Error fetching leaderboard stats:', statsError)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }

    if (!statsData || statsData.length === 0) {
      return NextResponse.json({ leaderboard: [] })
    }

    // Get affiliate IDs to fetch avatar and title data
    const affiliateIds = statsData.map((s: any) => s.affiliate_id)

    // Fetch affiliate details (avatar, titles, signature)
    const { data: affiliatesData, error: affiliatesError } = await supabaseAdmin
      .from('affiliates')
      .select(`
        id,
        avatar_name,
        avatar_url,
        signature,
        titles:affiliate_titles (
          title_slug
        )
      `)
      .in('id', affiliateIds)

    if (affiliatesError) {
      console.error('Error fetching affiliate details:', affiliatesError)
      console.error('Affiliate details error:', JSON.stringify(affiliatesError, null, 2))
      // Continue without avatar/title data, but log the error
    }

    const affiliatesDataTyped = affiliatesData as any[]
    console.log('Fetched affiliate details:', {
      count: affiliatesDataTyped?.length || 0,
      affiliateIds: affiliateIds.length,
      sample: affiliatesDataTyped?.[0] ? {
        id: affiliatesDataTyped[0].id,
        hasAvatarUrl: !!affiliatesDataTyped[0].avatar_url,
        avatarName: affiliatesDataTyped[0].avatar_name
      } : null
    })

    // Create a map for quick lookup
    const affiliatesMap = new Map()
    if (affiliatesDataTyped) {
      affiliatesDataTyped.forEach((aff: any) => {
        affiliatesMap.set(aff.id, {
          avatar_name: aff.avatar_name,
          avatar_url: aff.avatar_url,
          signature: aff.signature || null,
          titles: (aff.titles || []).map((t: any) => t.title_slug)
        })
      })
    }

    // Format data
    const formatted = statsData.map((stats: any, index: number) => {
      const affiliateData = affiliatesMap.get(stats.affiliate_id) || {}
      const totalSales = stats.paid_cents || 0
      const conversions = stats.total_conversions || 0
      const earnings = stats.approved_cents || 0

      const result = {
        rank: index + 1,
        affiliateId: stats.affiliate_id,
        avatarName: affiliateData.avatar_name || stats.name,
        avatarUrl: affiliateData.avatar_url || null,
        totalRevenue: totalSales / 100,
        conversions,
        earnings: earnings / 100,
        signature: affiliateData.signature || null,
        titles: affiliateData.titles || [],
      }

      // Log if avatar_url is missing
      if (!result.avatarUrl && affiliateData.avatar_name) {
        console.warn(`Missing avatar_url for affiliate ${stats.affiliate_id} (${affiliateData.avatar_name})`)
      }

      return result
    })

    return NextResponse.json({ leaderboard: formatted })
  } catch (error: any) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

