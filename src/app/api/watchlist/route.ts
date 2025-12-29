import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Get watch list
export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all affiliates in watch list
    const { data: watchList, error } = await supabaseAdmin
      .from('watch_lists')
      .select(`
        watched_affiliate_id,
        created_at,
        watched_affiliate:affiliates!watch_lists_watched_affiliate_id_fkey (
          id,
          name,
          email,
          avatar_name,
          avatar_url
        )
      `)
      .eq('affiliate_id', affiliate.id)

    if (error) {
      console.error('Error fetching watch list:', error)
      return NextResponse.json({ error: 'Failed to fetch watch list' }, { status: 500 })
    }

    // Get stats for watched affiliates
    const watchedIds = (watchList || []).map((w: any) => w.watched_affiliate_id)
    
    if (watchedIds.length === 0) {
      return NextResponse.json({ watchList: [] })
    }

    const { data: stats } = await supabaseAdmin
      .from('affiliate_stats')
      .select('*')
      .in('affiliate_id', watchedIds)

    // Fetch affiliate details (signature)
    const { data: affiliatesData } = await supabaseAdmin
      .from('affiliates')
      .select('id, signature')
      .in('id', watchedIds)

    // Create a map for quick lookup
    const affiliatesMap = new Map()
    if (affiliatesData) {
      affiliatesData.forEach((aff: any) => {
        affiliatesMap.set(aff.id, {
          signature: aff.signature || null
        })
      })
    }

    // Combine data
    const formatted = (watchList || []).map((item: any) => {
      const watchedAffiliate = item.watched_affiliate as any
      const affiliateStats = (stats || []).find((s: any) => s.affiliate_id === watchedAffiliate.id) as any
      const affiliateData = affiliatesMap.get(watchedAffiliate.id) || {}
      
      const totalSales = affiliateStats?.paid_cents || 0
      const conversions = affiliateStats?.total_conversions || 0
      const earnings = affiliateStats?.approved_cents || 0

      return {
        affiliateId: watchedAffiliate.id,
        avatarName: watchedAffiliate.avatar_name || watchedAffiliate.name,
        avatarUrl: watchedAffiliate.avatar_url || null,
        totalRevenue: totalSales / 100,
        conversions,
        earnings: earnings / 100,
        signature: affiliateData.signature || null,
      }
    })

    // Sort by total revenue
    formatted.sort((a, b) => b.totalRevenue - a.totalRevenue)

    return NextResponse.json({ watchList: formatted })
  } catch (error: any) {
    console.error('Watch list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add to watch list
export async function POST(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { watchedAffiliateId } = body

    if (!watchedAffiliateId) {
      return NextResponse.json({ error: 'watchedAffiliateId is required' }, { status: 400 })
    }

    if (watchedAffiliateId === affiliate.id) {
      return NextResponse.json({ error: 'Cannot add yourself to watch list' }, { status: 400 })
    }

    // Check if already in watch list
    const { data: existing } = await supabaseAdmin
      .from('watch_lists')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('watched_affiliate_id', watchedAffiliateId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already in watch list' }, { status: 400 })
    }

    // Add to watch list
    const { error } = await (supabaseAdmin
      .from('watch_lists') as any)
      .insert({
        affiliate_id: affiliate.id,
        watched_affiliate_id: watchedAffiliateId,
      })

    if (error) {
      console.error('Error adding to watch list:', error)
      return NextResponse.json({ error: 'Failed to add to watch list' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Add to watch list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove from watch list
export async function DELETE(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const watchedAffiliateId = searchParams.get('watchedAffiliateId')

    if (!watchedAffiliateId) {
      return NextResponse.json({ error: 'watchedAffiliateId is required' }, { status: 400 })
    }

    const { error } = await (supabaseAdmin
      .from('watch_lists') as any)
      .delete()
      .eq('affiliate_id', affiliate.id)
      .eq('watched_affiliate_id', watchedAffiliateId)

    if (error) {
      console.error('Error removing from watch list:', error)
      return NextResponse.json({ error: 'Failed to remove from watch list' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Remove from watch list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

