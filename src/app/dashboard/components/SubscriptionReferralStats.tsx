'use client'

import { useState, useEffect } from 'react'
import { Users, DollarSign, TrendingUp, Link2 } from 'lucide-react'
import { Copy, Check, ExternalLink } from 'lucide-react'

interface ReferralStats {
  referralCode: string | null
  activeReferrals: number
  monthlyRecurringRevenue: number
  pendingCommissions: number
  paidCommissions: number
}

export function SubscriptionReferralStats() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [referralUrl, setReferralUrl] = useState<string>('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/referral/stats')
      const data = await res.json()
      setStats(data)
      if (data.referralCode) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        setReferralUrl(`${appUrl}/signup?ref=${data.referralCode}`)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading || !stats) {
    return null
  }

  // Only show if they have a referral code or active referrals
  if (!stats.referralCode && stats.activeReferrals === 0) {
    return null
  }

  return (
    <div className="bg-[rgba(34,197,94,0.1)] backdrop-blur-[10px] border-2 border-green-500/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Subscription Referrals
        </h3>
      </div>

      {referralUrl && (
        <div className="mb-4">
          <label className="text-xs text-[rgba(255,255,255,0.6)] mb-2 block">Your Referral Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={referralUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-[rgba(0,0,0,0.3)] border border-green-500/30 rounded-lg text-white text-xs font-mono"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <a
              href={referralUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
              title="Open link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[rgba(0,0,0,0.3)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-[rgba(255,255,255,0.6)]">Active</span>
          </div>
          <p className="text-xl font-bold text-white">{stats.activeReferrals || 0}</p>
        </div>

        <div className="bg-[rgba(0,0,0,0.3)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[rgba(255,255,255,0.6)]">MRR</span>
          </div>
          <p className="text-xl font-bold text-white">
            ${((stats.monthlyRecurringRevenue || 0) / 100).toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  )
}

