'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { ReferralSection } from './ReferralSection'

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

export function ProductList({
  products,
  affiliateLinks,
  affiliateId,
}: {
  products: Product[]
  affiliateLinks: AffiliateLink[]
  affiliateId: string
}) {
  return (
    <div className="space-y-6">
      {/* Recurring Monthly Subscription Product */}
      <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border-2 border-green-500/30 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-green-400">💰</span>
                Platform Subscription - Recurring Revenue
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Earn 50% recurring commission on monthly subscriptions ($20/month per active referral)
              </p>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-bold text-2xl">50%</div>
              <div className="text-sm text-slate-400">Recurring</div>
            </div>
          </div>
          <ReferralSection />
        </div>
      </div>

      {/* Other Products */}
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          affiliateLinks={affiliateLinks.filter(
            (link) => link.landing_page?.product?.id === product.id
          )}
          affiliateId={affiliateId}
        />
      ))}
      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No other products available yet. Check back soon!
        </div>
      )}
    </div>
  )
}

function ProductCard({
  product,
  affiliateLinks,
  affiliateId,
}: {
  product: Product
  affiliateLinks: AffiliateLink[]
  affiliateId: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const activePages = product.landing_pages.filter((p) => p.is_active)
  const commission = product.commission_percent

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Product Header */}
      <div
        className="p-5 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-green-400 font-bold text-lg">
              {commission}% commission
            </div>
            <div className="text-sm text-gray-500">
              ${(product.price_cents / 100).toFixed(0)} product
            </div>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          {activePages.length} landing page{activePages.length !== 1 ? 's' : ''} available
          {' · '}
          <span className="text-green-400">
            Click to {isExpanded ? 'collapse' : 'get links'}
          </span>
        </div>
      </div>

      {/* Expanded: Landing Pages */}
      {isExpanded && (
        <div className="border-t border-gray-800 p-5 space-y-4">
          {activePages.map((page) => {
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
          })}
        </div>
      )}
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

  // Use URL from API response if available, otherwise construct it
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://affiliate-platform-three.vercel.app'
  const fullUrl = link
    ? (link as any).url || `${appUrl}/go/${link.tracking_code}`
    : null

  async function generateLink() {
    setIsGenerating(true)
    try {
      console.log('🔄 Generating link for landing page:', page.id)
      console.log('👤 Affiliate ID from props:', affiliateId)
      console.log('🍪 Cookies available:', document.cookie ? 'yes' : 'no')
      console.log('🍪 Cookie details:', document.cookie.split(';').map(c => c.trim().split('=')[0]))
      
      // Get token from localStorage and send as Authorization header
      const token = localStorage.getItem('affiliate_token')
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/links/generate', {
        method: 'POST',
        headers,
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({
          landing_page_id: page.id,
          affiliate_id: affiliateId, // Pass affiliate_id as fallback
        }),
      })
      
      const data = await res.json()
      console.log('📥 Response from API:', data)
      
      if (!res.ok) {
        console.error('❌ API error:', data.error, data.details)
        alert(`Error: ${data.error || 'Failed to generate link'}`)
        return
      }
      
      if (data.link) {
        console.log('✅ Link generated:', data.link.url)
        setLink(data.link)
      } else {
        console.error('❌ No link in response:', data)
        alert('Error: No link received from server')
      }
    } catch (error) {
      console.error('❌ Error generating link:', error)
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
    <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
      <div>
        <p className="text-white font-medium">{page.name}</p>
        {page.variant_name && (
          <p className="text-xs text-gray-500 mt-0.5">
            Variant: {page.variant_name}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {link ? (
          <>
            {/* Preview Link */}
            <a
              href={`${appUrl}/p/${productSlug}/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white p-2"
              title="Preview page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Copy Link */}
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2">
              <code className="text-sm text-green-400 font-mono">
                {link.tracking_code}
              </code>
              <button
                onClick={copyToClipboard}
                className="text-gray-400 hover:text-white p-1"
                title="Copy full link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={generateLink}
            disabled={isGenerating}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isGenerating ? 'Generating...' : 'Get Link'}
          </button>
        )}
      </div>
    </div>
  )
}
