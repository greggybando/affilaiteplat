'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  daysLeft: number
}

export function SubscriptionModal({ isOpen, onClose, daysLeft }: SubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

  if (!isOpen) return null

  async function handleSubscribe() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: selectedPlan }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        // Validate URL format
        if (typeof data.url === 'string' && data.url.startsWith('http')) {
          console.log('✅ Valid checkout URL received, redirecting:', data.url)
          // Redirect to Stripe checkout
          window.location.href = data.url
        } else {
          console.error('❌ Invalid URL format received:', data.url)
          throw new Error('Invalid checkout URL received from Stripe. Please try again or contact support.')
        }
      } else {
        console.error('❌ No URL in response:', data)
        throw new Error('No checkout URL received')
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      alert(error.message || 'Failed to start checkout. Please try again.')
      setIsLoading(false)
    }
  }

  const monthlyPrice = 40
  const yearlyPrice = 360 // $360/year = $30/month (saves $120/year - 3 months free)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Subscribe Now To Continue Mastering Selling Digital Products Online</h2>
          <p className="text-gray-400 text-sm">
            {daysLeft > 0
              ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your trial`
              : 'Your trial has ended'}
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-6 space-y-3">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">Keep your affiliate links & pages active</p>
              <p className="text-gray-400 text-sm">Keep your tracking links & pages active so you can keep selling</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">Unlock your successful sales earnings</p>
              <p className="text-gray-400 text-sm">Access your commissions earned during trial</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white font-medium">Maintain full platform access</p>
              <p className="text-gray-400 text-sm">Maintain unlimited access to our done-for-you products & trainings — updated regularly to help you earn even more</p>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="mb-6 space-y-3">
          {/* Monthly Plan */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            disabled={isLoading}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              selectedPlan === 'monthly'
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-white font-semibold">Monthly</p>
                <p className="text-gray-400 text-sm">Billed monthly</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl">${monthlyPrice}</p>
                <p className="text-gray-400 text-xs">per month</p>
              </div>
            </div>
          </button>

          {/* Yearly Plan */}
          <button
            onClick={() => setSelectedPlan('yearly')}
            disabled={isLoading}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              selectedPlan === 'yearly'
                ? 'border-green-500 bg-green-500/10'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">Yearly</p>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                    Save $120 - 3 months free!
                  </span>
                </div>
                <p className="text-gray-400 text-sm">Billed annually</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl">${yearlyPrice}</p>
                <p className="text-gray-400 text-xs">per year</p>
                <p className="text-green-400 text-xs mt-0.5">~${Math.round(yearlyPrice / 12)}/mo</p>
              </div>
            </div>
          </button>
        </div>

        {/* Subscribe Button */}
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            `Subscribe for $${selectedPlan === 'monthly' ? monthlyPrice : yearlyPrice}/${selectedPlan === 'monthly' ? 'month' : 'year'}`
          )}
        </button>

        <p className="text-center text-gray-500 text-xs mt-4">
          Cancel anytime. Your subscription will renew automatically.
        </p>
      </div>
    </div>
  )
}

