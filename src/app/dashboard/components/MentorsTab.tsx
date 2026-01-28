'use client'

import { useState, useEffect } from 'react'
import MentorBadge from '@/components/MentorBadge'
import { MessageSquare, Loader2 } from 'lucide-react'

// Helper function for glow shadow
const glowShadow = (shadows: string, glowIntensity: number) => {
  if (!glowIntensity || glowIntensity === 0) return 'none'
  const intensity = glowIntensity / 100
  const boosted = intensity * 0.69
  return shadows.split(', ').map(shadow => {
    return shadow.replace(/(\d+)px/g, (match, num) => {
      const val = parseInt(num)
      if (val > 8) {
        return `${Math.round(val * boosted)}px`
      }
      return match
    }).replace(/rgba?\(([^)]+)\)/g, (match, content) => {
      const parts = content.split(',')
      if (parts.length === 4) {
        const alpha = Math.min(1, parseFloat(parts[3].trim()) * boosted)
        return `rgba(${parts.slice(0,3).join(',')},${alpha.toFixed(2)})`
      }
      return match
    })
  }).join(', ')
}

interface MentorsTabProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
  }
  glowIntensity: number
}

interface Mentor {
  id: string
  user_id: string
  name: string
  avatar_name?: string
  avatar_url?: string
  availability: 'online' | 'away' | 'offline'
  specialty_courses: string[]
  lifetime_points: number
}

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
  mentor_of_week: {
    id: string
    name: string
    avatar_name?: string
    avatar_url?: string
    lifetime_points: number
    points: number
  } | null
  clouted_mentor: {
    id: string
    user_id: string
    name: string
    avatar_name?: string
    avatar_url?: string
    lifetime_points: number
  } | null
  today: LeaderboardEntry[]
  this_week: LeaderboardEntry[]
  all_time: LeaderboardEntry[]
  user_raffle_entries: number
  days_left_in_month: number
}

interface MentorStatus {
  id: string
  is_active: boolean
  availability: 'online' | 'away' | 'offline'
  current_day_points: number
  current_week_points: number
  lifetime_points: number
  daily_wins: number
  weekly_wins: number
  raffle_entries: number
}

export default function MentorsTab({ affiliate, glowIntensity }: MentorsTabProps) {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null)
  const [mentorStatus, setMentorStatus] = useState<MentorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingAvailability, setUpdatingAvailability] = useState(false)
  const [togglingMentor, setTogglingMentor] = useState(false)
  const [leaderboardTab, setLeaderboardTab] = useState<'today' | 'this_week' | 'all_time'>('today')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [mentorsRes, leaderboardRes, statusRes] = await Promise.all([
        fetch('/api/mentors'),
        fetch('/api/mentors/leaderboard'),
        fetch('/api/mentors/me')
      ])

      if (mentorsRes.ok) {
        const mentorsData = await mentorsRes.json()
        setMentors(mentorsData.mentors || [])
      }

      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json()
        setLeaderboard(leaderboardData)
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setMentorStatus(statusData.mentor)
      } else if (statusRes.status === 404) {
        setMentorStatus(null)
      }
    } catch (error) {
      console.error('Error loading mentor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvailabilityChange = async (availability: 'online' | 'away' | 'offline') => {
    if (!mentorStatus) {
      // If not a mentor, activate first
      await handleToggleMentor(true)
      if (!mentorStatus) return // Still not a mentor after activation
    }

    setUpdatingAvailability(true)
    try {
      const res = await fetch('/api/mentors/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability })
      })

      if (res.ok) {
        const data = await res.json()
        if (mentorStatus) {
          setMentorStatus({ ...mentorStatus, availability: data.availability })
        }
        await loadData() // Refresh all data
      }
    } catch (error) {
      console.error('Error updating availability:', error)
      alert('Failed to update availability')
    } finally {
      setUpdatingAvailability(false)
    }
  }

  const handleToggleMentor = async (isActive: boolean) => {
    setTogglingMentor(true)
    try {
      const res = await fetch('/api/mentors/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })

      if (res.ok) {
        await loadData() // Refresh all data
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to toggle mentor status')
      }
    } catch (error) {
      console.error('Error toggling mentor:', error)
      alert('Failed to toggle mentor status')
    } finally {
      setTogglingMentor(false)
    }
  }

  const handleAskQuestion = async (mentor: Mentor) => {
    try {
      const sessionRes = await fetch('/api/help-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentor_id: mentor.id
        })
      })

      if (!sessionRes.ok) {
        throw new Error('Failed to create help session')
      }

      // Open DM with mentor using existing pattern
      const currentPath = window.location.pathname
      if (currentPath === '/dashboard') {
        window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: mentor.user_id } }))
      } else {
        window.location.href = `/dashboard`
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: mentor.user_id } }))
        }, 100)
      }
    } catch (error: any) {
      console.error('Error asking question:', error)
      alert(error.message || 'Failed to start conversation')
    }
  }

  const onlineMentors = mentors.filter(m => m.availability === 'online')
  const awayMentors = mentors.filter(m => m.availability === 'away')

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)' }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Mentors</h1>
          <p className="text-[rgba(255,255,255,0.6)]">Get help from experienced members & climb the ranks</p>
        </div>

        {/* Section 1 - YOUR MENTOR STATUS */}
        {mentorStatus && (
          <div className="mb-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 border border-[rgba(255,255,255,0.1)]">
            <h2 className="text-xl font-semibold text-white mb-4">You are a mentor!</h2>
            
            {/* Availability Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-cyan-400 mb-2">Availability Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAvailabilityChange('online')}
                  disabled={updatingAvailability}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    mentorStatus.availability === 'online'
                      ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                      : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  🟢 Online
                </button>
                <button
                  onClick={() => handleAvailabilityChange('away')}
                  disabled={updatingAvailability}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    mentorStatus.availability === 'away'
                      ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400'
                      : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  🟡 Away
                </button>
                <button
                  onClick={() => handleAvailabilityChange('offline')}
                  disabled={updatingAvailability}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    mentorStatus.availability === 'offline'
                      ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                      : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  🔴 Offline
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mb-4 text-sm text-[rgba(255,255,255,0.8)]">
              <div>Today: <span className="font-semibold text-cyan-400">{mentorStatus.current_day_points}</span> pts</div>
              <div>Week: <span className="font-semibold text-cyan-400">{mentorStatus.current_week_points}</span> pts</div>
              <div>Lifetime: <span className="font-semibold text-cyan-400">{mentorStatus.lifetime_points}</span> pts</div>
            </div>

            {/* Toggle Off Button */}
            <button
              onClick={() => handleToggleMentor(false)}
              disabled={togglingMentor}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 text-sm font-medium rounded-lg transition-colors"
            >
              {togglingMentor ? 'Updating...' : 'Stop Being a Mentor'}
            </button>
          </div>
        )}

        {!mentorStatus && (
          <div className="mb-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 border border-[rgba(255,255,255,0.1)]">
            <h2 className="text-xl font-semibold text-white mb-4">Become a Mentor</h2>
            <p className="text-[rgba(255,255,255,0.6)] mb-4">Help others and compete for daily/weekly prizes</p>
            <button
              onClick={() => handleToggleMentor(true)}
              disabled={togglingMentor}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
              style={{ boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.5)', glowIntensity) }}
            >
              {togglingMentor ? 'Activating...' : 'Become a Mentor'}
            </button>
          </div>
        )}

        {/* Section 2 - MENTOR OF THE WEEK */}
        {leaderboard?.mentor_of_week && (
          <div className="mb-6 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 backdrop-blur-[10px] rounded-2xl p-6 border-2 border-yellow-500/50" style={{ boxShadow: glowShadow('0 0 30px rgba(253,224,71,0.5)', glowIntensity) }}>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">ALL HAIL MENTOR OF THE WEEK</h2>
            <div className="flex items-center gap-4">
              {leaderboard.mentor_of_week.avatar_url ? (
                <img
                  src={leaderboard.mentor_of_week.avatar_url}
                  alt={leaderboard.mentor_of_week.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-white text-2xl font-bold">
                  {leaderboard.mentor_of_week.avatar_name?.[0]?.toUpperCase() || leaderboard.mentor_of_week.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-xl font-bold text-white mb-1">{leaderboard.mentor_of_week.avatar_name || leaderboard.mentor_of_week.name}</div>
                <MentorBadge lifetimePoints={leaderboard.mentor_of_week.lifetime_points} />
                <div className="text-yellow-400 font-semibold mt-1">{leaderboard.mentor_of_week.points} points this week</div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3 - CLOUTED MENTOR */}
        {leaderboard?.clouted_mentor && (
          <div className="mb-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 border border-[rgba(255,255,255,0.1)]" style={{ boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.3)', glowIntensity) }}>
            <h2 className="text-lg font-semibold text-cyan-400 mb-4">Clouted Mentor</h2>
            <div className="flex items-center gap-4">
              {leaderboard.clouted_mentor.avatar_url ? (
                <img
                  src={leaderboard.clouted_mentor.avatar_url}
                  alt={leaderboard.clouted_mentor.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {leaderboard.clouted_mentor.avatar_name?.[0]?.toUpperCase() || leaderboard.clouted_mentor.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-lg font-semibold text-white mb-1">{leaderboard.clouted_mentor.avatar_name || leaderboard.clouted_mentor.name}</div>
                <MentorBadge lifetimePoints={leaderboard.clouted_mentor.lifetime_points} />
                <div className="text-[rgba(255,255,255,0.6)] text-sm mt-1">{leaderboard.clouted_mentor.avatar_name || leaderboard.clouted_mentor.name} was the most helpful mentor yesterday</div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4 - MONTHLY RAFFLE */}
        {leaderboard && (
          <div className="mb-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 border border-[rgba(255,255,255,0.1)]">
            <h2 className="text-lg font-semibold text-yellow-400 mb-2">🎟️ MONTHLY RAFFLE: 1-on-1 Call with Grant</h2>
            <div className="text-[rgba(255,255,255,0.8)]">
              <div>Your entries: <span className="font-semibold text-yellow-400">{leaderboard.user_raffle_entries}</span></div>
              <div>Days left: <span className="font-semibold text-yellow-400">{leaderboard.days_left_in_month}</span></div>
            </div>
          </div>
        )}

        {/* Section 5 - AVAILABLE MENTORS */}
        <div className="mb-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 border border-[rgba(255,255,255,0.1)]">
          <h2 className="text-lg font-semibold text-green-400 mb-4">🟢 AVAILABLE NOW</h2>
          {onlineMentors.length === 0 ? (
            <div className="text-center py-8 text-[rgba(255,255,255,0.6)]">No mentors available right now</div>
          ) : (
            <div className="space-y-3">
              {onlineMentors.map(mentor => (
                <div key={mentor.id} className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-3">
                    {mentor.avatar_url ? (
                      <img
                        src={mentor.avatar_url}
                        alt={mentor.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {(mentor.avatar_name || mentor.name)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium">{mentor.avatar_name || mentor.name}</div>
                      <MentorBadge lifetimePoints={mentor.lifetime_points} showLabel={false} size="sm" />
                    </div>
                  </div>
                  <button
                    onClick={() => handleAskQuestion(mentor)}
                    className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Ask Question
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6 - AWAY MENTORS */}
        {awayMentors.length > 0 && (
          <div className="mb-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 border border-[rgba(255,255,255,0.1)]">
            <h2 className="text-lg font-semibold text-yellow-400 mb-4">🟡 AWAY</h2>
            <div className="space-y-3">
              {awayMentors.map(mentor => (
                <div key={mentor.id} className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-3">
                    {mentor.avatar_url ? (
                      <img
                        src={mentor.avatar_url}
                        alt={mentor.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-white font-semibold">
                        {(mentor.avatar_name || mentor.name)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-white font-medium">{mentor.avatar_name || mentor.name}</div>
                      <MentorBadge lifetimePoints={mentor.lifetime_points} showLabel={false} size="sm" />
                    </div>
                  </div>
                  <button
                    onClick={() => handleAskQuestion(mentor)}
                    className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Leave Message
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 7 - LEADERBOARD */}
        {leaderboard && (
          <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 border border-[rgba(255,255,255,0.1)]">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4">Leaderboard</h2>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setLeaderboardTab('today')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  leaderboardTab === 'today'
                    ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400'
                    : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setLeaderboardTab('this_week')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  leaderboardTab === 'this_week'
                    ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400'
                    : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setLeaderboardTab('all_time')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  leaderboardTab === 'all_time'
                    ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400'
                    : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                All-Time
              </button>
            </div>

            {/* Leaderboard Content */}
            <div className="space-y-2">
              {(leaderboardTab === 'today' ? leaderboard.today :
                leaderboardTab === 'this_week' ? leaderboard.this_week :
                leaderboard.all_time).map((entry: LeaderboardEntry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="text-cyan-400 font-bold w-8">#{entry.rank}</div>
                    {entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt={entry.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                        {(entry.avatar_name || entry.name)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="text-white font-medium">{entry.avatar_name || entry.name}</div>
                    <MentorBadge lifetimePoints={entry.lifetime_points} showLabel={false} size="sm" />
                  </div>
                  <div className="text-cyan-400 font-semibold">{entry.points || entry.lifetime_points} pts</div>
                </div>
              ))}
              {((leaderboardTab === 'today' ? leaderboard.today :
                leaderboardTab === 'this_week' ? leaderboard.this_week :
                leaderboard.all_time).length === 0) && (
                <div className="text-center py-8 text-[rgba(255,255,255,0.6)]">No entries yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

