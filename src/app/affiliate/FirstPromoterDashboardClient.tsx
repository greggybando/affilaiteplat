'use client'

import { useState, useEffect } from 'react'
import { StatsCards } from './components/StatsCards'
import { HardcodedProductLinks } from './components/HardcodedProductLinks'

type FirstPromoterData = {
  promotions?: Array<{
    visitors_count?: number
    leads_count?: number
    customers_count?: number
    sales_count?: number
    sales_total?: number // in cents
    [key: string]: any
  }>
  earnings_balance?: {
    cash?: number // in cents
    [key: string]: any
  }
  paid_balance?: {
    cash?: number // in cents
    [key: string]: any
  }
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

  // Map FirstPromoter data to stats format
  // All values from FirstPromoter API are in cents, divide by 100 for display
  const promotion = fpData?.promotions && fpData.promotions.length > 0 ? fpData.promotions[0] : null
  
  const stats = fpData ? {
    affiliate_id: affiliate.id,
    email: affiliate.email,
    name: affiliate.name,
    subscription_status: affiliate.status,
    trial_ends_at: affiliate.trial_ends_at || '',
    total_clicks: promotion?.visitors_count || 0,
    sales_count: promotion?.sales_count || 0,
    revenue_cents: promotion?.sales_total || 0,
    commissions_cents: fpData.earnings_balance?.cash || 0,
    paid_cents: fpData.paid_balance?.cash || 0,
  } : null

  // Extract campaigns from response
  const campaigns = fpData?.promotions || []

  // Get ref_id from response or affiliate record
  const refId = fpData?.default_ref_id || fpData?.ref_id || (affiliate as any).fp_ref_id || null

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
        
        {/* Show hardcoded product links with fp_ref_id */}
        {refId ? (
          <HardcodedProductLinks refId={refId} />
        ) : (
          <div 
            className="rounded-xl overflow-hidden border p-8 text-center"
            style={{
              background: 'rgba(26,26,46,0.6)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255,255,255,0.1)'
            }}
          >
            <p className="text-[rgba(255,255,255,0.6)]">
              Your affiliate links will appear here once your account is set up.
            </p>
          </div>
        )}

      </section>
    </>
  )
}

