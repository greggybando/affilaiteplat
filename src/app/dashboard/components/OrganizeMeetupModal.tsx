'use client'

import { useState } from 'react'
import { X, Users } from 'lucide-react'
import { format } from 'date-fns'

interface OrganizeMeetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  glowIntensity: number
}

interface MeetupFormData {
  title: string
  location: string
  dateTime: string
  maxAttendees: string
  type: string
  description: string
}

function formatMeetupPost(data: MeetupFormData): string {
  const maxAttendees = data.maxAttendees ? `${data.maxAttendees} spots` : 'Open'
  const dateTime = new Date(data.dateTime)
  return `🤝 ${data.title}

📍 ${data.location}
📅 ${format(dateTime, 'MMM d, yyyy')} at ${format(dateTime, 'h:mm a')}
👥 ${maxAttendees}
🎯 ${data.type}

${data.description}`
}

export default function OrganizeMeetupModal({ isOpen, onClose, onSuccess, glowIntensity }: OrganizeMeetupModalProps) {
  const [formData, setFormData] = useState<MeetupFormData>({
    title: '',
    location: '',
    dateTime: '',
    maxAttendees: '',
    type: 'Casual Hangout',
    description: ''
  })
  const [loading, setLoading] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.location || !formData.dateTime) return

    setLoading(true)
    try {
      // Format the post content
      const formattedContent = formatMeetupPost(formData)

      // Create forum post first
      const postRes = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: formattedContent,
          category: 'Meetups',
          imageUrls: [],
          videoUrl: null
        })
      })

      if (!postRes.ok) {
        throw new Error('Failed to create forum post')
      }

      const postData = await postRes.json()
      const forumPostId = postData.post.id

      // Create meetup entry
      const meetupRes = await fetch('/api/meetups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.title,
          location: formData.location,
          date_time: formData.dateTime,
          max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
          type: formData.type,
          description: formData.description || null,
          forum_post_id: forumPostId
        })
      })

      if (!meetupRes.ok) {
        throw new Error('Failed to create meetup')
      }

      // Reset form and close
      setFormData({
        title: '',
        location: '',
        dateTime: '',
        maxAttendees: '',
        type: 'Casual Hangout',
        description: ''
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to create meetup:', error)
      alert('Failed to create meetup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="relative w-full max-w-2xl rounded-2xl p-6" style={{ 
        backgroundColor: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            Create New Meetup
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-blue-500"
              placeholder="Meetup Title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
              Location *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-blue-500"
              placeholder="Location"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Max Attendees (optional)
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxAttendees}
                onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-blue-500"
                placeholder="Number of spots"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="Casual Hangout">Casual Hangout</option>
                <option value="Networking">Networking</option>
                <option value="Workshop">Workshop</option>
                <option value="Activity">Activity</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-blue-500 resize-none"
              rows={4}
              placeholder="Tell us about your meetup..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] text-white rounded-lg font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title || !formData.location || !formData.dateTime}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                boxShadow: glowShadow('0 0 20px rgba(59,130,246,0.5), 0 4px 12px rgba(59,130,246,0.3)', glowIntensity)
              }}
            >
              {loading ? 'Creating...' : 'Create & Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

