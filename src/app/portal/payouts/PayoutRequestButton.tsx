'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export function PayoutRequestButton({
  affiliateId,
  availableBalance,
  payoutMethod,
}: {
  affiliateId: string
  availableBalance: number
  payoutMethod: 'paypal' | 'stripe' | null
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRequestPayout() {
    if (availableBalance <= 0) {
      setError('No balance available for payout')
      return
    }

    if (!payoutMethod) {
      setError('Please set up your payout method in account settings')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Get token from localStorage and send as Authorization header
      const token = localStorage.getItem('affiliate_token')
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          affiliate_id: affiliateId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request payout')
      }

      setSuccess(true)
      // Reload page after 2 seconds to show updated balance
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
        Payout requested!
      </div>
    )
  }

  if (!payoutMethod) {
    return (
      <div className="text-right">
        <p className="text-sm text-yellow-400 mb-2">Payout method not set</p>
        <a
          href="/portal/settings"
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors inline-block"
        >
          Set Up Payout
        </a>
      </div>
    )
  }

  return (
    <div className="text-right">
      {error && (
        <p className="text-sm text-red-400 mb-2">{error}</p>
      )}
      <button
        onClick={handleRequestPayout}
        disabled={isLoading || availableBalance <= 0}
        className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Requesting...
          </>
        ) : (
          'Request Payout'
        )}
      </button>
    </div>
  )
}

