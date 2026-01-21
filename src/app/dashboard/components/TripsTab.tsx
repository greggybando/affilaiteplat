'use client'

import { useState, useEffect } from 'react'
import { Plus, MapPin, Calendar, Plane, Hotel, UtensilsCrossed, Camera, DollarSign, Users, Edit2, Trash2, X, Save, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  description?: string
  budget?: number
  participants?: string[]
  itinerary?: ItineraryItem[]
  created_at: string
}

interface ItineraryItem {
  id: string
  date: string
  time?: string
  activity: string
  type: 'flight' | 'hotel' | 'activity' | 'meal' | 'other'
  notes?: string
}

interface TripsTabProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
  }
  glowIntensity: number
}

export default function TripsTab({ affiliate, glowIntensity }: TripsTabProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [isCreatingTrip, setIsCreatingTrip] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newTrip, setNewTrip] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
    budget: ''
  })

  useEffect(() => {
    fetchTrips()
  }, [])

  async function fetchTrips() {
    setLoading(true)
    try {
      const res = await fetch('/api/trips')
      if (res.ok) {
        const data = await res.json()
        setTrips(data.trips || [])
      }
    } catch (e) {
      console.error('Failed to fetch trips:', e)
    }
    setLoading(false)
  }

  async function createTrip() {
    if (!newTrip.destination || !newTrip.startDate || !newTrip.endDate) return

    setLoading(true)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: newTrip.destination,
          start_date: newTrip.startDate,
          end_date: newTrip.endDate,
          description: newTrip.description || null,
          budget: newTrip.budget ? parseFloat(newTrip.budget) : null
        })
      })
      if (res.ok) {
        await fetchTrips()
        setIsCreatingTrip(false)
        setNewTrip({ destination: '', startDate: '', endDate: '', description: '', budget: '' })
      }
    } catch (e) {
      console.error('Failed to create trip:', e)
    }
    setLoading(false)
  }

  async function deleteTrip(tripId: string) {
    if (!confirm('Are you sure you want to delete this trip?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchTrips()
        if (selectedTrip?.id === tripId) {
          setSelectedTrip(null)
        }
      }
    } catch (e) {
      console.error('Failed to delete trip:', e)
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
      {/* Trips List Sidebar */}
      <div className="w-80 border-r border-[rgba(255,255,255,0.1)] flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              My Trips
            </h2>
          </div>
          <button
            onClick={() => setIsCreatingTrip(true)}
            className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-cyan-600 hover:to-blue-600 transition-all"
            style={{
              boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.5), 0 4px 12px rgba(34,211,238,0.3)', glowIntensity)
            }}
          >
            <Plus className="w-4 h-4" />
            Plan New Trip
          </button>
        </div>

        {isCreatingTrip && (
          <div className="p-4 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(34,211,238,0.1)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">New Trip</h3>
              <button
                onClick={() => {
                  setIsCreatingTrip(false)
                  setNewTrip({ destination: '', startDate: '', endDate: '', description: '', budget: '' })
                }}
                className="text-[rgba(255,255,255,0.6)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Destination"
                value={newTrip.destination}
                onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-cyan-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newTrip.startDate}
                  onChange={(e) => setNewTrip({ ...newTrip, startDate: e.target.value })}
                  className="px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="date"
                  value={newTrip.endDate}
                  onChange={(e) => setNewTrip({ ...newTrip, endDate: e.target.value })}
                  className="px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <textarea
                placeholder="Description (optional)"
                value={newTrip.description}
                onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-cyan-500 resize-none"
                rows={2}
              />
              <input
                type="number"
                placeholder="Budget (optional)"
                value={newTrip.budget}
                onChange={(e) => setNewTrip({ ...newTrip, budget: e.target.value })}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={createTrip}
                disabled={loading || !newTrip.destination || !newTrip.startDate || !newTrip.endDate}
                className="w-full px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Creating...' : 'Create Trip'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && trips.length === 0 ? (
            <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">Loading trips...</div>
          ) : trips.length === 0 ? (
            <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No trips yet. Plan your first trip!</p>
            </div>
          ) : (
            <div className="p-2">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  className={`w-full p-4 mb-2 rounded-lg text-left transition-all ${
                    selectedTrip?.id === trip.id
                      ? 'bg-[rgba(34,211,238,0.2)] border border-cyan-500'
                      : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{trip.destination}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {trip.budget && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                          <DollarSign className="w-3 h-3" />
                          <span>${trip.budget.toLocaleString()}</span>
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

      {/* Trip Details */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTrip ? (
          <TripDetails trip={selectedTrip} onDelete={deleteTrip} glowIntensity={glowIntensity} glowShadow={glowShadow} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-[rgba(255,255,255,0.3)]" />
              <p className="text-[rgba(255,255,255,0.6)]">Select a trip to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TripDetails({ trip, onDelete, glowIntensity, glowShadow }: { trip: Trip; onDelete: (id: string) => void; glowIntensity: number; glowShadow: (shadows: string, intensity: number) => string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTrip, setEditedTrip] = useState(trip)

  useEffect(() => {
    setEditedTrip(trip)
  }, [trip])

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{trip.destination}</h1>
          <div className="flex items-center gap-4 text-[rgba(255,255,255,0.6)]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(trip.startDate), 'MMMM d')} - {format(new Date(trip.endDate), 'MMMM d, yyyy')}
              </span>
            </div>
            {trip.budget && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>${trip.budget.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] rounded-lg text-white transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(trip.id)}
            className="p-2 bg-[rgba(255,255,255,0.1)] hover:bg-red-500/20 rounded-lg text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {trip.description && (
        <div className="mb-6">
          <p className="text-[rgba(255,255,255,0.8)]">{trip.description}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Itinerary
          </h2>
          {trip.itinerary && trip.itinerary.length > 0 ? (
            <div className="space-y-3">
              {trip.itinerary.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {item.type === 'flight' && <Plane className="w-5 h-5 text-cyan-400" />}
                      {item.type === 'hotel' && <Hotel className="w-5 h-5 text-blue-400" />}
                      {item.type === 'meal' && <UtensilsCrossed className="w-5 h-5 text-orange-400" />}
                      {item.type === 'activity' && <Camera className="w-5 h-5 text-purple-400" />}
                      {item.type === 'other' && <MapPin className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">{item.activity}</span>
                        {item.time && (
                          <span className="text-xs text-[rgba(255,255,255,0.6)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[rgba(255,255,255,0.6)]">
                        {format(new Date(item.date), 'MMMM d, yyyy')}
                      </div>
                      {item.notes && (
                        <p className="text-sm text-[rgba(255,255,255,0.7)] mt-2">{item.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg">
              <p className="text-[rgba(255,255,255,0.6)]">No itinerary items yet. Start planning!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

