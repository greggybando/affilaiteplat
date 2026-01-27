'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trophy, Sparkles } from 'lucide-react'
import MentorBadge from '@/components/MentorBadge'

interface LeaderboardEntry {
  rank: number
  id: string
  user_id: string
  name: string
  avatar_name?: string
  avatar_url?: string
  lifetime_points: number
  points?: number
}

interface LeaderboardData {
  mentor_of_week: LeaderboardEntry | null
  clouted_mentor: LeaderboardEntry | null
  today: LeaderboardEntry[]
  this_week: LeaderboardEntry[]
  all_time: LeaderboardEntry[]
  user_raffle_entries: number
  days_left_in_month: number
}

export function MentorLeaderboardClient() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'alltime'>('today')

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mentors/leaderboard')
      if (res.ok) {
        const leaderboardData = await res.json()
        setData(leaderboardData)
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLeaderboard = () => {
    if (!data) return []
    if (activeTab === 'today') return data.today
    if (activeTab === 'week') return data.this_week
    return data.all_time
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-slate-400">Failed to load leaderboard</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Mentor of the Week */}
        {data.mentor_of_week && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-lg border-2 border-yellow-500/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">👑 ALL HAIL MENTOR OF THE WEEK</h2>
            </div>
            <div className="flex items-center gap-4">
              {data.mentor_of_week.avatar_url ? (
                <img
                  src={data.mentor_of_week.avatar_url}
                  alt={data.mentor_of_week.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-yellow-400"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-2xl border-2 border-yellow-400">
                  {data.mentor_of_week.avatar_name?.[0]?.toUpperCase() || data.mentor_of_week.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold text-white">{data.mentor_of_week.name}</span>
                  <MentorBadge lifetimePoints={data.mentor_of_week.lifetime_points} size="md" />
                </div>
                <p className="text-slate-300">{data.mentor_of_week.points || 0} points this week</p>
              </div>
            </div>
          </div>
        )}

        {/* Clouted Mentor */}
        {data.clouted_mentor && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">✨ CLOUTED MENTOR</h3>
            </div>
            <div className="flex items-center gap-3">
              {data.clouted_mentor.avatar_url ? (
                <img
                  src={data.clouted_mentor.avatar_url}
                  alt={data.clouted_mentor.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
                  {data.clouted_mentor.avatar_name?.[0]?.toUpperCase() || data.clouted_mentor.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{data.clouted_mentor.name}</span>
                  <MentorBadge lifetimePoints={data.clouted_mentor.lifetime_points} size="sm" />
                </div>
                <p className="text-sm text-slate-400">"Most helpful mentor yesterday"</p>
              </div>
            </div>
          </div>
        )}

        {/* Raffle */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">🎟️ MONTHLY RAFFLE</h3>
              <p className="text-slate-400 text-sm">1-on-1 Call with Grant</p>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold">Your entries: {data.user_raffle_entries}</p>
              <p className="text-slate-400 text-sm">Days left: {data.days_left_in_month}</p>
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-3">Win "Clouted Mentor" daily = +1 entry</p>
        </div>

        {/* Leaderboard Tabs */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
          <div className="flex border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'today'
                  ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setActiveTab('week')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'week'
                  ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setActiveTab('alltime')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'alltime'
                  ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All-Time
            </button>
          </div>

          <div className="p-4">
            {getCurrentLeaderboard().length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No mentors have points {activeTab === 'today' ? 'today' : activeTab === 'week' ? 'this week' : 'all-time'} yet
              </div>
            ) : (
              <div className="space-y-2">
                {getCurrentLeaderboard().map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 p-3 rounded-lg ${
                      entry.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'hover:bg-slate-800/30'
                    } transition-colors`}
                  >
                    <div className="w-8 text-center">
                      <span className={`font-bold ${entry.rank === 1 ? 'text-yellow-400' : 'text-slate-400'}`}>
                        #{entry.rank}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      {entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt={entry.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
                          {entry.avatar_name?.[0]?.toUpperCase() || entry.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{entry.name}</span>
                          <MentorBadge lifetimePoints={entry.lifetime_points} showLabel={false} size="sm" />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-semibold ${entry.rank === 1 ? 'text-yellow-400' : 'text-white'}`}>
                          {entry.points !== undefined ? entry.points : entry.lifetime_points} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

