'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Zap } from 'lucide-react'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'stripe'>('paypal')
  const [referralCode, setReferralCode] = useState<string>('')
  const [discountCode, setDiscountCode] = useState<string>('')

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setReferralCode(ref.toUpperCase())
    }
  }, [searchParams])

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
      referral_code: referralCode || null,
      discount_code: discountCode.trim() || null,
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
      }

      // If checkout URL returned, redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }

      // If they chose Stripe, redirect to connect onboarding
      if (payoutMethod === 'stripe' && result.stripeOnboardingUrl) {
        window.location.href = result.stripeOnboardingUrl
      } else {
        // Redirect to onboarding flow
        window.location.href = '/onboarding'
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative" style={{
              animation: 'lightning 4s ease-in-out infinite',
              filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.9)) drop-shadow(0 0 16px rgba(6, 182, 212, 0.7))'
            }}>
              <Zap className="w-12 h-12 text-cyan-400" fill="currentColor" style={{
                filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 1))'
              }} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300" style={{
                textShadow: '0 0 20px rgba(34, 211, 238, 0.9), 0 0 40px rgba(6, 182, 212, 0.8)',
                letterSpacing: '0.05em',
                fontWeight: 700
              }}>
                LIFE DESIGN
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Join the Platform
          </h1>
          <p className="text-[rgba(255,255,255,0.6)]">
            Start your <span className="text-cyan-400 font-semibold">7-day free trial</span> today
          </p>
        </div>

        <style jsx>{`
          @keyframes lightning {
            0%, 90%, 100% { opacity: 1; transform: scale(1); }
            5%, 10% { opacity: 0.3; transform: scale(0.95); }
            7.5% { opacity: 1; transform: scale(1.1); }
          }
        `}</style>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div 
            className="rounded-2xl p-6 space-y-5 border relative overflow-hidden"
            style={{
              background: 'rgba(26,26,46,0.8)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(255,255,255,0.1)',
              boxShadow: '0 0 40px rgba(6,182,212,0.2), 0 8px 32px rgba(0,0,0,0.8)'
            }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
            {/* Name */}
            <div className="relative z-10">
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-4 py-3 rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                placeholder="John Smith"
              />
            </div>

            {/* Email */}
            <div className="relative z-10">
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div className="relative z-10">
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                placeholder="••••••••"
              />
            </div>

            {/* Payout Method */}
            <div className="relative z-10">
              <label className="block text-sm font-medium text-white mb-3">
                How would you like to get paid?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('paypal')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    payoutMethod === 'paypal'
                      ? 'border-cyan-500'
                      : 'hover:border-[rgba(255,255,255,0.3)]'
                  }`}
                  style={{
                    background: payoutMethod === 'paypal' ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.05)',
                    borderColor: payoutMethod === 'paypal' ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.2)',
                    boxShadow: payoutMethod === 'paypal' ? '0 0 20px rgba(34,211,238,0.3)' : 'none'
                  }}
                >
                  <div className="text-lg font-semibold text-white">PayPal</div>
                  <div className="text-xs text-[rgba(255,255,255,0.6)] mt-1">Instant payouts</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('stripe')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    payoutMethod === 'stripe'
                      ? 'border-cyan-500'
                      : 'hover:border-[rgba(255,255,255,0.3)]'
                  }`}
                  style={{
                    background: payoutMethod === 'stripe' ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.05)',
                    borderColor: payoutMethod === 'stripe' ? 'rgba(34,211,238,0.6)' : 'rgba(255,255,255,0.2)',
                    boxShadow: payoutMethod === 'stripe' ? '0 0 20px rgba(34,211,238,0.3)' : 'none'
                  }}
                >
                  <div className="text-lg font-semibold text-white">Stripe</div>
                  <div className="text-xs text-[rgba(255,255,255,0.6)] mt-1">Bank transfer</div>
                </button>
              </div>
            </div>

            {/* PayPal Email (conditional) */}
            {payoutMethod === 'paypal' && (
              <div className="relative z-10">
                <label htmlFor="paypal_email" className="block text-sm font-medium text-white mb-2">
                  PayPal Email
                </label>
                <input
                  type="email"
                  id="paypal_email"
                  name="paypal_email"
                  required
                  className="w-full px-4 py-3 rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                  placeholder="paypal@example.com"
                />
              </div>
            )}

            {payoutMethod === 'stripe' && (
              <p className="text-sm text-[rgba(255,255,255,0.7)] p-3 rounded-lg relative z-10" style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                After signing up, you'll be redirected to Stripe to connect your bank account.
              </p>
            )}

            {/* Discount Code */}
            <div className="relative z-10">
              <label htmlFor="discount_code" className="block text-sm font-medium text-white mb-2">
                Have a code?
              </label>
              <input
                type="text"
                id="discount_code"
                name="discount_code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                placeholder="Enter discount code"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="rounded-lg p-4 text-red-400 text-sm border"
              style={{
                background: 'rgba(239,68,68,0.1)',
                borderColor: 'rgba(239,68,68,0.5)',
                backdropFilter: 'blur(10px)'
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 font-semibold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              boxShadow: '0 0 20px rgba(34,211,238,0.5), 0 4px 20px rgba(0,0,0,0.3)',
              color: '#0f0f1a'
            }}
          >
            <span className="relative z-10 font-bold">{isLoading ? 'Creating account...' : 'Start Free Trial'}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
          </button>

          {/* Terms */}
          <p className="text-xs text-[rgba(255,255,255,0.5)] text-center">
            By signing up, you agree to our Terms of Service. After your 7-day trial,
            you'll be charged $40/month to continue accessing the platform.
          </p>
        </form>

        {/* Login Link */}
        <p className="text-center mt-6 text-[rgba(255,255,255,0.6)]">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f1a' }}>
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
