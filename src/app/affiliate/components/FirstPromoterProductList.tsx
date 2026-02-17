'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'

type FirstPromoterCampaign = {
  id?: string | number
  name?: string
  campaign_name?: string
  offer_name?: string
  title?: string
  landing_page_url?: string
  url?: string
  referral_link?: string
  affiliate_link?: string
  link?: string
  commission_rate?: number
  commission_percent?: number
  commission?: number
  commission_type?: string
  clicks?: number
  conversions?: number
  sales?: number
  earnings?: number
  revenue?: number
  pending?: number
  approved?: number
  paid?: number
  [key: string]: any // Allow any other fields from FirstPromoter
}

export function FirstPromoterProductList({
  campaigns,
  refId,
}: {
  campaigns: FirstPromoterCampaign[]
  refId?: string | null
}) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div 
        className="rounded-xl overflow-hidden border p-8 text-center"
        style={{
          background: 'rgba(26,26,46,0.6)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255,255,255,0.1)'
        }}
      >
        <p className="text-[rgba(255,255,255,0.6)]">
          No products available yet. Products will appear here once they're added to FirstPromoter.
        </p>
      </div>
    )
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
        {campaigns.map((campaign, index) => (
          <CampaignRow
            key={campaign.id || index}
            campaign={campaign}
            refId={refId}
          />
        ))}
      </div>
    </div>
  )
}

function CampaignRow({
  campaign,
  refId,
}: {
  campaign: FirstPromoterCampaign
  refId?: string | null
}) {
  const [copied, setCopied] = useState(false)

  // Extract campaign data (handle different field names from FirstPromoter API)
  const campaignName = campaign.name || campaign.campaign_name || campaign.offer_name || campaign.title || 'Unnamed Campaign'
  const landingUrl = campaign.landing_page_url || campaign.url || campaign.link || ''
  const referralLink = campaign.referral_link || campaign.affiliate_link || campaign.link || ''
  const commissionRate = campaign.commission_rate || campaign.commission_percent || campaign.commission || 0
  const clicks = campaign.clicks || 0
  const conversions = campaign.conversions || campaign.sales || 0
  const earnings = campaign.earnings || campaign.revenue || campaign.paid || 0

  // Build the affiliate link - prioritize referral_link from FP, then build from refId + landingUrl
  let affiliateLink = referralLink
  if (!affiliateLink && refId && landingUrl) {
    affiliateLink = `${landingUrl}${landingUrl.includes('?') ? '&' : '?'}fpr=${refId}`
  }
  // Fallback to default link if no campaign-specific link
  if (!affiliateLink && refId) {
    affiliateLink = `https://www.millionairelifedesign.com?fpr=${refId}`
  }

  const copyToClipboard = async () => {
    if (affiliateLink) {
      await navigator.clipboard.writeText(affiliateLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
      <div className="flex items-start gap-4">
        {/* Product Icon */}
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 border"
          style={{
            background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))',
            borderColor: 'rgba(34,211,238,0.3)',
            boxShadow: '0 0 15px rgba(34,211,238,0.2)'
          }}
        >
          📦
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white">{campaignName}</h3>
              {landingUrl && (
                <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1 truncate">
                  {landingUrl}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              {commissionRate > 0 && (
                <div className="text-cyan-400 font-bold text-base">
                  {commissionRate}%
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          {(clicks > 0 || conversions > 0 || earnings > 0) && (
            <div className="flex items-center gap-4 mb-3 text-xs text-[rgba(255,255,255,0.6)]">
              {clicks > 0 && (
                <span>
                  <span className="font-semibold">{clicks.toLocaleString()}</span> clicks
                </span>
              )}
              {conversions > 0 && (
                <span>
                  <span className="font-semibold">{conversions.toLocaleString()}</span> conversions
                </span>
              )}
              {earnings > 0 && (
                <span className="text-cyan-400">
                  <span className="font-semibold">${(earnings / 100).toFixed(2)}</span> earned
                </span>
              )}
            </div>
          )}

          {/* Affiliate Link */}
          {affiliateLink ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={affiliateLink}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg text-white text-xs font-mono"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              />
              <button
                onClick={copyToClipboard}
                className="p-2 text-white rounded-lg transition-all hover:scale-105"
                style={{
                  background: copied ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid ' + (copied ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.2)'),
                }}
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={affiliateLink}
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
          ) : (
            <p className="text-sm text-[rgba(255,255,255,0.5)]">
              {refId ? 'Generating link...' : 'No referral code available'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

