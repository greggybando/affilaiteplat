// src/app/upsell/thankyou/ThankYouClient.tsx
// Shown after upsell shop (or after skipping join pitch).
// Displays all products the customer purchased with delivery links.

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface PurchasedProduct {
  product_slug: string
  product_name: string
  delivery_url: string | null
  delivery_type: string
  thumbnail_url: string | null
}

export default function ThankYouClient() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [products, setProducts] = useState<PurchasedProduct[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPurchases() {
      if (!sessionId) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/products/delivery?session_id=${sessionId}`)
        const data = await res.json()
        setProducts(data.products || [])
        setEmail(data.email || '')
      } catch (err) {
        console.error('Error loading purchases:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPurchases()
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #333', borderTopColor: '#f5c542', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Loading your purchases...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            You&apos;re In!
          </h1>
          <p style={{ color: '#aaa', fontSize: 18, lineHeight: 1.6 }}>
            {email && <>We sent a confirmation to <strong style={{ color: '#fff' }}>{email}</strong>. </>}
            Access your products below:
          </p>
        </div>

        {/* Purchased products with delivery links */}
        {products.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {products.map((product, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 20,
                  background: '#111',
                  border: '1px solid #1a4a1a',
                  borderRadius: 12,
                }}
              >
                {/* Thumbnail */}
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.product_name}
                    style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 60, height: 60, borderRadius: 8, background: '#1a1a1a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
                  }}>
                    ✅
                  </div>
                )}

                {/* Info + link */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                    {product.product_name}
                  </h3>
                  <p style={{ fontSize: 13, color: '#4ade80' }}>Purchase confirmed</p>
                </div>

                {/* Access button */}
                {product.delivery_url && (
                  <a
                    href={product.delivery_url}
                    target={product.delivery_type === 'redirect' ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    style={{
                      background: 'linear-gradient(135deg, #f5c542 0%, #f0a500 100%)',
                      color: '#000',
                      textDecoration: 'none',
                      padding: '10px 20px',
                      fontSize: 14,
                      fontWeight: 700,
                      borderRadius: 8,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Access →
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, background: '#111', borderRadius: 12, border: '1px solid #222' }}>
            <p style={{ color: '#888', fontSize: 16 }}>
              Your purchase is confirmed! Check your email for access details.
            </p>
          </div>
        )}

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ color: '#666', fontSize: 14 }}>
            Having trouble? Email support and we&apos;ll get you sorted.
          </p>
        </div>
      </div>
    </div>
  )
}

