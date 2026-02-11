'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ProductInfo {
  name: string
  price_display: string
  price_cents: number
}

function CheckoutForm({ product, slug }: { product: ProductInfo; slug: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/upsell/shop?purchased=${slug}&session_id={CHECKOUT_SESSION_ID}`,
      },
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setLoading(false)
    }
    // If no error, the page redirects to return_url
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%',
          marginTop: 24,
          padding: '16px 32px',
          fontSize: 18,
          fontWeight: 700,
          color: '#fff',
          backgroundColor: loading ? '#6b7280' : '#10b981',
          border: 'none',
          borderRadius: 12,
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {loading ? 'Processing...' : `Pay ${product.price_display}`}
      </button>
      {error && (
        <p style={{ marginTop: 12, color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</p>
      )}
    </form>
  )
}

export default function CheckoutProductClient() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''

  const [email, setEmail] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'email' | 'pay'>('email')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !slug) return

    setLoading(true)
    setError('')

    try {
      // Register with FirstPromoter (cookie is still active on this domain)
      try {
        if (typeof window !== 'undefined' && (window as any).fpr) {
          (window as any).fpr('referral', { email })
        }
      } catch (fprErr) {
        console.error('FirstPromoter referral tracking error:', fprErr)
      }

      const res = await fetch('/api/checkout/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_slug: slug, email }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setClientSecret(data.clientSecret)
        setProduct(data.product)
        setStep('pay')
      }
    } catch (err) {
      setError('Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  if (!slug) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#ef4444' }}>No product specified</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#0a0a1a',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 40,
        border: '1px solid #1f2937',
      }}>
        {step === 'email' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
              Checkout
            </h1>
            <p style={{ color: '#9ca3af', textAlign: 'center', marginBottom: 32 }}>
              Enter your email to continue
            </p>
            <form onSubmit={handleEmailSubmit}>
              <label style={{ display: 'block', color: '#d1d5db', fontSize: 14, marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid #374151',
                  backgroundColor: '#1a1a2e',
                  color: '#e5e7eb',
                  fontSize: 16,
                  marginBottom: 20,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 32px',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  backgroundColor: loading ? '#6b7280' : '#10b981',
                  border: 'none',
                  borderRadius: 12,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading ? 'Loading...' : 'Continue to Payment'}
              </button>
              {error && (
                <p style={{ marginTop: 12, color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</p>
              )}
            </form>
          </>
        )}

        {step === 'pay' && clientSecret && product && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4, textAlign: 'center' }}>
              {product.name}
            </h1>
            <p style={{ color: '#10b981', fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 4 }}>
              {product.price_display}
            </p>
            <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
              {email}
            </p>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#10b981',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <CheckoutForm product={product} slug={slug} />
            </Elements>
          </>
        )}
      </div>
    </div>
  )
}

