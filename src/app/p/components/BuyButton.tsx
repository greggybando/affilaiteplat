'use client'

import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BuyButtonProps {
  slug: string
  text?: string
  price?: string
  style?: React.CSSProperties
  className?: string
}

interface ProductInfo {
  name: string
  price_display: string
  price_cents: number
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function CheckoutForm({ product, slug, email }: { product: ProductInfo; slug: string; email: string }) {
  return <PaymentElement />
}

function PaymentButtonWrapper({
  clientSecret,
  slug,
  product,
  email,
  submitting,
  setSubmitting,
  setError,
}: {
  clientSecret: string
  slug: string
  product: ProductInfo
  email: string
  submitting: boolean
  setSubmitting: (val: boolean) => void
  setError: (val: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async () => {
    if (!stripe || !elements || !email || !clientSecret) return

    setSubmitting(true)
    setError('')

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/upsell/shop?purchased=${slug}`,
      },
    })

    if (submitError) {
      setError(submitError.message || 'Payment failed')
      setSubmitting(false)
    }
  }

  return (
    <button
      onClick={handleSubmit}
      disabled={!stripe || submitting || !email}
      style={{
        width: '100%',
        padding: '16px 32px',
        fontSize: 18,
        fontWeight: 700,
        color: '#fff',
        backgroundColor: submitting || !email ? '#6b7280' : '#10b981',
        border: 'none',
        borderRadius: 12,
        cursor: submitting || !email ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {submitting ? 'Processing...' : `Pay ${product.price_display}`}
    </button>
  )
}

export default function BuyButton({
  slug,
  text = 'Get Instant Access',
  price,
  style,
  className,
}: BuyButtonProps) {
  const [showCheckout, setShowCheckout] = useState(false)
  const [email, setEmail] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [creatingIntent, setCreatingIntent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
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

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    if (clientSecret) {
      setClientSecret('')
      setProduct(null)
    }

    debounceTimer.current = setTimeout(() => {
      if (isValidEmail(value)) {
        createPaymentIntent(value)
      }
    }, 500)
  }

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    if (isValidEmail(value) && !clientSecret) {
      createPaymentIntent(value)
    }
  }

  const handleClick = () => {
    setShowCheckout(!showCheckout)
    if (!showCheckout) {
      setEmail('')
      setClientSecret('')
      setProduct(null)
      setError('')
    }
  }

  const defaultStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '18px 48px',
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center' as const,
    width: '100%',
    maxWidth: '400px',
  }

  return (
    <div style={{ textAlign: 'center', margin: '32px 0' }}>
      <button
        onClick={handleClick}
        style={style || defaultStyle}
        className={className}
      >
        {text}
      </button>
      {price && (
        <p style={{ marginTop: 8, fontSize: 14, color: '#666' }}>{price}</p>
      )}
      
      {showCheckout && (
        <div style={{
          marginTop: 24,
          padding: 32,
          backgroundColor: '#111827',
          borderRadius: 16,
          border: '1px solid #1f2937',
          maxWidth: 600,
          margin: '24px auto 0',
        }}>
          {product && (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4, textAlign: 'center' }}>
                {product.name}
              </h2>
              <p style={{ color: '#10b981', fontSize: 24, fontWeight: 800, textAlign: 'center', marginBottom: 24 }}>
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

          <div style={{ marginBottom: 24 }}>
            {creatingIntent ? (
              <div style={{ 
                padding: 24, 
                backgroundColor: '#1a1a2e', 
                borderRadius: 8,
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: 14,
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                Loading payment form...
              </div>
            ) : clientSecret && product ? (
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
                <PaymentButtonWrapper
                  clientSecret={clientSecret}
                  slug={slug}
                  product={product}
                  email={email}
                  submitting={submitting}
                  setSubmitting={setSubmitting}
                  setError={setError}
                />
              </Elements>
            ) : (
              <div style={{ 
                padding: 24, 
                backgroundColor: '#1a1a2e', 
                borderRadius: 8,
                textAlign: 'center',
                color: '#6b7280',
                fontSize: 14,
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                Enter your email above to continue
              </div>
            )}
          </div>

          {product && !clientSecret && (
            <button
              disabled
              style={{
                width: '100%',
                padding: '16px 32px',
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                backgroundColor: '#6b7280',
                border: 'none',
                borderRadius: 12,
                cursor: 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              Pay {product.price_display}
            </button>
          )}

          {error && (
            <p style={{ marginTop: 12, color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

