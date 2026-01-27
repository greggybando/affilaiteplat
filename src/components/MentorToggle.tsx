'use client'

import { useState, useEffect } from 'react'
import MentorBadge from './MentorBadge'

interface MentorStatus {
  is_active: boolean
  availability: 'online' | 'away' | 'offline'
  lifetime_points: number
}

export function MentorToggle() {
  const [mentorStatus, setMentorStatus] = useState<MentorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [updatingAvailability, setUpdatingAvailability] = useState(false)
  const [error, setError] = useState('')
  const [canBecomeMentor, setCanBecomeMentor] = useState(false)

  useEffect(() => {
    checkMentorEligibility()
    fetchMentorStatus()
  }, [])

  const checkMentorEligibility = async () => {
    try {
      const res = await fetch('/api/user/completed-courses')
      if (res.ok) {
        const data = await res.json()
        setCanBecomeMentor(data.hasCompletedCourse || false)
      }
    } catch (error) {
      console.error('Error checking mentor eligibility:', error)
    }
  }

  const fetchMentorStatus = async () => {
    try {
      const res = await fetch('/api/mentors/me')
      if (res.ok) {
        const data = await res.json()
        setMentorStatus(data.mentor)
      } else if (res.status === 404) {
        setMentorStatus(null)
      }
    } catch (error) {
      console.error('Error fetching mentor status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (isActive: boolean) => {
    setToggling(true)
    setError('')

    try {
      const res = await fetch('/api/mentors/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle mentor status')
      }

      setMentorStatus((prev) => ({
        ...prev!,
        is_active: isActive,
        availability: prev?.availability || 'offline'
      }))
    } catch (err: any) {
      setError(err.message || 'Failed to update mentor status')
    } finally {
      setToggling(false)
    }
  }

  const handleAvailabilityChange = async (availability: 'online' | 'away' | 'offline') => {
    if (!mentorStatus?.is_active) return

    setUpdatingAvailability(true)
    setError('')

    try {
      const res = await fetch('/api/mentors/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update availability')
      }

      setMentorStatus((prev) => ({
        ...prev!,
        availability
      }))
    } catch (err: any) {
      setError(err.message || 'Failed to update availability')
    } finally {
      setUpdatingAvailability(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
        <div className="text-slate-400">Loading mentor status...</div>
      </div>
    )
  }

  if (!canBecomeMentor) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Mentor Program</h3>
        <p className="text-slate-400 text-sm">
          Complete at least one course to become a mentor and help others!
        </p>
      </div>
    )
  }

  const isActive = mentorStatus?.is_active || false
  const availability = mentorStatus?.availability || 'offline'
  const lifetimePoints = mentorStatus?.lifetime_points || 0

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Mentor Program</h3>
          <p className="text-slate-400 text-sm">
            Help others and compete for daily/weekly prizes
          </p>
        </div>
        {lifetimePoints > 0 && <MentorBadge lifetimePoints={lifetimePoints} size="lg" />}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Toggle Switch */}
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-white font-medium">Available as Mentor</span>
        </label>
        <button
          onClick={() => handleToggle(!isActive)}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? 'bg-cyan-500' : 'bg-slate-600'
          } ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Availability Selector */}
      {isActive && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <label className="block text-sm font-medium text-white mb-3">
            Availability Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleAvailabilityChange('offline')}
              disabled={updatingAvailability}
              className={`p-3 rounded-lg border-2 transition-all ${
                availability === 'offline'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              } ${updatingAvailability ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-2xl mb-1">🔴</div>
              <div className="text-xs text-white font-medium">Offline</div>
            </button>
            <button
              onClick={() => handleAvailabilityChange('away')}
              disabled={updatingAvailability}
              className={`p-3 rounded-lg border-2 transition-all ${
                availability === 'away'
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              } ${updatingAvailability ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-2xl mb-1">🟡</div>
              <div className="text-xs text-white font-medium">Away</div>
            </button>
            <button
              onClick={() => handleAvailabilityChange('online')}
              disabled={updatingAvailability}
              className={`p-3 rounded-lg border-2 transition-all ${
                availability === 'online'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              } ${updatingAvailability ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-2xl mb-1">🟢</div>
              <div className="text-xs text-white font-medium">Online</div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

