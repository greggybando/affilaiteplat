'use client'

import { useState } from 'react'
import type { Affiliate, AffiliateStats } from '@/lib/supabase'

export function SubscriptionPaywall({
  affiliate,
  stats,
}: {
  affiliate: Affiliate
  stats: AffiliateStats | null
}) {
  const [isLoading, setIsLoading] = useState(false)

  const lockedAmount = stats?.locked_cents || 0
  const hasLockedEarnings = lockedAmount > 0

  async function handleSubscribe() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-gray-800 p-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              Your Trial Has Ended
            </h1>
            <p className="text-gray-400">
              Subscribe to continue earning commissions
            </p>
          </div>

          {/* Locked Earnings */}
          {hasLockedEarnings && (
            <div className="p-6 border-b border-gray-800 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-400 font-medium">
                    🔒 Locked Earnings
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    ${(lockedAmount / 100).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    Subscribe to unlock
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-3">
                You've earned commissions during your trial. Subscribe now and
                we'll release them for payout.
              </p>
            </div>
          )}

          {/* Stats Preview (blurred/locked) */}
          <div className="p-6 border-b border-gray-800">
            <p className="text-sm text-gray-400 mb-4">Your performance</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xl font-bold text-white/50">
                  {stats?.total_clicks || 0}
                </p>
                <p className="text-xs text-gray-500">Clicks</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xl font-bold text-white/50">
                  {stats?.total_conversions || 0}
                </p>
                <p className="text-xs text-gray-500">Conversions</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xl font-bold text-white/50">
                  ${((stats?.paid_cents || 0) / 100).toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">Earned</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="p-6">
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              {isLoading ? 'Loading...' : 'Subscribe for $40/month'}
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
