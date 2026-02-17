import { redirect } from 'next/navigation'
import { getCurrentAffiliate } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { PayoutRequestButton } from './PayoutRequestButton'

async function getAffiliateStats(affiliateId: string, fpPromoterId: string | null) {
  // Fetch stats from FirstPromoter API using promoter_id
  if (!process.env.FIRSTPROMOTER_API_KEY || !fpPromoterId) {
    console.warn('FirstPromoter API key or promoter ID not configured, returning empty stats')
    return {
      total_clicks: 0,
      total_conversions: 0,
      pending_cents: 0,
      approved_cents: 0,
      locked_cents: 0,
      paid_cents: 0,
    }
  }

  try {
    const response = await fetch(
      `https://firstpromoter.com/api/v1/promoters/show?id=${encodeURIComponent(fpPromoterId)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': process.env.FIRSTPROMOTER_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return {
          total_clicks: 0,
          total_conversions: 0,
          pending_cents: 0,
          approved_cents: 0,
          locked_cents: 0,
          paid_cents: 0,
        }
      }
      
      const errorText = await response.text()
      console.error('FirstPromoter API error:', response.status, errorText)
      throw new Error(`FirstPromoter API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      total_clicks: data.clicks || data.total_clicks || data.visits || 0,
      total_conversions: data.conversions || data.total_conversions || data.sales || 0,
      pending_cents: Math.round((data.pending || data.pending_amount || 0) * 100),
      approved_cents: Math.round((data.approved || data.approved_amount || data.available || 0) * 100),
      locked_cents: 0, // FirstPromoter may not have this concept
      paid_cents: Math.round((data.paid || data.paid_amount || data.total_earned || data.total_paid || 0) * 100),
    }
  } catch (error: any) {
    console.error('Error fetching FirstPromoter stats:', error)
    return {
      total_clicks: 0,
      total_conversions: 0,
      pending_cents: 0,
      approved_cents: 0,
      locked_cents: 0,
      paid_cents: 0,
    }
  }
}

async function getPayouts(affiliateId: string) {
  const { data: payouts } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false })

  return payouts || []
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'text-green-400'
    case 'processing':
      return 'text-yellow-400'
    case 'pending':
      return 'text-gray-400'
    case 'failed':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'processing':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'pending':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    case 'failed':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

export default async function PayoutsPage() {
  // Server-side auth check - trust the server
  console.log('🔍 PayoutsPage: Starting authentication check...')
  const affiliate = await getCurrentAffiliate()

  if (!affiliate) {
    console.log('❌ PayoutsPage: No affiliate found, redirecting to login')
    redirect('/login')
  }

  console.log('✅ PayoutsPage: Affiliate authenticated:', {
    id: affiliate.id,
    name: affiliate.name,
    email: affiliate.email,
  })

  const [stats, payouts] = await Promise.all([
    getAffiliateStats(affiliate.id, (affiliate as any).fp_promoter_id),
    getPayouts(affiliate.id),
  ])

  const availableBalance = stats?.approved_cents || 0
  const pendingBalance = stats?.pending_cents || 0
  const lockedBalance = stats?.locked_cents || 0
  const totalPaid = stats?.paid_cents || 0

  // Group payouts by status
  const pendingPayouts = payouts.filter((p: any) => p.status === 'pending')
  const processingPayouts = payouts.filter((p: any) => p.status === 'processing')
  const completedPayouts = payouts.filter((p: any) => p.status === 'completed')
  const failedPayouts = payouts.filter((p: any) => p.status === 'failed')

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400 mb-1">Available Balance</p>
            <p className="text-2xl font-bold text-green-400">
              ${(availableBalance / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Ready for payout</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">
              ${(pendingBalance / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400 mb-1">Locked</p>
            <p className="text-2xl font-bold text-gray-400">
              ${(lockedBalance / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Subscription required</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-white">
              ${(totalPaid / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>
        </div>

        {/* Request Payout Button */}
        {availableBalance > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Request Payout</h2>
                <p className="text-sm text-gray-400">
                  You have ${(availableBalance / 100).toFixed(2)} available for payout
                </p>
              </div>
              <PayoutRequestButton
                affiliateId={affiliate.id}
                availableBalance={availableBalance}
                payoutMethod={affiliate.payout_method}
              />
            </div>
          </div>
        )}

        {/* Payout History */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Payout History</h2>

          {/* Pending Payouts */}
          {pendingPayouts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Pending</h3>
              <div className="space-y-3">
                {pendingPayouts.map((payout: any) => (
                  <div
                    key={payout.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadgeColor(payout.status)}`}>
                          {payout.status.toUpperCase()}
                        </span>
                        <span className="text-white font-semibold">
                          ${(payout.amount_cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Requested {formatDate(payout.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {payout.conversion_ids?.length || 0} conversion{payout.conversion_ids?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing Payouts */}
          {processingPayouts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Processing</h3>
              <div className="space-y-3">
                {processingPayouts.map((payout: any) => (
                  <div
                    key={payout.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadgeColor(payout.status)}`}>
                          {payout.status.toUpperCase()}
                        </span>
                        <span className="text-white font-semibold">
                          ${(payout.amount_cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Processing since {formatDate(payout.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400 capitalize">
                        {payout.payout_method || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Payouts */}
          {completedPayouts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Completed</h3>
              <div className="space-y-3">
                {completedPayouts.map((payout: any) => (
                  <div
                    key={payout.id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadgeColor(payout.status)}`}>
                          {payout.status.toUpperCase()}
                        </span>
                        <span className="text-white font-semibold">
                          ${(payout.amount_cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Completed {formatDate(payout.completed_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400 capitalize">
                        {payout.payout_method || 'N/A'}
                      </p>
                      {payout.stripe_transfer_id && (
                        <p className="text-xs text-gray-500 mt-1">
                          Transfer: {payout.stripe_transfer_id.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Payouts */}
          {failedPayouts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Failed</h3>
              <div className="space-y-3">
                {failedPayouts.map((payout: any) => (
                  <div
                    key={payout.id}
                    className="bg-gray-900 border border-red-500/30 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadgeColor(payout.status)}`}>
                          {payout.status.toUpperCase()}
                        </span>
                        <span className="text-white font-semibold">
                          ${(payout.amount_cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Failed {formatDate(payout.created_at)}
                      </p>
                      {payout.notes && (
                        <p className="text-xs text-red-400 mt-1">{payout.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {payouts.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-400">No payout history yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Your completed payouts will appear here
              </p>
            </div>
          )}
        </div>
    </main>
  )
}

