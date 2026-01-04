'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react'

interface ReferralStats {
  referralCode: string | null
  activeReferrals: number
  totalCommissions: number
  pendingCommissions: number
  paidCommissions: number
  monthlyRecurringRevenue: number
  totalEarned?: number
}

export function ReferralSection() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
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

  const generateCode = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/referral/generate', { method: 'POST' })
      const data = await res.json()
      if (data.code) {
        const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
        setReferralUrl(`${appUrl}/signup?ref=${data.code}`)
        await loadStats()
      }
    } catch (error) {
      console.error('Error generating code:', error)
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = () => {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <p className="text-slate-400 text-sm mb-6">
          Refer people to join the platform and earn <span className="text-green-400 font-semibold">50% recurring commission</span> on their monthly subscription ($20/month per active referral)
        </p>

        {/* Referral Code Section */}
        <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-1">Your Referral Link</h3>
              {stats?.referralCode ? (
                <p className="text-xs text-slate-500">Code: <span className="text-white font-mono">{stats.referralCode}</span></p>
              ) : (
                <p className="text-xs text-slate-500">Generate a referral code to start earning</p>
              )}
            </div>
            {!stats?.referralCode && (
              <button
                onClick={generateCode}
                disabled={generating}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Code'}
              </button>
            )}
          </div>

          {referralUrl && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={referralUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Active Referrals</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.activeReferrals || 0}</p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Monthly Recurring</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${((stats?.monthlyRecurringRevenue || 0) / 100).toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-slate-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${((stats?.pendingCommissions || 0) / 100).toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${((stats?.paidCommissions || stats?.totalEarned || 0) / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

