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
              className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] rounded-xl text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:border-[#22d3ee] focus:ring-2 focus:ring-[#22d3ee]/20 transition-all backdrop-blur-sm"
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
                className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-[#22d3ee]"
                style={{
                  colorScheme: 'dark'
                }}
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
                className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] rounded-xl text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:border-[#22d3ee] focus:ring-2 focus:ring-[#22d3ee]/20 transition-all backdrop-blur-sm"
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
              className="w-full px-4 py-2.5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)] rounded-xl text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:border-[#22d3ee] focus:ring-2 focus:ring-[#22d3ee]/20 transition-all backdrop-blur-sm resize-none"
              rows={4}
              placeholder="Tell us about your trip..."
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
              disabled={loading || !formData.destination || !formData.startDate || !formData.endDate || !formData.preferredPeople || !formData.budgetRange}
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

