'use client'

import { useState, useEffect } from 'react'
import { X, User } from 'lucide-react'

type WatchListEntry = {
  affiliateId: string
  avatarName: string
  avatarUrl: string | null
  totalRevenue: number
  conversions: number
  earnings: number
  signature: string | null
}

export function WatchListClient({ currentAffiliateId }: { currentAffiliateId: string }) {
  const [watchList, setWatchList] = useState<WatchListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    fetchWatchList()
  }, [])

  async function fetchWatchList() {
    setLoading(true)
    try {
      const res = await fetch('/api/watchlist')
      const data = await res.json()
      if (data.watchList) {
        // Add current user at the top
        const withSelf = [
          {
            affiliateId: currentAffiliateId,
            avatarName: 'You',
            avatarUrl: null,
            totalRevenue: 0,
            conversions: 0,
            earnings: 0,
            signature: null,
          },
          ...data.watchList,
        ]
        setWatchList(withSelf)
      }
    } catch (error) {
      console.error('Error fetching watch list:', error)
    } finally {
      setLoading(false)
    }
  }

  async function removeFromWatchList(affiliateId: string) {
    if (removing || affiliateId === currentAffiliateId) return
    
    setRemoving(affiliateId)
    try {
      const res = await fetch(`/api/watchlist?watchedAffiliateId=${affiliateId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setWatchList(watchList.filter((entry) => entry.affiliateId !== affiliateId))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to remove from watch list')
      }
    } catch (error) {
      console.error('Error removing from watch list:', error)
      alert('Failed to remove from watch list')
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading watch list...</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Rank</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Avatar</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Name</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Total Revenue</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Conversions</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Earnings</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Signature</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-400">Action</th>
          </tr>
        </thead>
        <tbody>
          {watchList.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-8 text-gray-400">
                Your watch list is empty. Add affiliates from the leaderboard.
              </td>
            </tr>
          ) : (
            watchList.map((entry, index) => (
              <tr key={entry.affiliateId} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-4 px-4 text-white font-medium">#{index + 1}</td>
                <td className="py-4 px-4">
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.avatarName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 text-white">{entry.avatarName}</td>
                <td className="py-4 px-4 text-right text-white">${entry.totalRevenue.toFixed(2)}</td>
                <td className="py-4 px-4 text-right text-gray-300">{entry.conversions}</td>
                <td className="py-4 px-4 text-right text-green-400">${entry.earnings.toFixed(2)}</td>
                <td className="py-4 px-4 text-left text-gray-300 italic max-w-xs truncate" title={entry.signature || ''}>
                  {entry.signature || '-'}
                </td>
                <td className="py-4 px-4 text-center">
                  {entry.affiliateId !== currentAffiliateId && (
                    <button
                      onClick={() => removeFromWatchList(entry.affiliateId)}
                      disabled={removing === entry.affiliateId}
                      className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      {removing === entry.affiliateId ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

