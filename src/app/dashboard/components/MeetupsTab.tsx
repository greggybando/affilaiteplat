'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Calendar, MapPin, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import ForumFeedPanel from './ForumFeedPanel'
import OrganizeMeetupModal from './OrganizeMeetupModal'

interface Meetup {
  id: string
  name: string
  location: string
  date: string
  time?: string
  description?: string
  maxParticipants?: number
  participants?: string[]
  user_id: string
  created_at: string
}

interface MeetupsTabProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
    role?: string
    is_admin?: boolean
  }
  glowIntensity: number
}

export default function MeetupsTab({ affiliate, glowIntensity }: MeetupsTabProps) {
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshForumFeed, setRefreshForumFeed] = useState(0)

  useEffect(() => {
    fetchMeetups()
  }, [])

  async function fetchMeetups() {
    setLoading(true)
    try {
      const res = await fetch('/api/meetups')
      if (res.ok) {
        const data = await res.json()
        setMeetups(data.meetups || [])
      }
    } catch (e) {
      console.error('Failed to fetch meetups:', e)
    }
    setLoading(false)
  }

  const handleModalSuccess = () => {
    fetchMeetups()
    setRefreshForumFeed(prev => prev + 1) // Trigger forum feed refresh
  }

  async function deleteMeetup(meetupId: string) {
    if (!confirm('Are you sure you want to delete this meetup?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/meetups/${meetupId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchMeetups()
        if (selectedMeetup?.id === meetupId) {
          setSelectedMeetup(null)
        }
      }
    } catch (e) {
      console.error('Failed to delete meetup:', e)
    }
    setLoading(false)
  }

  const glowShadow = (shadows: string, intensity: number) => {
    return shadows.split(',').map(shadow => {
      const match = shadow.match(/rgba?\([^)]+\)/)
      if (match) {
        const rgba = match[0]
        const alphaMatch = rgba.match(/[\d.]+\)$/)
        if (alphaMatch) {
          const alpha = parseFloat(alphaMatch[0].replace(')', ''))
          const newAlpha = (alpha * intensity) / 100
          return shadow.replace(rgba, rgba.replace(/[\d.]+\)$/, `${newAlpha})`))
        }
      }
      return shadow
    }).join(', ')
  }

  return (
    <div className="flex h-full w-full" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Left Panel - My Meetups (30%) */}
      <div className="w-[30%] border-r border-[rgba(255,255,255,0.1)] flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Meetups
            </h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full px-4 py-2 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 50%, #22d3ee 100%)',
              boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.5), 0 4px 12px rgba(34,211,238,0.3), 0 0 30px rgba(14,165,233,0.25)', glowIntensity)
            }}
          >
            <Plus className="w-4 h-4" />
            Create New Meetup
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && meetups.length === 0 ? (
            <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">Loading meetups...</div>
          ) : meetups.length === 0 ? (
            <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No meetups yet. Create your first one!</p>
            </div>
          ) : (
            <div className="p-2">
              {meetups.map((meetup) => (
                <button
                  key={meetup.id}
                  onClick={() => setSelectedMeetup(selectedMeetup?.id === meetup.id ? null : meetup)}
                  className={`w-full p-4 mb-2 rounded-lg text-left transition-all ${
                    selectedMeetup?.id === meetup.id
                      ? 'bg-[rgba(59,130,246,0.2)] border border-blue-500'
                      : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{meetup.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{meetup.location}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(meetup.date), 'MMM d, yyyy')}
                          {meetup.time && ` at ${meetup.time}`}
                        </span>
                      </div>
                      {meetup.maxParticipants && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                          <Users className="w-3 h-3" />
                          <span>Max {meetup.maxParticipants}</span>
                        </div>
                      )}
                    </div>
                    {/* Only show delete button if user is creator or admin */}
                    {(meetup.user_id === affiliate.id || affiliate.role === 'admin' || affiliate.is_admin === true) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteMeetup(meetup.id)
                        }}
                        className="p-1 hover:bg-red-500/20 rounded text-[rgba(255,255,255,0.6)] hover:text-red-400 transition-colors"
                        title="Delete meetup"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {selectedMeetup?.id === meetup.id && (
                    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
                      {meetup.description && (
                        <p className="text-sm text-[rgba(255,255,255,0.8)] mb-2">{meetup.description}</p>
                      )}
                      {meetup.participants && meetup.participants.length > 0 && (
                        <div className="text-xs text-[rgba(255,255,255,0.6)]">
                          {meetup.participants.length} participant(s)
                        </div>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Forum Feed (70%) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ForumFeedPanel
          key={refreshForumFeed}
          category="Meetups"
          currentUser={{
            id: affiliate.id,
            name: affiliate.name,
            avatar: affiliate.avatar_url
          }}
          glowIntensity={glowIntensity}
        />
      </div>

      {/* Modal */}
      <OrganizeMeetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        glowIntensity={glowIntensity}
      />
    </div>
  )
}


