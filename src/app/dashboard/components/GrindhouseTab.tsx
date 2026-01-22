'use client'

import { useState, useEffect } from 'react'
import { Plus, Home, Calendar, Users, Trash2, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import ForumFeedPanel from './ForumFeedPanel'
import OrganizeGrindhouseModal from './OrganizeGrindhouseModal'

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

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

  const [refreshForumFeed, setRefreshForumFeed] = useState(0)

  const handleModalSuccess = () => {
    fetchGrindhouses()
    setRefreshForumFeed(prev => prev + 1) // Trigger forum feed refresh
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
      {/* Left Panel - My Grindhouses (30%) */}
      <div className="w-[30%] border-r border-[rgba(255,255,255,0.1)] flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-2">How it works:</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have to live somewhere. Might as well surround yourself with people who push you to be better. A "grindhouse" is a house where multiple people live, share rent, save money, and build up their income skills as they do it. A conscious shared design to level up This section is purely for organizing grindhouses, finding roommates, making connections.
            </p>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Home className="w-5 h-5" />
              My Grindhouses
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
            Organize New Grindhouse
          </button>
        </div>

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
                  onClick={() => setSelectedGrindhouse(selectedGrindhouse?.id === grindhouse.id ? null : grindhouse)}
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteGrindhouse(grindhouse.id)
                      }}
                      className="p-1 hover:bg-red-500/20 rounded text-[rgba(255,255,255,0.6)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedGrindhouse?.id === grindhouse.id && (
                    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
                      {grindhouse.description && (
                        <p className="text-sm text-[rgba(255,255,255,0.8)] mb-2">{grindhouse.description}</p>
                      )}
                      {grindhouse.participants && grindhouse.participants.length > 0 && (
                        <div className="text-xs text-[rgba(255,255,255,0.6)]">
                          {grindhouse.participants.length} participant(s)
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
          key={refreshForumFeed} // Force re-render when refreshForumFeed changes
          category="Organize Grindhouse"
          currentUser={{
            id: affiliate.id,
            name: affiliate.name,
            avatar: affiliate.avatar_url,
            role: (affiliate as any).role
          }}
          glowIntensity={glowIntensity}
        />
      </div>

      {/* Modal */}
      <OrganizeGrindhouseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        glowIntensity={glowIntensity}
      />
    </div>
  )
}


