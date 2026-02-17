'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'

type Product = {
  name: string
  price: string
  slug: string
  image: string
}

const PRODUCTS: Product[] = [
  { name: 'Platform Subscription', price: 'Recurring', slug: '', image: '/products/platform.png' },
  { name: 'Psychology of Disrespect', price: '$9', slug: 'disrespect', image: '/products/disrespect.png' },
  { name: 'Psychology of Charisma', price: '$9', slug: 'charisma', image: '/products/charisma.png' },
  { name: 'ADHD Productivity Course', price: '$19', slug: 'adhd', image: '/products/adhd.png' },
]

export function HardcodedProductLinks({ refId }: { refId: string | null }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  if (!refId) {
    return (
      <div className="text-sm text-[rgba(255,255,255,0.6)]">
        Your affiliate links will appear here once your account is set up.
      </div>
    )
  }

  const baseUrl = 'https://www.millionairelifedesign.com'

  const buildLink = (slug: string) => {
    if (!slug) {
      return `${baseUrl}?fpr=${refId}`
    }
    return `${baseUrl}/${slug}?fpr=${refId}`
  }

  const copyToClipboard = async (link: string, index: number) => {
    await navigator.clipboard.writeText(link)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div 
      className="rounded-xl overflow-hidden border"
      style={{
        background: 'rgba(26,26,46,0.6)',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgba(255,255,255,0.1)'
      }}
    >
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        {PRODUCTS.map((product, index) => {
          const link = buildLink(product.slug)
          
          return (
            <div key={index} className="p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
              <div className="flex items-start gap-4">
                {/* Product Image */}
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to emoji if image fails to load
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = product.slug === '' ? '💰' : '📦'
                        parent.style.fontSize = '1.5rem'
                      }
                    }}
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white">{product.name}</h3>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-cyan-400 font-bold text-base">
                        {product.price}
                      </div>
                    </div>
                  </div>

                  {/* Affiliate Link */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link}
                      readOnly
                      className="flex-1 px-3 py-2 rounded-lg text-white text-xs font-mono"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}
                    />
                    <button
                      onClick={() => copyToClipboard(link, index)}
                      className="p-2 text-white rounded-lg transition-all hover:scale-105"
                      style={{
                        background: copiedIndex === index ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.1)',
                        border: '1px solid ' + (copiedIndex === index ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.2)'),
                      }}
                      title="Copy link"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-white rounded-lg transition-all hover:scale-105"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}
                      title="Open link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

