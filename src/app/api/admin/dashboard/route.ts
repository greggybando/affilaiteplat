import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const MONTHLY_PRICE = 47 // $47/month

export async function GET(request: NextRequest) {
  try {
    const affiliate = await getCurrentAffiliate()
    if (!affiliate || (affiliate.role !== 'admin' && affiliate.role !== 'moderator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'this_month' // this_month, last_month, last_90_days, all_time

    // Calculate date range
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    switch (period) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = now
        break
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        endDate = now
        break
      case 'all_time':
        startDate = null
        endDate = null
        break
    }

    // Build date filters
    let signupsQuery = supabaseAdmin.from('affiliates').select('id, email, name, created_at, subscription_started_at, status')
    let cancellationsQuery = supabaseAdmin.from('cancellations').select('id, affiliate_id, email, name, canceled_at, subscription_start_date, reason')

    if (startDate) {
      signupsQuery = signupsQuery.gte('created_at', startDate.toISOString())
      cancellationsQuery = cancellationsQuery.gte('canceled_at', startDate.toISOString())
    }
    if (endDate) {
      signupsQuery = signupsQuery.lte('created_at', endDate.toISOString())
      cancellationsQuery = cancellationsQuery.lte('canceled_at', endDate.toISOString())
    }

    // Fetch signups
    const { data: signups, error: signupsError } = await signupsQuery.order('created_at', { ascending: false })
    if (signupsError) throw signupsError

    // Fetch cancellations
    const { data: cancellations, error: cancellationsError } = await cancellationsQuery.order('canceled_at', { ascending: false })
    if (cancellationsError) throw cancellationsError

    // Fetch active subscribers (status = 'active')
    const { data: activeSubscribers, error: activeError } = await supabaseAdmin
      .from('affiliates')
      .select('id, status')
      .eq('status', 'active')
    
    if (activeError) throw activeError

    // Calculate metrics
    const newSignups = signups?.length || 0
    const churns = cancellations?.length || 0
    const activeSubscribersCount = activeSubscribers?.length || 0
    const estimatedMRR = activeSubscribersCount * MONTHLY_PRICE

    // Calculate churn rate (churns / (active + churns))
    const churnRate = activeSubscribersCount + churns > 0 
      ? (churns / (activeSubscribersCount + churns)) * 100 
      : 0

    // Calculate average subscription length for churned users
    let avgSubscriptionLengthDays = 0
    let avgSubscriptionLengthMonths = 0
    if (cancellations && cancellations.length > 0) {
      const lengths = cancellations
        .filter(c => c.subscription_start_date)
        .map(c => {
          const start = new Date(c.subscription_start_date)
          const end = new Date(c.canceled_at)
          return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
        })
        .filter(l => l > 0)

      if (lengths.length > 0) {
        avgSubscriptionLengthDays = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
        avgSubscriptionLengthMonths = Math.round((avgSubscriptionLengthDays / 30) * 10) / 10
      }
    }

    // Calculate LTV (average subscription length × monthly price)
    const ltv = avgSubscriptionLengthMonths * MONTHLY_PRICE

    // Group signups by day for chart
    const signupsByDay: Record<string, number> = {}
    signups?.forEach(signup => {
      const date = new Date(signup.created_at).toISOString().split('T')[0]
      signupsByDay[date] = (signupsByDay[date] || 0) + 1
    })

    // Format cancellations with subscription length
    const formattedCancellations = (cancellations || []).map(c => {
      let subscriptionLengthDays = 0
      let subscriptionLengthMonths = 0
      if (c.subscription_start_date) {
        const start = new Date(c.subscription_start_date)
        const end = new Date(c.canceled_at)
        subscriptionLengthDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
        subscriptionLengthMonths = Math.round((subscriptionLengthDays / 30) * 10) / 10
      }
      return {
        ...c,
        subscriptionLengthDays,
        subscriptionLengthMonths
      }
    })

    return NextResponse.json({
      metrics: {
        newSignups,
        churns,
        churnRate: Math.round(churnRate * 10) / 10,
        estimatedMRR,
        ltv: Math.round(ltv * 100) / 100,
        avgSubscriptionLengthDays,
        avgSubscriptionLengthMonths,
        activeSubscribersCount
      },
      signupsByDay,
      cancellations: formattedCancellations,
      period
    })
  } catch (error: any) {
    console.error('Error fetching admin dashboard data:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

