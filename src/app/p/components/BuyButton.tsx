'use client'

import { useState } from 'react'
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
          cursor: loading ? 'not-allowed' : 'pointer',
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

export default function BuyButton({
  slug,
  text = 'Get Instant Access',
  price,
  style,
  className,
}: BuyButtonProps) {
  const [showCheckout, setShowCheckout] = useState(false)
  const [clientSecret, setClientSecret] = useState('')
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [creatingIntent, setCreatingIntent] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    if (!showCheckout) {
      // Read FirstPromoter cookie
      const cookies = document.cookie.split(';')
      let fprTid = null
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === '_fprom_tid') {
          fprTid = value
          break
        }
      }

      setShowCheckout(true)
      setCreatingIntent(true)
      setError('')

      try {
        const res = await fetch('/api/checkout/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            product_slug: slug,
            fpr_tid: fprTid || undefined,
          }),
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
    } else {
      setShowCheckout(false)
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
          {creatingIntent ? (
            <div style={{
              padding: 24,
              backgroundColor: '#1a1a2e',
              borderRadius: 8,
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 14,
            }}>
              Loading payment form...
            </div>
          ) : clientSecret && product ? (
            <>
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
          ) : null}

          {error && (
            <p style={{ marginTop: 12, color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

