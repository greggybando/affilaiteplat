// src/app/p/[product]/ProductPageClient.tsx
// UPDATED: Dynamic sales page template that renders any product from the database.
// Reads product content from DB, passes sid through to checkout.

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface Product {
  id: string
  name: string
  slug: string
  headline: string
  subheadline: string
  bullets: string[]
  sales_body: string
  short_description: string
  thumbnail_url: string
  price_cents: number
  price_display: string
  cta_text: string
  guarantee_text: string
  product_type: string
}

export default function ProductPageClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const sid = searchParams.get('sid')
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/public?slug=${slug}`)
        const data = await res.json()
        if (data.product) {
          setProduct(data.product)
        } else {
          setError('Product not found')
        }
      } catch (err) {
        setError('Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [slug])

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/checkout/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: slug,
          sid: sid || undefined,
        }),
      })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError('Failed to create checkout')
        setCheckoutLoading(false)
      }
    } catch (err) {
      setError('Checkout error')
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #333', borderTopColor: '#f5c542', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Product Not Found</h1>
          <p style={{ color: '#888' }}>{error || 'This product is no longer available.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Hero Section */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 20px' }}>
        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)',
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          {product.headline || product.name}
        </h1>

        {/* Subheadline */}
        {product.subheadline && (
          <p style={{
            fontSize: 'clamp(16px, 2.5vw, 22px)',
            color: '#ccc',
            textAlign: 'center',
            marginBottom: 40,
            lineHeight: 1.6,
          }}>
            {product.subheadline}
          </p>
        )}

        {/* Thumbnail */}
        {product.thumbnail_url && (
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <img
              src={product.thumbnail_url}
              alt={product.name}
              style={{
                maxWidth: '100%',
                borderRadius: 12,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        )}

        {/* Bullets */}
        {product.bullets && product.bullets.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            {product.bullets.map((bullet: string, i: number) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 16,
                fontSize: 18,
                lineHeight: 1.6,
              }}>
                <span style={{ color: '#f5c542', fontSize: 20, flexShrink: 0 }}>✓</span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sales Body (markdown/HTML content) */}
        {product.sales_body && (
          <div
            style={{ fontSize: 18, lineHeight: 1.8, color: '#ddd', marginBottom: 40 }}
            dangerouslySetInnerHTML={{ __html: product.sales_body }}
          />
        )}

        {/* CTA Section */}
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 16,
          border: '1px solid #333',
        }}>
          <p style={{ fontSize: 16, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
            {product.product_type === 'subscription' ? 'Monthly Investment' : 'One-Time Investment'}
          </p>
          <p style={{ fontSize: 48, fontWeight: 800, color: '#f5c542', marginBottom: 24 }}>
            {product.price_display}
          </p>

          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            style={{
              background: checkoutLoading ? '#666' : 'linear-gradient(135deg, #f5c542 0%, #f0a500 100%)',
              color: '#000',
              border: 'none',
              padding: '18px 48px',
              fontSize: 20,
              fontWeight: 700,
              borderRadius: 12,
              cursor: checkoutLoading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 20px rgba(245, 197, 66, 0.3)',
              width: '100%',
              maxWidth: 400,
            }}
            onMouseOver={(e) => {
              if (!checkoutLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(245, 197, 66, 0.4)'
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(245, 197, 66, 0.3)'
            }}
          >
            {checkoutLoading ? 'Redirecting to checkout...' : (product.cta_text || 'Get Instant Access')}
          </button>

          {/* Guarantee */}
          {product.guarantee_text && (
            <p style={{ marginTop: 16, fontSize: 14, color: '#888' }}>
              🔒 {product.guarantee_text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

