'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Calendar, MapPin, Edit2, Trash2, X, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Meetup {
  id: string
  name: string
  location: string
  date: string
  time?: string
  description?: string
  maxParticipants?: number
  participants?: string[]
  created_at: string
}

interface MeetupsTabProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
  }
  glowIntensity: number
}

export default function MeetupsTab({ affiliate, glowIntensity }: MeetupsTabProps) {
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null)
  const [isCreatingMeetup, setIsCreatingMeetup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newMeetup, setNewMeetup] = useState({
    name: '',
    location: '',
    date: '',
    time: '',
    description: '',
    maxParticipants: ''
  })

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

  async function createMeetup() {
    if (!newMeetup.name || !newMeetup.location || !newMeetup.date) return

    setLoading(true)
    try {
      const res = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMeetup.name,
          location: newMeetup.location,
          date: newMeetup.date,
          time: newMeetup.time || null,
          description: newMeetup.description || null,
          max_participants: newMeetup.maxParticipants ? parseInt(newMeetup.maxParticipants) : null
        })
      })
      if (res.ok) {
        await fetchMeetups()
        setIsCreatingMeetup(false)
        setNewMeetup({ name: '', location: '', date: '', time: '', description: '', maxParticipants: '' })
      }
    } catch (e) {
      console.error('Failed to create meetup:', e)
    }
    setLoading(false)
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
      {/* Meetups List Sidebar */}
      <div className="w-80 border-r border-[rgba(255,255,255,0.1)] flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Meetups
            </h2>
          </div>
          <button
            onClick={() => setIsCreatingMeetup(true)}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-blue-600 hover:to-cyan-600 transition-all"
            style={{
              boxShadow: glowShadow('0 0 20px rgba(59,130,246,0.5), 0 4px 12px rgba(59,130,246,0.3)', glowIntensity)
            }}
          >
            <Plus className="w-4 h-4" />
            Create New Meetup
          </button>
        </div>

        {isCreatingMeetup && (
          <div className="p-4 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(59,130,246,0.1)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">New Meetup</h3>
              <button
                onClick={() => {
                  setIsCreatingMeetup(false)
                  setNewMeetup({ name: '', location: '', date: '', time: '', description: '', maxParticipants: '' })
                }}
                className="text-[rgba(255,255,255,0.6)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Meetup Name"
                value={newMeetup.name}
                onChange={(e) => setNewMeetup({ ...newMeetup, name: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Location"
                value={newMeetup.location}
                onChange={(e) => setNewMeetup({ ...newMeetup, location: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-blue-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newMeetup.date}
                  onChange={(e) => setNewMeetup({ ...newMeetup, date: e.target.value })}
                  className="px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="time"
                  value={newMeetup.time}
                  onChange={(e) => setNewMeetup({ ...newMeetup, time: e.target.value })}
                  className="px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <textarea
                placeholder="Description (optional)"
                value={newMeetup.description}
                onChange={(e) => setNewMeetup({ ...newMeetup, description: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-blue-500 resize-none"
                rows={2}
              />
              <input
                type="number"
                placeholder="Max Participants (optional)"
                value={newMeetup.maxParticipants}
                onChange={(e) => setNewMeetup({ ...newMeetup, maxParticipants: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={createMeetup}
                disabled={loading || !newMeetup.name || !newMeetup.location || !newMeetup.date}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Creating...' : 'Create Meetup'}
              </button>
            </div>
          </div>
        )}

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
                  onClick={() => setSelectedMeetup(meetup)}
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
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meetup Details */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedMeetup ? (
          <MeetupDetails meetup={selectedMeetup} onDelete={deleteMeetup} glowIntensity={glowIntensity} glowShadow={glowShadow} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-[rgba(255,255,255,0.3)]" />
              <p className="text-[rgba(255,255,255,0.6)]">Select a meetup to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MeetupDetails({ meetup, onDelete, glowIntensity, glowShadow }: { meetup: Meetup; onDelete: (id: string) => void; glowIntensity: number; glowShadow: (shadows: string, intensity: number) => string }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{meetup.name}</h1>
          <div className="flex items-center gap-4 text-[rgba(255,255,255,0.6)]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{meetup.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(meetup.date), 'MMMM d, yyyy')}
                {meetup.time && (
                  <span className="flex items-center gap-1 ml-2">
                    <Clock className="w-3 h-3" />
                    {meetup.time}
                  </span>
                )}
              </span>
            </div>
            {meetup.maxParticipants && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Max {meetup.maxParticipants}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(meetup.id)}
            className="p-2 bg-[rgba(255,255,255,0.1)] hover:bg-red-500/20 rounded-lg text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {meetup.description && (
        <div className="mb-6">
          <p className="text-[rgba(255,255,255,0.8)]">{meetup.description}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants
          </h2>
          {meetup.participants && meetup.participants.length > 0 ? (
            <div className="p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg">
              <p className="text-[rgba(255,255,255,0.6)]">{meetup.participants.length} participant(s)</p>
            </div>
          ) : (
            <div className="p-8 text-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg">
              <p className="text-[rgba(255,255,255,0.6)]">No participants yet. Invite others to join!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

