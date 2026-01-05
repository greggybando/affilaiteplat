'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'

export function SimpleReferralLink() {
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [referralUrl, setReferralUrl] = useState<string>('')

  useEffect(() => {
    loadCode()
  }, [])

  const loadCode = async () => {
    try {
      const res = await fetch('/api/referral/stats')
      const data = await res.json()
      setReferralCode(data.referralCode)
      if (data.referralCode) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        setReferralUrl(`${appUrl}/signup?ref=${data.referralCode}`)
      }
    } catch (error) {
      console.error('Error loading referral code:', error)
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
        await loadCode()
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
    return <div className="text-slate-400 text-sm">Loading...</div>
  }

  return (
    <div className="space-y-3">
      {!referralCode ? (
        <button
          onClick={generateCode}
          disabled={generating}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Referral Link'}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={referralUrl}
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
            href={referralUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Open link"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  )
}

