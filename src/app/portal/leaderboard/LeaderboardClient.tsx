'use client'

import { useState, useEffect } from 'react'
import { Plus, User } from 'lucide-react'
import { TITLES } from '@/lib/titles'

type LeaderboardEntry = {
  rank: number
  affiliateId: string
  avatarName: string
  avatarUrl: string | null
  totalRevenue: number
  conversions: number
  earnings: number
  signature: string | null
  titles?: string[]
}

export function LeaderboardClient({ currentAffiliateId }: { currentAffiliateId: string }) {
  const [showOverall, setShowOverall] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [addingToWatchList, setAddingToWatchList] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [showOverall])

  async function fetchLeaderboard() {
    setLoading(true)
    try {
      const res = await fetch(`/api/leaderboard?showOverall=${showOverall}`)
      const data = await res.json()
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addToWatchList(affiliateId: string) {
    if (addingToWatchList) return
    
    setAddingToWatchList(affiliateId)
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchedAffiliateId: affiliateId }),
      })

      if (res.ok) {
        alert('Added to watch list!')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to add to watch list')
      }
    } catch (error) {
      console.error('Error adding to watch list:', error)
      alert('Failed to add to watch list')
    } finally {
      setAddingToWatchList(null)
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading leaderboard...</div>
  }

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center justify-between mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showOverall}
            onChange={(e) => setShowOverall(e.target.checked)}
            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-green-500 focus:ring-green-500"
          />
          <span className="text-gray-300">Show Overall Leaderboard</span>
        </label>
      </div>

      {/* Table */}
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
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  No data available
                </td>
              </tr>
            ) : (
              leaderboard.map((entry) => (
                <tr key={entry.affiliateId} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-4 px-4 text-white font-medium">#{entry.rank}</td>
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
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white">{entry.avatarName}</span>
                      {entry.titles && entry.titles.length > 0 && (
                        <div className="flex items-center gap-1">
                          {entry.titles.map((titleSlug) => {
                            const title = TITLES[titleSlug as keyof typeof TITLES]
                            if (!title) return null
                            return (
                              <span
                                key={titleSlug}
                                className="text-xs"
                                title={title.description}
                              >
                                {title.icon}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-white">${entry.totalRevenue.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right text-gray-300">{entry.conversions}</td>
                  <td className="py-4 px-4 text-right text-green-400">${entry.earnings.toFixed(2)}</td>
                  <td className="py-4 px-4 text-left text-gray-300 italic max-w-xs truncate" title={entry.signature || ''}>
                    {entry.signature || '-'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {entry.affiliateId !== currentAffiliateId && (
                      <button
                        onClick={() => addToWatchList(entry.affiliateId)}
                        disabled={addingToWatchList === entry.affiliateId}
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {addingToWatchList === entry.affiliateId ? 'Adding...' : 'Add to Watch List'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

