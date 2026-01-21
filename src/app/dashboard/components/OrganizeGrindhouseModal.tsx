'use client'

import { useState } from 'react'
import { X, Home } from 'lucide-react'
import { format } from 'date-fns'

interface OrganizeGrindhouseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  glowIntensity: number
}

interface GrindhouseFormData {
  name: string
  location: string
  duration: string
  startDate: string
  preferredPeople: string
  vibeFocus: string
  description: string
}

function formatGrindhousePost(data: GrindhouseFormData): string {
  return `🏠 ${data.name}

📍 ${data.location}
📅 Starting ${format(new Date(data.startDate), 'MMM d, yyyy')} for ${data.duration}
👥 Looking for ${data.preferredPeople} people
🎯 ${data.vibeFocus}

${data.description}`
}

export default function OrganizeGrindhouseModal({ isOpen, onClose, onSuccess, glowIntensity }: OrganizeGrindhouseModalProps) {
  const [formData, setFormData] = useState<GrindhouseFormData>({
    name: '',
    location: '',
    duration: '3 months',
    startDate: '',
    preferredPeople: '',
    vibeFocus: '',
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
    if (!formData.name || !formData.location || !formData.startDate || !formData.preferredPeople) return

    setLoading(true)
    try {
      // Format the post content
      const formattedContent = formatGrindhousePost(formData)

      // Create forum post first
      const postRes = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: formattedContent,
          category: 'Organize Grindhouse',
          imageUrls: [],
          videoUrl: null
        })
      })

      if (!postRes.ok) {
        throw new Error('Failed to create forum post')
      }

      const postData = await postRes.json()
      const forumPostId = postData.post.id

      // Calculate end date based on duration
      const startDate = new Date(formData.startDate)
      let endDate = new Date(startDate)
      if (formData.duration === '3 months') {
        endDate.setMonth(endDate.getMonth() + 3)
      } else if (formData.duration === '6 months') {
        endDate.setMonth(endDate.getMonth() + 6)
      } else if (formData.duration === '1 year') {
        endDate.setFullYear(endDate.getFullYear() + 1)
      }

      // Create grindhouse entry
      const grindhouseRes = await fetch('/api/grindhouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          start_date: formData.startDate,
          end_date: format(endDate, 'yyyy-MM-dd'),
          duration: formData.duration,
          preferred_people: parseInt(formData.preferredPeople),
          vibe_focus: formData.vibeFocus,
          description: formData.description || null,
          forum_post_id: forumPostId
        })
      })

      if (!grindhouseRes.ok) {
        throw new Error('Failed to create grindhouse')
      }

      // Reset form and close
      setFormData({
        name: '',
        location: '',
        duration: '3 months',
        startDate: '',
        preferredPeople: '',
        vibeFocus: '',
        description: ''
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to create grindhouse:', error)
      alert('Failed to create grindhouse. Please try again.')
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
            <Home className="w-6 h-6" />
            Organize New Grindhouse
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
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-purple-500"
              placeholder="Grindhouse Name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
              Location (City) *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-purple-500"
              placeholder="City"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Duration *
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-purple-500"
                required
              >
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
                <option value="1 year">1 year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-[#22d3ee]"
                style={{
                  colorScheme: 'dark'
                }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Preferred # of People *
              </label>
              <input
                type="text"
                value={formData.preferredPeople}
                onChange={(e) => setFormData({ ...formData, preferredPeople: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-[#22d3ee]"
                placeholder="Number of people"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Vibe/Focus *
              </label>
              <input
                type="text"
                value={formData.vibeFocus}
                onChange={(e) => setFormData({ ...formData, vibeFocus: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-[#22d3ee]"
                placeholder="e.g., Deep Work, Networking, Accountability"
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
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-purple-500 resize-none"
              rows={4}
              placeholder="Tell us about your grindhouse..."
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
              disabled={loading || !formData.name || !formData.location || !formData.startDate || !formData.preferredPeople}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                boxShadow: glowShadow('0 0 20px rgba(168,85,247,0.5), 0 4px 12px rgba(168,85,247,0.3)', glowIntensity)
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

