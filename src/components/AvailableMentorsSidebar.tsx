'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import MentorBadge from './MentorBadge'
import { useRouter } from 'next/navigation'

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

export function AvailableMentorsSidebar() {
  const router = useRouter()
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAway, setExpandedAway] = useState(false)

  useEffect(() => {
    loadMentors()
    const interval = setInterval(loadMentors, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadMentors = async () => {
    try {
      const res = await fetch('/api/mentors')
      if (res.ok) {
        const data = await res.json()
        setMentors(data.mentors || [])
      }
    } catch (error) {
      console.error('Error loading mentors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAskQuestion = async (mentor: Mentor) => {
    try {
      // Create help session
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

      // Navigate to DM with mentor
      router.push(`/dashboard?tab=messages&userId=${mentor.user_id}`)
    } catch (error: any) {
      console.error('Error asking question:', error)
      alert(error.message || 'Failed to start conversation')
    }
  }

  const onlineMentors = mentors.filter((m) => m.availability === 'online')
  const awayMentors = mentors.filter((m) => m.availability === 'away')
  const hasOnline = onlineMentors.length > 0
  const hasAway = awayMentors.length > 0

  const headerEmoji = hasOnline ? '🟢' : hasAway ? '🟡' : ''

  return (
    <div className="w-[250px] text-white flex flex-col shrink-0 h-full relative" style={{ width: '250px', minWidth: '250px', flexShrink: 0, background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', height: '100%', zIndex: 100 }}>
      <div className="p-5 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          {headerEmoji && <span>{headerEmoji}</span>}
          <span>AVAILABLE MENTORS</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No mentors available right now
          </div>
        ) : (
          <>
            {/* Online Mentors */}
            {onlineMentors.length > 0 && (
              <div className="space-y-3">
                {onlineMentors.map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} onAskQuestion={handleAskQuestion} />
                ))}
              </div>
            )}

            {/* Away Mentors (Collapsible) */}
            {awayMentors.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setExpandedAway(!expandedAway)}
                  className="w-full text-left text-xs font-semibold text-slate-400 hover:text-slate-300 mb-2 flex items-center justify-between"
                >
                  <span>🟡 Away ({awayMentors.length})</span>
                  <span className="text-slate-500">{expandedAway ? '−' : '+'}</span>
                </button>
                {expandedAway && (
                  <div className="space-y-3">
                    {awayMentors.map((mentor) => (
                      <MentorCard key={mentor.id} mentor={mentor} onAskQuestion={handleAskQuestion} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MentorCard({ mentor, onAskQuestion }: { mentor: Mentor; onAskQuestion: (mentor: Mentor) => void }) {
  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        {mentor.avatar_url ? (
          <img
            src={mentor.avatar_url}
            alt={mentor.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
            {mentor.avatar_name?.[0]?.toUpperCase() || mentor.name[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-white truncate">{mentor.name}</span>
            <MentorBadge lifetimePoints={mentor.lifetime_points} showLabel={false} size="sm" />
          </div>
          {mentor.specialty_courses.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {mentor.specialty_courses[0]} Expert
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => onAskQuestion(mentor)}
        className="w-full mt-2 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5"
      >
        <MessageSquare className="w-3 h-3" />
        Ask a Question
      </button>
    </div>
  )
}

