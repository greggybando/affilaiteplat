'use client'

import { useState } from 'react'
import { X, Plane } from 'lucide-react'
import { format } from 'date-fns'

interface OrganizeGlobalSendModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  glowIntensity: number
}

interface GlobalSendFormData {
  destination: string
  startDate: string
  endDate: string
  preferredPeople: string
  vibePurpose: string
  budgetRange: string
  description: string
}

function formatGlobalSendPost(data: GlobalSendFormData): string {
  return `🌴 Trip to ${data.destination}

📍 ${data.destination}
📅 ${format(new Date(data.startDate), 'MMM d')} - ${format(new Date(data.endDate), 'MMM d, yyyy')}
👥 Looking for ${data.preferredPeople} people
💰 ${data.budgetRange} budget
🎯 ${data.vibePurpose}

${data.description}`
}

export default function OrganizeGlobalSendModal({ isOpen, onClose, onSuccess, glowIntensity }: OrganizeGlobalSendModalProps) {
  const [formData, setFormData] = useState<GlobalSendFormData>({
    destination: '',
    startDate: '',
    endDate: '',
    preferredPeople: '',
    vibePurpose: '',
    budgetRange: '',
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
    if (!formData.destination || !formData.startDate || !formData.endDate || !formData.preferredPeople || !formData.budgetRange) return

    setLoading(true)
    try {
      // Format the post content
      const formattedContent = formatGlobalSendPost(formData)

      // Create forum post first
      const postRes = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: formattedContent,
          category: 'Global Sends',
          imageUrls: [],
          videoUrl: null
        })
      })

      if (!postRes.ok) {
        throw new Error('Failed to create forum post')
      }

      const postData = await postRes.json()
      const forumPostId = postData.post.id

      // Create global send entry
      const globalSendRes = await fetch('/api/global-sends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: formData.destination,
          start_date: formData.startDate,
          end_date: formData.endDate,
          preferred_people: parseInt(formData.preferredPeople),
          vibe_purpose: formData.vibePurpose,
          budget_range: formData.budgetRange,
          description: formData.description || null,
          forum_post_id: forumPostId
        })
      })

      if (!globalSendRes.ok) {
        throw new Error('Failed to create global send')
      }

      // Reset form and close
      setFormData({
        destination: '',
        startDate: '',
        endDate: '',
        preferredPeople: '',
        vibePurpose: '',
        budgetRange: '',
        description: ''
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to create global send:', error)
      alert('Failed to create global send. Please try again.')
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
            <Plane className="w-6 h-6" />
            Organize Global Send
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
              Destination *
            </label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-yellow-500"
              placeholder="Destination"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-yellow-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-yellow-500"
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
                type="number"
                min="1"
                value={formData.preferredPeople}
                onChange={(e) => setFormData({ ...formData, preferredPeople: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-yellow-500"
                placeholder="Number of people"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                Housing Budget Range *
              </label>
              <input
                type="text"
                value={formData.budgetRange}
                onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-yellow-500"
                placeholder="$500-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
              Vibe/Purpose *
            </label>
            <input
              type="text"
              value={formData.vibePurpose}
              onChange={(e) => setFormData({ ...formData, vibePurpose: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-yellow-500"
              placeholder="e.g., Networking + beach vibes"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-yellow-500 resize-none"
              rows={4}
              placeholder="Tell us about your trip..."
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
              disabled={loading || !formData.destination || !formData.startDate || !formData.endDate || !formData.preferredPeople || !formData.budgetRange}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-[#0f0f1a] rounded-lg font-semibold hover:from-yellow-500 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                boxShadow: glowShadow('0 0 20px rgba(253,224,71,0.5), 0 4px 12px rgba(253,224,71,0.3)', glowIntensity)
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

