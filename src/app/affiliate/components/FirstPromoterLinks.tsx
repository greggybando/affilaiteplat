'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'

type FirstPromoterLinksProps = {
  refId: string | null
}

export function FirstPromoterLinks({ refId }: FirstPromoterLinksProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  if (!refId) {
    return (
      <div className="text-sm text-[rgba(255,255,255,0.6)]">
        Your affiliate links will appear here once your account is set up.
      </div>
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.millionairelifedesign.com'
  
  // Main platform link
  const platformLink = `${baseUrl}?fpr=${refId}`
  
  // Product-specific links (add more as needed)
  const productLinks = [
    { name: 'Disrespect', slug: 'disrespect' },
    { name: 'Charisma', slug: 'charisma' },
    { name: 'ADHD', slug: 'adhd' },
  ]

  const allLinks = [
    { name: 'Platform Subscription', url: platformLink },
    ...productLinks.map(p => ({
      name: p.name,
      url: `${baseUrl}/${p.slug}?fpr=${refId}`,
    })),
  ]

  const copyToClipboard = async (url: string, index: number) => {
    await navigator.clipboard.writeText(url)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="space-y-3">
      {allLinks.map((link, index) => (
        <div key={index} className="space-y-1">
          <p className="text-sm font-medium text-white">{link.name}</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={link.url}
              readOnly
              className="flex-1 px-3 py-2 rounded-lg text-white text-xs font-mono"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
            <button
              onClick={() => copyToClipboard(link.url, index)}
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
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-white rounded-lg transition-all hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              title="Open link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

