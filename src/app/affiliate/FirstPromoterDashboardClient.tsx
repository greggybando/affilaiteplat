'use client'

import { useState, useEffect } from 'react'
import { StatsCards } from './components/StatsCards'
import { FirstPromoterProductList } from './components/FirstPromoterProductList'

type FirstPromoterData = {
  clicks?: number
  sales?: number
  conversions?: number
  pending_revenue?: number
  approved_revenue?: number
  paid_revenue?: number
  campaigns?: any[]
  offers?: any[]
  promotions?: any[]
  default_ref_id?: string
  ref_id?: string
  [key: string]: any
}

export function FirstPromoterDashboardClient({ affiliate }: { affiliate: any }) {
  const [fpData, setFpData] = useState<FirstPromoterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/affiliate/firstpromoter-stats')
        const result = await res.json()

        if (!res.ok) {
          console.error('❌ API error:', result)
          setError(result.error || 'Failed to fetch data')
          setFpData(null)
          return
        }

        console.log('✅ Received FirstPromoter data:', result.data)
        setFpData(result.data || {})
      } catch (err: any) {
        console.error('❌ Error fetching FirstPromoter data:', err)
        setError(err.message || 'Failed to fetch data')
        setFpData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Map FirstPromoter data to AffiliateStats format
  const stats = fpData ? {
    affiliate_id: affiliate.id,
    email: affiliate.email,
    name: affiliate.name,
    subscription_status: affiliate.status,
    trial_ends_at: affiliate.trial_ends_at || '',
    total_links: 0,
    total_clicks: fpData.clicks || 0,
    total_conversions: fpData.sales || fpData.conversions || 0,
    pending_cents: Math.round((fpData.pending_revenue || 0) * 100),
    approved_cents: Math.round((fpData.approved_revenue || 0) * 100),
    locked_cents: 0,
    paid_cents: Math.round((fpData.paid_revenue || 0) * 100),
  } : null

  // Extract campaigns from response
  const campaigns = fpData ? (
    fpData.campaigns || 
    fpData.offers || 
    fpData.promotions || 
    []
  ) : []

  // Get ref_id from response or affiliate record
  const refId = fpData?.default_ref_id || fpData?.ref_id || affiliate.fp_ref_id || null

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[rgba(255,255,255,0.6)]">Loading affiliate data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border p-6 mb-6" style={{
        background: 'rgba(239,68,68,0.1)',
        borderColor: 'rgba(239,68,68,0.3)',
      }}>
        <p className="text-red-400 font-semibold mb-2">Error loading data</p>
        <p className="text-sm text-[rgba(255,255,255,0.6)]">{error}</p>
      </div>
    )
  }

  return (
    <>
      {/* Stats */}
      {stats && <StatsCards stats={stats} affiliate={affiliate} />}

      {/* Products */}
      <section className="mt-6 pb-8">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300 mb-4" style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.5)' }}>
          Available Products
        </h2>
        {campaigns.length > 0 ? (
          <FirstPromoterProductList campaigns={campaigns} refId={refId} />
        ) : (
          <div 
            className="rounded-xl overflow-hidden border p-8 text-center"
            style={{
              background: 'rgba(26,26,46,0.6)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255,255,255,0.1)'
            }}
          >
            <p className="text-[rgba(255,255,255,0.6)] mb-4">
              No campaigns found. Showing default referral link.
            </p>
            {refId && (
              <div className="max-w-2xl mx-auto">
                <p className="text-sm text-[rgba(255,255,255,0.5)] mb-2">Your default referral link:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`https://www.millionairelifedesign.com?fpr=${refId}`}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg text-white text-xs font-mono"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://www.millionairelifedesign.com?fpr=${refId}`)
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                      color: '#0f0f1a',
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}

