'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

type PayableAffiliate = {
  id: string
  name: string
  email: string
  payout_method: 'paypal' | 'stripe' | null
  paypal_email: string | null
  stripe_account_id: string | null
  approved_cents: number
  conversion_ids: string[]
}

export function PayoutProcessor({ affiliates }: { affiliates: PayableAffiliate[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const selectAll = () => {
    if (selected.size === affiliates.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(affiliates.map((a) => a.id)))
    }
  }

  const processPayouts = async () => {
    setError(null)

    for (const affiliateId of Array.from(selected)) {
      if (completed.has(affiliateId)) continue

      const affiliate = affiliates.find((a) => a.id === affiliateId)
      if (!affiliate) continue

      setProcessing((prev) => new Set(prev).add(affiliateId))

      try {
        const res = await fetch('/api/admin/payouts/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            affiliate_id: affiliateId,
            amount_cents: affiliate.approved_cents,
            conversion_ids: affiliate.conversion_ids,
            payout_method: affiliate.payout_method,
            paypal_email: affiliate.paypal_email,
            stripe_account_id: affiliate.stripe_account_id,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Payout failed')
        }

        setCompleted((prev) => new Set(prev).add(affiliateId))
      } catch (err: any) {
        setError(`Failed to pay ${affiliate.name}: ${err.message}`)
      } finally {
        setProcessing((prev) => {
          const newSet = new Set(prev)
          newSet.delete(affiliateId)
          return newSet
        })
      }
    }
  }

  const selectedTotal = affiliates
    .filter((a) => selected.has(a.id))
    .reduce((sum, a) => sum + a.approved_cents, 0)

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={selectAll}
          className="text-sm text-gray-400 hover:text-white"
        >
          {selected.size === affiliates.length ? 'Deselect all' : 'Select all'}
        </button>
        {selected.size > 0 && (
          <button
            onClick={processPayouts}
            disabled={processing.size > 0}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {processing.size > 0 && <Loader2 className="w-4 h-4 animate-spin" />}
            Pay {selected.size} affiliate{selected.size !== 1 ? 's' : ''} (${(selectedTotal / 100).toFixed(2)})
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Affiliate List */}
      <div className="space-y-3">
        {affiliates.map((affiliate) => {
          const isSelected = selected.has(affiliate.id)
          const isProcessing = processing.has(affiliate.id)
          const isCompleted = completed.has(affiliate.id)

          return (
            <div
              key={affiliate.id}
              className={`bg-gray-900 border rounded-xl p-5 transition-all cursor-pointer ${
                isCompleted
                  ? 'border-green-500/50 bg-green-500/5'
                  : isSelected
                  ? 'border-green-500'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
              onClick={() => !isCompleted && toggleSelect(affiliate.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 border-green-500'
                        : isSelected
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-600'
                    }`}
                  >
                    {(isSelected || isCompleted) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <p className="text-white font-medium">{affiliate.name}</p>
                    <p className="text-sm text-gray-500">{affiliate.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Payout Method */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase">
                      {affiliate.payout_method || 'No payout method'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {affiliate.payout_method === 'paypal'
                        ? affiliate.paypal_email
                        : affiliate.stripe_account_id
                        ? 'Connected'
                        : 'Not set up'}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right min-w-[80px]">
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin text-green-400 ml-auto" />
                    ) : isCompleted ? (
                      <p className="text-green-400 font-bold">Paid!</p>
                    ) : (
                      <p className="text-green-400 font-bold text-lg">
                        ${(affiliate.approved_cents / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
