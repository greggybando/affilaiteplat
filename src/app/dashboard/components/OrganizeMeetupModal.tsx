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
  const date = new Date(data.dateTime)
  return `🤝 ${data.title}

📍 ${data.location}
📅 ${format(date, 'MMM d, yyyy')}
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
    type: '',
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
        type: '',
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl rounded-2xl p-6 overflow-hidden" 
        style={{ 
          backgroundColor: '#0f0f1a',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: glowShadow('0 0 30px rgba(34,211,238,0.5), 0 0 60px rgba(34,211,238,0.3), 0 20px 40px rgba(14,165,233,0.25)', glowIntensity)
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
              className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] rounded-xl text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:border-[#22d3ee] focus:ring-2 focus:ring-[#22d3ee]/20 transition-all backdrop-blur-sm"
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
              className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] rounded-xl text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:border-[#22d3ee] focus:ring-2 focus:ring-[#22d3ee]/20 transition-all backdrop-blur-sm"
              placeholder="Location"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-[#22d3ee]"
              style={{
                colorScheme: 'dark'
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Max Attendees (optional)
              </label>
              <input
                type="text"
                value={formData.maxAttendees}
                onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-[#22d3ee]"
                placeholder="Number of spots"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Type *
              </label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-[#22d3ee]"
                placeholder="e.g., Casual Hangout, Networking, Workshop"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] rounded-xl text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:border-[#22d3ee] focus:ring-2 focus:ring-[#22d3ee]/20 transition-all backdrop-blur-sm resize-none"
              rows={4}
              placeholder="Tell us about your meetup..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white rounded-xl font-medium transition-all backdrop-blur-sm border border-[rgba(255,255,255,0.1)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title || !formData.location || !formData.dateTime}
              className="flex-1 px-4 py-2.5 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 50%, #22d3ee 100%)',
                boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.5), 0 4px 12px rgba(34,211,238,0.3), 0 0 30px rgba(14,165,233,0.25)', glowIntensity)
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

