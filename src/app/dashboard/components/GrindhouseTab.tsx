'use client'

import { useState, useEffect } from 'react'
import { Plus, Home, Calendar, Users, Target, Zap, Edit2, Trash2, X, Save, Clock, MapPin } from 'lucide-react'
import { format } from 'date-fns'

interface Grindhouse {
  id: string
  name: string
  location: string
  startDate: string
  endDate: string
  description?: string
  maxParticipants?: number
  participants?: string[]
  goals?: Goal[]
  created_at: string
}

interface Goal {
  id: string
  title: string
  description?: string
  targetHours?: number
  completed: boolean
}

interface GrindhouseTabProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
  }
  glowIntensity: number
}

export default function GrindhouseTab({ affiliate, glowIntensity }: GrindhouseTabProps) {
  const [grindhouses, setGrindhouses] = useState<Grindhouse[]>([])
  const [selectedGrindhouse, setSelectedGrindhouse] = useState<Grindhouse | null>(null)
  const [isCreatingGrindhouse, setIsCreatingGrindhouse] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newGrindhouse, setNewGrindhouse] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    description: '',
    maxParticipants: ''
  })

  useEffect(() => {
    fetchGrindhouses()
  }, [])

  async function fetchGrindhouses() {
    setLoading(true)
    try {
      const res = await fetch('/api/grindhouses')
      if (res.ok) {
        const data = await res.json()
        setGrindhouses(data.grindhouses || [])
      }
    } catch (e) {
      console.error('Failed to fetch grindhouses:', e)
    }
    setLoading(false)
  }

  async function createGrindhouse() {
    if (!newGrindhouse.name || !newGrindhouse.location || !newGrindhouse.startDate || !newGrindhouse.endDate) return

    setLoading(true)
    try {
      const res = await fetch('/api/grindhouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGrindhouse.name,
          location: newGrindhouse.location,
          start_date: newGrindhouse.startDate,
          end_date: newGrindhouse.endDate,
          description: newGrindhouse.description || null,
          max_participants: newGrindhouse.maxParticipants ? parseInt(newGrindhouse.maxParticipants) : null
        })
      })
      if (res.ok) {
        await fetchGrindhouses()
        setIsCreatingGrindhouse(false)
        setNewGrindhouse({ name: '', location: '', startDate: '', endDate: '', description: '', maxParticipants: '' })
      }
    } catch (e) {
      console.error('Failed to create grindhouse:', e)
    }
    setLoading(false)
  }

  async function deleteGrindhouse(grindhouseId: string) {
    if (!confirm('Are you sure you want to delete this grindhouse?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/grindhouses/${grindhouseId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchGrindhouses()
        if (selectedGrindhouse?.id === grindhouseId) {
          setSelectedGrindhouse(null)
        }
      }
    } catch (e) {
      console.error('Failed to delete grindhouse:', e)
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
      {/* Grindhouses List Sidebar */}
      <div className="w-80 border-r border-[rgba(255,255,255,0.1)] flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Home className="w-5 h-5" />
              My Grindhouses
            </h2>
          </div>
          <button
            onClick={() => setIsCreatingGrindhouse(true)}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-purple-600 hover:to-pink-600 transition-all"
            style={{
              boxShadow: glowShadow('0 0 20px rgba(168,85,247,0.5), 0 4px 12px rgba(168,85,247,0.3)', glowIntensity)
            }}
          >
            <Plus className="w-4 h-4" />
            Organize New Grindhouse
          </button>
        </div>

        {isCreatingGrindhouse && (
          <div className="p-4 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(168,85,247,0.1)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">New Grindhouse</h3>
              <button
                onClick={() => {
                  setIsCreatingGrindhouse(false)
                  setNewGrindhouse({ name: '', location: '', startDate: '', endDate: '', description: '', maxParticipants: '' })
                }}
                className="text-[rgba(255,255,255,0.6)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Grindhouse Name"
                value={newGrindhouse.name}
                onChange={(e) => setNewGrindhouse({ ...newGrindhouse, name: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="Location"
                value={newGrindhouse.location}
                onChange={(e) => setNewGrindhouse({ ...newGrindhouse, location: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-purple-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newGrindhouse.startDate}
                  onChange={(e) => setNewGrindhouse({ ...newGrindhouse, startDate: e.target.value })}
                  className="px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <input
                  type="date"
                  value={newGrindhouse.endDate}
                  onChange={(e) => setNewGrindhouse({ ...newGrindhouse, endDate: e.target.value })}
                  className="px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <textarea
                placeholder="Description (optional)"
                value={newGrindhouse.description}
                onChange={(e) => setNewGrindhouse({ ...newGrindhouse, description: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-purple-500 resize-none"
                rows={2}
              />
              <input
                type="number"
                placeholder="Max Participants (optional)"
                value={newGrindhouse.maxParticipants}
                onChange={(e) => setNewGrindhouse({ ...newGrindhouse, maxParticipants: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={createGrindhouse}
                disabled={loading || !newGrindhouse.name || !newGrindhouse.location || !newGrindhouse.startDate || !newGrindhouse.endDate}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Creating...' : 'Create Grindhouse'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && grindhouses.length === 0 ? (
            <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">Loading grindhouses...</div>
          ) : grindhouses.length === 0 ? (
            <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">
              <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No grindhouses yet. Organize your first one!</p>
            </div>
          ) : (
            <div className="p-2">
              {grindhouses.map((grindhouse) => (
                <button
                  key={grindhouse.id}
                  onClick={() => setSelectedGrindhouse(grindhouse)}
                  className={`w-full p-4 mb-2 rounded-lg text-left transition-all ${
                    selectedGrindhouse?.id === grindhouse.id
                      ? 'bg-[rgba(168,85,247,0.2)] border border-purple-500'
                      : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{grindhouse.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{grindhouse.location}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(grindhouse.startDate), 'MMM d')} - {format(new Date(grindhouse.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {grindhouse.maxParticipants && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                          <Users className="w-3 h-3" />
                          <span>Max {grindhouse.maxParticipants}</span>
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

      {/* Grindhouse Details */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedGrindhouse ? (
          <GrindhouseDetails grindhouse={selectedGrindhouse} onDelete={deleteGrindhouse} glowIntensity={glowIntensity} glowShadow={glowShadow} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Home className="w-16 h-16 mx-auto mb-4 text-[rgba(255,255,255,0.3)]" />
              <p className="text-[rgba(255,255,255,0.6)]">Select a grindhouse to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GrindhouseDetails({ grindhouse, onDelete, glowIntensity, glowShadow }: { grindhouse: Grindhouse; onDelete: (id: string) => void; glowIntensity: number; glowShadow: (shadows: string, intensity: number) => string }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{grindhouse.name}</h1>
          <div className="flex items-center gap-4 text-[rgba(255,255,255,0.6)]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{grindhouse.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(grindhouse.startDate), 'MMMM d')} - {format(new Date(grindhouse.endDate), 'MMMM d, yyyy')}
              </span>
            </div>
            {grindhouse.maxParticipants && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Max {grindhouse.maxParticipants}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(grindhouse.id)}
            className="p-2 bg-[rgba(255,255,255,0.1)] hover:bg-red-500/20 rounded-lg text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {grindhouse.description && (
        <div className="mb-6">
          <p className="text-[rgba(255,255,255,0.8)]">{grindhouse.description}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Goals & Level Up
          </h2>
          {grindhouse.goals && grindhouse.goals.length > 0 ? (
            <div className="space-y-3">
              {grindhouse.goals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Zap className={`w-5 h-5 ${goal.completed ? 'text-yellow-400' : 'text-purple-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold ${goal.completed ? 'text-yellow-400 line-through' : 'text-white'}`}>
                          {goal.title}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-[rgba(255,255,255,0.7)]">{goal.description}</p>
                      )}
                      {goal.targetHours && (
                        <div className="text-sm text-[rgba(255,255,255,0.6)] mt-1">
                          Target: {goal.targetHours} hours
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg">
              <p className="text-[rgba(255,255,255,0.6)]">No goals set yet. Start leveling up!</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants
          </h2>
          {grindhouse.participants && grindhouse.participants.length > 0 ? (
            <div className="p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg">
              <p className="text-[rgba(255,255,255,0.6)]">{grindhouse.participants.length} participant(s)</p>
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

