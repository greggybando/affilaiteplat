'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Users, User } from 'lucide-react'
import { PodWars } from './components/PodWars'
import { PodChat } from './components/PodChat'
import { AnimatedBattleDisplay } from './components/AnimatedBattleDisplay'

type Pod = {
  id: string
  name: string
  createdBy: {
    id: string
    name: string
    avatarName: string
  }
  createdAt: string
  members: {
    id: string
    name: string
    avatarName: string
    avatarUrl: string | null
  }[]
}

type PendingInvite = {
  id: string
  podId: string
  podName: string
  createdBy: {
    id: string
    name: string
    avatarName: string
  }
  invitedAt: string
}

type Affiliate = {
  id: string
  name: string
  avatarName: string
  avatarUrl: string | null
}

type Battle = {
  id: string
  challenger_pod: { id: string; name: string }
  defender_pod: { id: string; name: string }
  product: { id: string; name: string }
  status: string
  duration_days: number
  start_date: string | null
  end_date: string | null
  prize_type: string
  challengerStats?: { total_sales: number; total_conversions: number; salesPerMember: number }
  defenderStats?: { total_sales: number; total_conversions: number; salesPerMember: number }
  challengerMemberCount: number
  defenderMemberCount: number
}

export function PodsClient({ currentAffiliateId }: { currentAffiliateId: string }) {
  const [currentPod, setCurrentPod] = useState<Pod | null>(null)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [podName, setPodName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Affiliate[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<Affiliate[]>([])
  const [creating, setCreating] = useState(false)
  const [responding, setResponding] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [isPodLeader, setIsPodLeader] = useState(false)
  const [activeBattles, setActiveBattles] = useState<Battle[]>([])

  useEffect(() => {
    fetchPods()
  }, [])

  // Fetch battles when pod is loaded (for faster loading)
  useEffect(() => {
    if (currentPod?.id) {
      fetchActiveBattles()
    }
  }, [currentPod?.id])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeout = setTimeout(() => {
        searchAffiliates()
      }, 300)
      return () => clearTimeout(timeout)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }, [searchQuery])

  async function fetchPods() {
    setLoading(true)
    try {
      // Fetch pods and battles in parallel for faster loading
      const [podsRes, battlesRes] = await Promise.all([
        fetch('/api/pods'),
        fetch('/api/pods/battles').catch(() => null) // Don't fail if battles endpoint fails
      ])
      
      const podsData = await podsRes.json()
      setCurrentPod(podsData.currentPod)
      setPendingInvites(podsData.pendingInvites || [])
      
      // Check if user is pod leader
      if (podsData.currentPod) {
        setIsPodLeader(podsData.currentPod.createdBy.id === currentAffiliateId)
        
        // If battles response succeeded, set active battles immediately
        if (battlesRes?.ok) {
          const battlesData = await battlesRes.json()
          setActiveBattles(battlesData.activeBattles || [])
        }
      }
    } catch (error) {
      console.error('Error fetching pods:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchActiveBattles() {
    if (!currentPod?.id) return
    try {
      const res = await fetch('/api/pods/battles')
      const data = await res.json()
      setActiveBattles(data.activeBattles || [])
    } catch (error) {
      console.error('Error fetching active battles:', error)
    }
  }

  async function searchAffiliates() {
    try {
      const res = await fetch(`/api/pods/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      const affiliates = data.affiliates || []
      // Filter out already selected members
      const filtered = affiliates.filter(
        (aff: Affiliate) => !selectedMembers.some((m) => m.id === aff.id)
      )
      setSearchResults(filtered)
      setShowDropdown(filtered.length > 0)
    } catch (error) {
      console.error('Error searching affiliates:', error)
      setSearchResults([])
      setShowDropdown(false)
    }
  }

  async function createPod() {
    if (!podName.trim()) {
      alert('Please enter a pod name')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: podName,
          memberIds: selectedMembers.map((m) => m.id),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setShowCreateModal(false)
        setPodName('')
        setSelectedMembers([])
        setSearchQuery('')
        setSearchResults([])
        setShowDropdown(false)
        fetchPods()
      } else {
        alert(data.error || 'Failed to create pod')
      }
    } catch (error) {
      console.error('Error creating pod:', error)
      alert('Failed to create pod')
    } finally {
      setCreating(false)
    }
  }

  async function respondToInvite(inviteId: string, response: 'accept' | 'decline') {
    setResponding(inviteId)
    try {
      const res = await fetch('/api/pods/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, response }),
      })

      if (res.ok) {
        fetchPods()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to respond to invite')
      }
    } catch (error) {
      console.error('Error responding to invite:', error)
      alert('Failed to respond to invite')
    } finally {
      setResponding(null)
    }
  }

  async function leavePod(podId: string) {
    if (!confirm('Are you sure you want to leave this pod?')) return

    setLeaving(true)
    try {
      const res = await fetch('/api/pods/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podId }),
      })

      if (res.ok) {
        fetchPods()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to leave pod')
      }
    } catch (error) {
      console.error('Error leaving pod:', error)
      alert('Failed to leave pod')
    } finally {
      setLeaving(false)
    }
  }

  function selectMember(affiliate: Affiliate) {
    if (!selectedMembers.some((m) => m.id === affiliate.id)) {
      setSelectedMembers([...selectedMembers, affiliate])
      setSearchQuery('')
      setShowDropdown(false)
      setSearchResults([])
    }
  }

  function removeMember(affiliateId: string) {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== affiliateId))
  }

  const hasActiveBattle = activeBattles.length > 0

  return (
    <div>
      {/* Pod Section Header - Top Left */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pod</h1>
      </div>

      {/* Active Battle Display - At Very Top (Outside Container) */}
      {hasActiveBattle && currentPod && activeBattles.map((battle) => (
        <AnimatedBattleDisplay key={battle.id} battle={battle} currentPodId={currentPod.id} isPodLeader={isPodLeader} />
      ))}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mt-6">

        {loading ? (
          <div className="text-gray-400">Loading pods...</div>
        ) : (
          <div className="space-y-8">
            {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Pending Invites</h2>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">{invite.podName}</p>
                  <p className="text-sm text-gray-400">
                    Created by {invite.createdBy.avatarName || invite.createdBy.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToInvite(invite.id, 'accept')}
                    disabled={responding === invite.id}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {responding === invite.id ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => respondToInvite(invite.id, 'decline')}
                    disabled={responding === invite.id}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pod Wars Section - Hide heading if active battle */}
      {currentPod && (
        <section>
          {!hasActiveBattle && (
            <h2 className="text-xl font-semibold text-white mb-4">Pod Wars</h2>
          )}
          <PodWars
            currentPodId={currentPod.id}
            currentPodName={currentPod.name}
            isPodLeader={isPodLeader}
            hideActiveBattle={hasActiveBattle}
          />
        </section>
      )}

      {/* My Pod - Condensed - At Bottom */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">My Pod</h2>
          {!currentPod && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Pod
            </button>
          )}
        </div>

        {currentPod ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white truncate">
                    {currentPod.name}
                  </h3>
                  <p className="text-xs text-gray-400 truncate">
                    by {currentPod.createdBy.avatarName || currentPod.createdBy.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => leavePod(currentPod.id)}
                disabled={leaving}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 text-sm flex-shrink-0 ml-2"
              >
                {leaving ? 'Leaving...' : 'Leave'}
              </button>
            </div>

            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-2">Members ({currentPod.members.length}):</p>
              <div className="flex flex-wrap gap-2">
                {currentPod.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-1.5 bg-gray-900 rounded-lg px-2 py-1"
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.avatarName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-400" />
                      </div>
                    )}
                    <span className="text-white text-xs">{member.avatarName || member.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pod Chat */}
            <PodChat podId={currentPod.id} currentAffiliateId={currentAffiliateId} />
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center text-gray-400">
            You're not in a pod yet. Create one to get started!
          </div>
        )}
      </section>
          </div>
        )}
      </div>

      {/* Create Pod Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full mx-4 relative">
            <button
              onClick={() => {
                setShowCreateModal(false)
                setPodName('')
                setSelectedMembers([])
                setSearchQuery('')
                setSearchResults([])
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6">Create Pod</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pod Name
                </label>
                <input
                  type="text"
                  value={podName}
                  onChange={(e) => setPodName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter pod name"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Invite Members (search by avatar name)
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (e.target.value.length >= 2) {
                      setShowDropdown(true)
                    } else {
                      setShowDropdown(false)
                    }
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowDropdown(true)
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on dropdown item
                    setTimeout(() => setShowDropdown(false), 200)
                  }}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Type at least 2 characters to search..."
                />

                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto shadow-lg">
                    {searchResults.map((affiliate) => (
                      <button
                        key={affiliate.id}
                        type="button"
                        onClick={() => selectMember(affiliate)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
                      >
                        {affiliate.avatarUrl ? (
                          <img
                            src={affiliate.avatarUrl}
                            alt={affiliate.avatarName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <span className="text-white text-sm">{affiliate.avatarName}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length > 0 && searchQuery.length < 2 && (
                  <p className="text-xs text-gray-500 mt-1">Type at least 2 characters to search</p>
                )}

                {searchQuery.length >= 2 && searchResults.length === 0 && showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-4 text-center text-gray-400 text-sm">
                    No affiliates found
                  </div>
                )}
              </div>

              {selectedMembers.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Selected Members ({selectedMembers.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.avatarName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-400" />
                          </div>
                        )}
                        <span className="text-white text-sm">{member.avatarName}</span>
                        <button
                          type="button"
                          onClick={() => removeMember(member.id)}
                          className="text-gray-400 hover:text-white transition-colors ml-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={createPod}
                  disabled={creating || !podName.trim() || selectedMembers.length === 0}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Pod'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setPodName('')
                    setSelectedMembers([])
                    setSearchQuery('')
                    setSearchResults([])
                    setShowDropdown(false)
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

