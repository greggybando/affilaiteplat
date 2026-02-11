'use client'

import { useState } from 'react'

interface BuyButtonProps {
  slug: string
  text?: string
  price?: string
  style?: React.CSSProperties
  className?: string
}

export default function BuyButton({
  slug,
  text = 'Get Instant Access',
  price,
  style,
  className,
}: BuyButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: slug,
        }),
      })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to create checkout')
        setLoading(false)
      }
    } catch (err) {
      setError('Checkout error. Please try again.')
      setLoading(false)
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
    cursor: loading ? 'wait' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s ease',
    textAlign: 'center' as const,
    width: '100%',
    maxWidth: '400px',
  }

  return (
    <div style={{ textAlign: 'center', margin: '32px 0' }}>
      <button
        onClick={handleCheckout}
        disabled={loading}
        style={style || defaultStyle}
        className={className}
      >
        {loading ? 'Processing...' : text}
      </button>
      {price && (
        <p style={{ marginTop: 8, fontSize: 14, color: '#666' }}>{price}</p>
      )}
      {error && (
        <p style={{ marginTop: 8, fontSize: 14, color: '#ef4444' }}>{error}</p>
      )}
    </div>
  )
}

