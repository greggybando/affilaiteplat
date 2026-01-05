'use client'

import { useState } from 'react'
import type { Affiliate, AffiliateStats } from '@/lib/supabase'

export function ResubscribeClient({
  affiliate,
  stats,
}: {
  affiliate: Affiliate
  stats: AffiliateStats | null
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

  async function handleSubscribe() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to create checkout session')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Failed to create checkout session')
      setIsLoading(false)
    }
  }

  const totalEarnings = stats
    ? (stats.pending_cents + stats.approved_cents + stats.locked_cents + stats.paid_cents) / 100
    : 0
  const totalConversions = stats?.total_conversions || 0

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b border-gray-800 p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-3">
              Your Subscription Has Ended
            </h1>
            <p className="text-gray-400 text-lg">
              Resubscribe to restore access to LifeDesign Platform
            </p>
          </div>

          {/* Frozen Stats */}
          <div className="p-8 border-b border-gray-800 bg-gray-800/30">
            <h2 className="text-xl font-semibold text-white mb-4">Your Frozen Stats</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-white">${totalEarnings.toFixed(2)}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Total Conversions</p>
                <p className="text-3xl font-bold text-white">{totalConversions}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Your stats are frozen until you resubscribe. Once you resubscribe, you'll regain full access to your portal and can continue earning commissions.
            </p>
          </div>

          {/* Subscription Options */}
          <div className="p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Choose Your Plan</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedPlan === 'monthly'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="text-center">
                  <p className="text-2xl font-bold text-white mb-1">$40</p>
                  <p className="text-sm text-gray-400">per month</p>
                  {selectedPlan === 'monthly' && (
                    <p className="text-xs text-green-400 mt-2 font-semibold">✓ Selected</p>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedPlan === 'yearly'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="text-center">
                  <p className="text-2xl font-bold text-white mb-1">$360</p>
                  <p className="text-sm text-gray-400">per year</p>
                  <p className="text-xs text-green-400 mt-1">Save $120</p>
                  {selectedPlan === 'yearly' && (
                    <p className="text-xs text-green-400 mt-2 font-semibold">✓ Selected</p>
                  )}
                </div>
              </button>
            </div>

            {/* CTA */}
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              {isLoading
                ? 'Processing...'
                : selectedPlan === 'monthly'
                ? 'Resubscribe for $40/month'
                : 'Resubscribe for $360/year'}
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Cancel anytime. Your links stay active as long as you're subscribed.
            </p>
          </div>
        </div>

        {/* Help */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Questions?{' '}
          <a href="mailto:support@yourdomain.com" className="text-green-400 hover:text-green-300">
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}


