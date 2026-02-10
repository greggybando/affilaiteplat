// src/app/affiliate/components/ProductLinks.tsx
// Shows affiliate links for all active products + subscription.
// Links use ?ref= format which middleware converts to server-side attribution
// before the page loads (same security as /go/ links).

'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  slug: string
  price_display: string
  short_description: string
}

interface Props {
  affiliateCode: string  // The affiliate's tracking code
}

export default function ProductLinks({ affiliateCode }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://www.millionairelifedesign.com'

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products/public')
        const data = await res.json()
        setProducts(data.products || [])
      } catch (err) {
        console.error('Error fetching products:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const getLink = (slug: string, type: 'product' | 'subscription') => {
    return type === 'subscription'
      ? `${baseUrl}/subscribe?ref=${affiliateCode}`
      : `${baseUrl}/p/${slug}?ref=${affiliateCode}`
  }

  const copyLink = (slug: string, type: 'product' | 'subscription') => {
    navigator.clipboard.writeText(getLink(slug, type))
    setCopiedSlug(slug || 'subscription')
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  if (loading) {
    return <p style={{ color: '#888', padding: 16 }}>Loading product links...</p>
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Your Product Links</h3>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
        Share these links. You earn commission on every sale + any upsells they buy after.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Product links */}
        {products.map(product => (
          <div
            key={product.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: '#111',
              border: '1px solid #222',
              borderRadius: 8,
            }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{product.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {product.price_display} • /p/{product.slug}?ref={affiliateCode}
              </div>
            </div>

            <button
              onClick={() => copyLink(product.slug, 'product')}
              style={{
                background: copiedSlug === product.slug ? '#0a1a0a' : '#1a1a2e',
                color: copiedSlug === product.slug ? '#4ade80' : '#f5c542',
                border: copiedSlug === product.slug ? '1px solid #1a4a1a' : '1px solid #333',
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                cursor: 'pointer',
                minWidth: 80,
              }}
            >
              {copiedSlug === product.slug ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        ))}

        {/* Subscription link */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#0a0a1a',
            border: '1px solid #1a1a4a',
            borderRadius: 8,
          }}
        >
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>
              LifeDesign Subscription
              <span style={{ fontSize: 11, color: '#6b9fff', marginLeft: 8, background: '#0a0a2a', padding: '2px 6px', borderRadius: 4 }}>
                RECURRING
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
              $40/mo • /subscribe?ref={affiliateCode}
            </div>
          </div>

          <button
            onClick={() => copyLink('', 'subscription')}
            style={{
              background: copiedSlug === 'subscription' ? '#0a1a0a' : '#1a1a2e',
              color: copiedSlug === 'subscription' ? '#4ade80' : '#f5c542',
              border: copiedSlug === 'subscription' ? '1px solid #1a4a1a' : '1px solid #333',
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              cursor: 'pointer',
              minWidth: 80,
            }}
          >
            {copiedSlug === 'subscription' ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {products.length === 0 && (
        <p style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: 20 }}>
          No products available yet. Check back soon!
        </p>
      )}
    </div>
  )
}

