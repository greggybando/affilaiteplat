'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'stripe'>('paypal')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      payout_method: payoutMethod,
      paypal_email: payoutMethod === 'paypal' ? formData.get('paypal_email') as string : null,
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Signup failed')
      }

      // Save token to localStorage as backup
      if (result.token) {
        localStorage.setItem('affiliate_token', result.token)
        console.log('✅ Token saved to localStorage')
      }

      // If they chose Stripe, redirect to connect onboarding
      if (payoutMethod === 'stripe' && result.stripeOnboardingUrl) {
        window.location.href = result.stripeOnboardingUrl
      } else {
        // Force full page reload to ensure cookie is available
        window.location.href = '/portal'
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Join the Affiliate Program
          </h1>
          <p className="text-gray-400">
            Start your <span className="text-green-400 font-semibold">7-day free trial</span> today
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-gray-900 rounded-xl p-6 space-y-5 border border-gray-800">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="John Smith"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Payout Method */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                How would you like to get paid?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('paypal')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    payoutMethod === 'paypal'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="text-lg font-semibold text-white">PayPal</div>
                  <div className="text-xs text-gray-400 mt-1">Instant payouts</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('stripe')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    payoutMethod === 'stripe'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="text-lg font-semibold text-white">Stripe</div>
                  <div className="text-xs text-gray-400 mt-1">Bank transfer</div>
                </button>
              </div>
            </div>

            {/* PayPal Email (conditional) */}
            {payoutMethod === 'paypal' && (
              <div>
                <label htmlFor="paypal_email" className="block text-sm font-medium text-gray-300 mb-2">
                  PayPal Email
                </label>
                <input
                  type="email"
                  id="paypal_email"
                  name="paypal_email"
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="paypal@example.com"
                />
              </div>
            )}

            {payoutMethod === 'stripe' && (
              <p className="text-sm text-gray-400 bg-gray-800/50 p-3 rounded-lg">
                After signing up, you'll be redirected to Stripe to connect your bank account.
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? 'Creating account...' : 'Start Free Trial'}
          </button>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center">
            By signing up, you agree to our Terms of Service. After your 7-day trial,
            you'll be charged $40/month to continue accessing the platform.
          </p>
        </form>

        {/* Login Link */}
        <p className="text-center mt-6 text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-green-400 hover:text-green-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
