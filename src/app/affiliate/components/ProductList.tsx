'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { SimpleReferralLink } from './SimpleReferralLink'

type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  price_cents: number
  commission_percent: number
  landing_pages: {
    id: string
    name: string
    slug: string
    variant_name: string | null
    is_active: boolean
  }[]
}

type AffiliateLink = {
  id: string
  tracking_code: string
  landing_page: {
    id: string
    name: string
    slug: string
    product: {
      id: string
      name: string
      slug: string
    }
  }
}

// Get product icon/emoji based on slug
function getProductIcon(slug: string): string {
  if (slug === 'platform-subscription') return '💰'
  if (slug.includes('adhd')) return '🧠'
  return '📦'
}

export function ProductList({
  products,
  affiliateLinks,
  affiliateId,
}: {
  products: Product[]
  affiliateLinks: AffiliateLink[]
  affiliateId: string
}) {
  // Create platform subscription as a product-like item
  const platformSubscriptionProduct = {
    id: 'platform-subscription',
    name: 'Platform Subscription',
    slug: 'platform-subscription',
    description: 'Earn 50% recurring commission on monthly subscriptions ($20/month per active referral). 10 sales = $200/month passive',
    price_cents: 4000,
    commission_percent: 50,
    landing_pages: []
  }

  // Combine platform subscription with other products
  const allProducts = [platformSubscriptionProduct, ...products]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="divide-y divide-gray-800">
        {allProducts.map((product, index) => (
          <ProductRow
            key={product.id}
            product={product}
            affiliateLinks={affiliateLinks.filter(
              (link) => link.landing_page?.product?.id === product.id
            )}
            affiliateId={affiliateId}
          />
        ))}
      </div>
    </div>
  )
}

function ProductRow({
  product,
  affiliateLinks,
  affiliateId,
}: {
  product: Product
  affiliateLinks: AffiliateLink[]
  affiliateId: string
}) {
  const activePages = product.landing_pages.filter((p) => p.is_active)
  const icon = getProductIcon(product.slug)

  return (
    <div className="p-5 hover:bg-gray-800/30 transition-colors">
      <div className="flex items-start gap-4">
        {/* Product Icon */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 flex items-center justify-center text-xl flex-shrink-0">
          {icon}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-gray-400 mt-1">
                  {product.description}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-green-400 font-bold text-base">
                {product.commission_percent}%
              </div>
              {product.id !== 'platform-subscription' && (
                <div className="text-xs text-gray-500">
                  ${(product.price_cents / 100).toFixed(0)}
                </div>
              )}
              {product.id === 'platform-subscription' && (
                <div className="text-xs text-gray-500">Recurring</div>
              )}
            </div>
          </div>

          {/* Links Section */}
          {product.id === 'platform-subscription' ? (
            <div className="mt-3">
              <SimpleReferralLink />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {activePages.length > 0 ? (
                activePages.map((page) => {
                  const existingLink = affiliateLinks.find(
                    (link) => link.landing_page?.id === page.id
                  )
                  return (
                    <LandingPageRow
                      key={page.id}
                      page={page}
                      productSlug={product.slug}
                      existingLink={existingLink}
                      affiliateId={affiliateId}
                    />
                  )
                })
              ) : (
                <p className="text-sm text-gray-500">No landing pages available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LandingPageRow({
  page,
  productSlug,
  existingLink,
  affiliateId,
}: {
  page: {
    id: string
    name: string
    slug: string
    variant_name: string | null
  }
  productSlug: string
  existingLink?: AffiliateLink
  affiliateId: string
}) {
  const [link, setLink] = useState(existingLink)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://affiliate-platform-three.vercel.app'
  const fullUrl = link
    ? (link as any).url || `${appUrl}/go/${link.tracking_code}`
    : null

  async function generateLink() {
    setIsGenerating(true)
    try {
      const token = localStorage.getItem('affiliate_token')
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/links/generate', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          landing_page_id: page.id,
          affiliate_id: affiliateId,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        alert(`Error: ${data.error || 'Failed to generate link'}`)
        return
      }
      
      if (data.link) {
        setLink(data.link)
      } else {
        alert('Error: No link received from server')
      }
    } catch (error) {
      console.error('Error generating link:', error)
      alert('Error: Failed to generate link. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function copyToClipboard() {
    if (!fullUrl) return
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-white">{page.name}</p>
      {page.variant_name && (
        <p className="text-xs text-gray-500">
          Variant: {page.variant_name}
        </p>
      )}
      {link ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={fullUrl || ''}
            readOnly
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs font-mono"
          />
          <button
            onClick={copyToClipboard}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Copy link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={fullUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Open link"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <button
          onClick={generateLink}
          disabled={isGenerating}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Link'}
        </button>
      )}
    </div>
  )
}
