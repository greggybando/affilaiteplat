'use client'

import { useState, useEffect } from 'react'
import { Plus, MapPin, Calendar, Plane, Users, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import ForumFeedPanel from './ForumFeedPanel'
import OrganizeGlobalSendModal from './OrganizeGlobalSendModal'

interface GlobalSend {
  id: string
  destination: string
  startDate: string
  endDate: string
  description?: string
  budget?: number
  budgetRange?: string
  preferredPeople?: number
  vibePurpose?: string
  participants?: string[]
  created_at: string
}

interface GlobalSendsTabProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
  }
  glowIntensity: number
}

export default function GlobalSendsTab({ affiliate, glowIntensity }: GlobalSendsTabProps) {
  const [globalSends, setGlobalSends] = useState<GlobalSend[]>([])
  const [selectedGlobalSend, setSelectedGlobalSend] = useState<GlobalSend | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshForumFeed, setRefreshForumFeed] = useState(0)

  useEffect(() => {
    fetchGlobalSends()
  }, [])

  async function fetchGlobalSends() {
    setLoading(true)
    try {
      const res = await fetch('/api/global-sends')
      if (res.ok) {
        const data = await res.json()
        setGlobalSends(data.globalSends || [])
      }
    } catch (e) {
      console.error('Failed to fetch global sends:', e)
    }
    setLoading(false)
  }

  const handleModalSuccess = () => {
    fetchGlobalSends()
    setRefreshForumFeed(prev => prev + 1) // Trigger forum feed refresh
  }

  async function deleteGlobalSend(globalSendId: string) {
    if (!confirm('Are you sure you want to delete this global send?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/global-sends/${globalSendId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchGlobalSends()
        if (selectedGlobalSend?.id === globalSendId) {
          setSelectedGlobalSend(null)
        }
      }
    } catch (e) {
      console.error('Failed to delete global send:', e)
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
      {/* Left Panel - My Global Sends (30%) */}
      <div className="w-[30%] border-r border-[rgba(255,255,255,0.1)] flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Plane className="w-5 h-5" />
              My Global Sends
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
            Organize New Global Send
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && globalSends.length === 0 ? (
            <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">Loading global sends...</div>
          ) : globalSends.length === 0 ? (
            <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">
              <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No global sends yet. Organize your first one!</p>
            </div>
          ) : (
            <div className="p-2">
              {globalSends.map((globalSend) => (
                <button
                  key={globalSend.id}
                  onClick={() => setSelectedGlobalSend(selectedGlobalSend?.id === globalSend.id ? null : globalSend)}
                  className={`w-full p-4 mb-2 rounded-lg text-left transition-all ${
                    selectedGlobalSend?.id === globalSend.id
                      ? 'bg-[rgba(253,224,71,0.2)] border border-yellow-400'
                      : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{globalSend.destination}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(globalSend.startDate), 'MMM d')} - {format(new Date(globalSend.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {globalSend.budgetRange && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                          <span>💰 {globalSend.budgetRange}</span>
                        </div>
                      )}
                      {globalSend.preferredPeople && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-[rgba(255,255,255,0.6)]">
                          <Users className="w-3 h-3" />
                          <span>{globalSend.preferredPeople} people</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteGlobalSend(globalSend.id)
                      }}
                      className="p-1 hover:bg-red-500/20 rounded text-[rgba(255,255,255,0.6)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedGlobalSend?.id === globalSend.id && (
                    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
                      {globalSend.description && (
                        <p className="text-sm text-[rgba(255,255,255,0.8)] mb-2">{globalSend.description}</p>
                      )}
                      {globalSend.vibePurpose && (
                        <div className="text-xs text-[rgba(255,255,255,0.6)] mb-1">
                          🎯 {globalSend.vibePurpose}
                        </div>
                      )}
                      {globalSend.participants && globalSend.participants.length > 0 && (
                        <div className="text-xs text-[rgba(255,255,255,0.6)]">
                          {globalSend.participants.length} participant(s)
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
          category="Global Sends"
          currentUser={{
            id: affiliate.id,
            name: affiliate.name,
            avatar: affiliate.avatar_url
          }}
          glowIntensity={glowIntensity}
        />
      </div>

      {/* Modal */}
      <OrganizeGlobalSendModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        glowIntensity={glowIntensity}
      />
    </div>
  )
}
