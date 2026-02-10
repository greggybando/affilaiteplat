// src/app/upsell/shop/UpsellShopClient.tsx
// Post-purchase upsell shop page.
// Shows all active products except the one just purchased.
// One-click buy using saved payment method from initial checkout.

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  slug: string
  short_description: string
  thumbnail_url: string
  price_cents: number
  price_display: string
}

export default function UpsellShopClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const sid = searchParams.get('sid')
  const purchased = searchParams.get('purchased') // slug of product just bought
  const sessionId = searchParams.get('session_id') // Stripe checkout session ID

  const [products, setProducts] = useState<Product[]>([])
  const [purchasedSlugs, setPurchasedSlugs] = useState<string[]>([])
  const [buyingSlug, setBuyingSlug] = useState<string | null>(null)
  const [boughtSlugs, setBoughtSlugs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all active products
        const productsRes = await fetch('/api/products/public')
        const productsData = await productsRes.json()

        // Fetch already purchased products for this customer
        let alreadyPurchased: string[] = purchased ? [purchased] : []

        if (sessionId) {
          try {
            const purchasedRes = await fetch(`/api/products/purchased?session_id=${sessionId}`)
            const purchasedData = await purchasedRes.json()
            if (purchasedData.purchased_slugs) {
              alreadyPurchased = [...new Set([...alreadyPurchased, ...purchasedData.purchased_slugs])]
            }
          } catch (err) {
            console.error('Error fetching purchased products:', err)
          }
        }

        setPurchasedSlugs(alreadyPurchased)

        // Filter out already purchased products
        const available = (productsData.products || []).filter(
          (p: Product) => !alreadyPurchased.includes(p.slug)
        )
        setProducts(available)
      } catch (err) {
        console.error('Error loading upsell shop:', err)
        setError('Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [purchased, sessionId])

  const handleOneClickBuy = async (productSlug: string) => {
    if (!sessionId) {
      setError('Cannot process one-click buy')
      return
    }

    setBuyingSlug(productSlug)
    setError('')

    try {
      const res = await fetch('/api/upsell/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: productSlug,
          checkout_session_id: sessionId,
          sid,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setBoughtSlugs(prev => [...prev, productSlug])
      } else if (data.already_owned) {
        setBoughtSlugs(prev => [...prev, productSlug])
      } else if (data.requires_action) {
        setError('Your card requires additional verification. Please purchase separately.')
      } else {
        setError(data.error || 'Purchase failed')
      }
    } catch (err: any) {
      setError('Something went wrong. Please try again.')
    } finally {
      setBuyingSlug(null)
    }
  }

  const handleContinue = () => {
    // Go to LifeDesign pitch page, carry session_id for delivery page later
    const params = new URLSearchParams()
    if (sessionId) params.set('session_id', sessionId)
    router.push(`/upsell/join?${params.toString()}`)
  }

  const handleSkip = () => {
    // Skip pitch, go straight to delivery/thank-you
    const params = new URLSearchParams()
    if (sessionId) params.set('session_id', sessionId)
    router.push(`/upsell/thankyou?${params.toString()}`)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #333', borderTopColor: '#f5c542', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Loading your recommendations...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // No products left to upsell - go to pitch page
  if (products.length === 0 || products.every(p => boughtSlugs.includes(p.slug))) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff' }}>
        <div style={{ textAlign: 'center', maxWidth: 500, padding: 20 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>You&apos;re All Set!</h1>
          <p style={{ color: '#aaa', marginBottom: 32, fontSize: 18 }}>
            {boughtSlugs.length > 0
              ? `Amazing — you grabbed ${boughtSlugs.length + purchasedSlugs.length} product${boughtSlugs.length + purchasedSlugs.length > 1 ? 's' : ''}!`
              : 'Your purchase is confirmed!'}
          </p>
          <button
            onClick={handleContinue}
            style={{
              background: 'linear-gradient(135deg, #f5c542 0%, #f0a500 100%)',
              color: '#000',
              border: 'none',
              padding: '16px 40px',
              fontSize: 18,
              fontWeight: 700,
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
        {/* Confirmation header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Your Purchase is Confirmed!
          </h1>
          <p style={{ color: '#aaa', fontSize: 18, marginBottom: 4 }}>
            While you&apos;re here — these pair perfectly with what you just grabbed:
          </p>
          <p style={{ color: '#666', fontSize: 14 }}>
            One-click buy • Same card on file • Instant access
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#2a1515',
            border: '1px solid #5a2020',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            color: '#ff6b6b',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Product cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {products.map((product) => {
            const isBought = boughtSlugs.includes(product.slug)
            const isBuying = buyingSlug === product.slug

            return (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 20,
                  background: isBought ? '#0a1a0a' : '#111',
                  border: isBought ? '1px solid #1a4a1a' : '1px solid #222',
                  borderRadius: 12,
                  transition: 'all 0.2s',
                }}
              >
                {/* Thumbnail */}
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.name}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    background: '#222',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    📦
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                    {product.name}
                  </h3>
                  {product.short_description && (
                    <p style={{ fontSize: 14, color: '#888', lineHeight: 1.4 }}>
                      {product.short_description}
                    </p>
                  )}
                </div>

                {/* Price + Button */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: isBought ? '#4ade80' : '#f5c542',
                    marginBottom: 8,
                  }}>
                    {isBought ? '✓ Purchased' : product.price_display}
                  </p>

                  {!isBought && (
                    <button
                      onClick={() => handleOneClickBuy(product.slug)}
                      disabled={isBuying}
                      style={{
                        background: isBuying
                          ? '#555'
                          : 'linear-gradient(135deg, #f5c542 0%, #f0a500 100%)',
                        color: '#000',
                        border: 'none',
                        padding: '10px 24px',
                        fontSize: 14,
                        fontWeight: 700,
                        borderRadius: 8,
                        cursor: isBuying ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isBuying ? 'Processing...' : 'Buy Now'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Continue / Skip */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button
            onClick={handleContinue}
            style={{
              background: boughtSlugs.length > 0
                ? 'linear-gradient(135deg, #f5c542 0%, #f0a500 100%)'
                : 'transparent',
              color: boughtSlugs.length > 0 ? '#000' : '#888',
              border: boughtSlugs.length > 0 ? 'none' : '1px solid #333',
              padding: '14px 40px',
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 10,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            {boughtSlugs.length > 0 ? 'Continue →' : 'No thanks, take me to my purchase →'}
          </button>
        </div>
      </div>
    </div>
  )
}

