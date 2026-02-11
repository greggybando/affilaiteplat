'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface ProductInfo {
  name: string
  price_display: string
  price_cents: number
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function CheckoutForm({ product, slug, email }: { product: ProductInfo; slug: string; email: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements || !email) return

    setLoading(true)
    setError('')

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/upsell/shop?purchased=${slug}`,
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
        disabled={!stripe || loading || !email}
        style={{
          width: '100%',
          marginTop: 24,
          padding: '16px 32px',
          fontSize: 18,
          fontWeight: 700,
          color: '#fff',
          backgroundColor: loading || !email ? '#6b7280' : '#10b981',
          border: 'none',
          borderRadius: 12,
          cursor: loading || !email ? 'wait' : 'pointer',
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
  const [creatingIntent, setCreatingIntent] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  const createPaymentIntent = async (emailValue: string) => {
    if (!emailValue || !slug || !isValidEmail(emailValue)) return

    setCreatingIntent(true)
    setError('')

    try {
      // Register with FirstPromoter (cookie is still active on this domain)
      try {
        if (typeof window !== 'undefined' && (window as any).fpr) {
          (window as any).fpr('referral', { email: emailValue })
        }
      } catch (fprErr) {
        console.error('FirstPromoter referral tracking error:', fprErr)
      }

      const res = await fetch('/api/checkout/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_slug: slug, email: emailValue }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setCreatingIntent(false)
      } else {
        setClientSecret(data.clientSecret)
        setProduct(data.product)
        setCreatingIntent(false)
      }
    } catch (err) {
      setError('Failed to start checkout')
      setCreatingIntent(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Reset client secret if email changes
    if (clientSecret) {
      setClientSecret('')
      setProduct(null)
    }

    // Debounce: wait 500ms after user stops typing
    debounceTimer.current = setTimeout(() => {
      if (isValidEmail(value)) {
        createPaymentIntent(value)
      }
    }, 500)
  }

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Clear debounce timer and create intent immediately on blur if email is valid
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    if (isValidEmail(value) && !clientSecret) {
      createPaymentIntent(value)
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
        {product && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4, textAlign: 'center' }}>
              {product.name}
            </h1>
            <p style={{ color: '#10b981', fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 32 }}>
              {product.price_display}
            </p>
          </>
        )}
        
        <label style={{ display: 'block', color: '#d1d5db', fontSize: 14, marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          placeholder="you@example.com"
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 8,
            border: '1px solid #374151',
            backgroundColor: '#1a1a2e',
            color: '#e5e7eb',
            fontSize: 16,
            marginBottom: 24,
            boxSizing: 'border-box',
          }}
        />

        {creatingIntent && (
          <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            Loading payment form...
          </p>
        )}

        {clientSecret && product && (
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
            <CheckoutForm product={product} slug={slug} email={email} />
          </Elements>
        )}

        {error && (
          <p style={{ marginTop: 12, color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</p>
        )}
      </div>
    </div>
  )
}

