'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import BuyButton from '../components/BuyButton'

interface Product {
  id: string
  name: string
  slug: string
  price_cents: number
  price_display: string
  cta_text: string
  guarantee_text: string
  product_type: string
  page_html: string | null
  // Legacy fields still available as fallback
  headline: string | null
  subheadline: string | null
  bullets: string[]
  sales_body: string | null
}

export default function ProductPageClient({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>}>
      <ProductPageInner slug={slug} />
    </Suspense>
  )
}

function ProductPageInner({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const sid = searchParams.get('sid')

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#ef4444' }}>{error || 'Product not found'}</p>
      </div>
    )
  }

  // ==========================================
  // CUSTOM HTML PAGE (new approach)
  // If page_html exists, render it + inject BuyButton
  // ==========================================
  if (product.page_html) {
    // Split HTML at <!-- BUY_BUTTON --> placeholders
    const parts = product.page_html.split('<!-- BUY_BUTTON -->')

    return (
      <div>
        {parts.map((part, index) => (
          <div key={index}>
            <div dangerouslySetInnerHTML={{ __html: part }} />
            {/* Insert BuyButton between parts (not after the last one) */}
            {index < parts.length - 1 && (
              <BuyButton
                slug={product.slug}
                text={product.cta_text || 'Get Instant Access'}
                price={product.guarantee_text || undefined}
              />
            )}
          </div>
        ))}
        {/* Always add a BuyButton at the bottom */}
        <BuyButton
          slug={product.slug}
          text={product.cta_text || 'Get Instant Access'}
          price={product.price_display ? `${product.price_display} — ${product.guarantee_text || ''}` : undefined}
        />
      </div>
    )
  }

  // ==========================================
  // LEGACY FALLBACK — old field-based layout
  // ==========================================
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        {product.headline && (
          <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 16, color: '#111' }}>
            {product.headline}
          </h1>
        )}
        {product.subheadline && (
          <p style={{ fontSize: 20, color: '#555', lineHeight: 1.5 }}>
            {product.subheadline}
          </p>
        )}
      </div>

      {product.bullets && product.bullets.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          {product.bullets.map((bullet, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ marginRight: 12, color: '#10b981', fontSize: 20 }}>✓</span>
              <p style={{ fontSize: 17, color: '#333', lineHeight: 1.5 }}>{bullet}</p>
            </div>
          ))}
        </div>
      )}

      {product.sales_body && (
        <div
          style={{ marginBottom: 40, fontSize: 17, color: '#333', lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: product.sales_body }}
        />
      )}

      <BuyButton
        slug={product.slug}
        text={product.cta_text || 'Get Instant Access'}
        price={product.price_display ? `${product.price_display} — ${product.guarantee_text || ''}` : undefined}
      />

      {product.guarantee_text && (
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#888' }}>
          🔒 {product.guarantee_text}
        </p>
      )}
    </div>
  )
}
