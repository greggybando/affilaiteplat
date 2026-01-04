'use client'

import { useState, useEffect } from 'react'
import { Sword, Trophy, Clock, AlertTriangle, User, Target, RotateCcw } from 'lucide-react'
import { ChallengePodModal } from './ChallengePodModal'
import { MemberStealModal } from './MemberStealModal'
import { AnimatedBattleDisplay } from './AnimatedBattleDisplay'
import { TITLES } from '@/lib/titles'

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
  winner_pod: { id: string; name: string } | null
  win_margin_percent?: number | null
  trash_talk_message?: string | null
  is_rematch?: boolean
  forfeit_requested_by_pod_id?: string | null
  forfeit_status?: string | null
  challengerStats?: { total_sales: number; total_conversions: number; salesPerMember: number }
  defenderStats?: { total_sales: number; total_conversions: number; salesPerMember: number }
  challengerMemberCount: number
  defenderMemberCount: number
}

type Bounty = {
  id: string
  target_pod: { id: string; name: string }
  product: { id: string; name: string }
  reward_amount_cents: number
  reward_type: string
  description: string | null
  status: string
  claimed_by_pod: { id: string; name: string } | null
  expires_at: string
}


export function PodWars({ currentPodId, currentPodName, isPodLeader, hideActiveBattle = false }: {
  currentPodId: string | null
  currentPodName: string | null
  isPodLeader: boolean
  hideActiveBattle?: boolean
}) {
  const [battles, setBattles] = useState<Battle[]>([])
  const [activeBattles, setActiveBattles] = useState<Battle[]>([])
  const [pendingChallenges, setPendingChallenges] = useState<Battle[]>([])
  const [completedBattles, setCompletedBattles] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [showMemberStealModal, setShowMemberStealModal] = useState(false)
  const [memberStealBattleId, setMemberStealBattleId] = useState<string | null>(null)
  const [memberStealLosingPodId, setMemberStealLosingPodId] = useState<string | null>(null)

  useEffect(() => {
    if (currentPodId) {
      fetchBattles()
      fetchBounties()
      // Refresh every 30 seconds for active battles
      const interval = setInterval(() => {
        fetchBattles()
        fetchBounties()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [currentPodId])

  async function fetchBattles() {
    try {
      const res = await fetch('/api/pods/battles')
      const data = await res.json()
      setBattles(data.battles || [])
      setActiveBattles(data.activeBattles || [])
      setPendingChallenges(data.pendingChallenges || [])
      setCompletedBattles(data.completedBattles || [])
    } catch (error) {
      console.error('Error fetching battles:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchBounties() {
    try {
      const res = await fetch('/api/bounties')
      const data = await res.json()
      setBounties(data.bounties || [])
    } catch (error) {
      console.error('Error fetching bounties:', error)
    }
  }

  function formatTimeRemaining(endDate: string): string {
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (!currentPodId) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center text-gray-400">
        Join a pod to participate in Pod Wars
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Animated Battle Display - Only show here if not shown at top level */}
      {!hideActiveBattle && activeBattles.length > 0 && activeBattles.map((battle) => (
        <AnimatedBattleDisplay key={battle.id} battle={battle} currentPodId={currentPodId!} isPodLeader={isPodLeader} />
      ))}

      {/* Active Bounties */}
      {bounties.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Active Bounties
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bounties.map((bounty) => (
              <div
                key={bounty.id}
                className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">Beat {bounty.target_pod.name}</p>
                    <p className="text-sm text-gray-400">Product: {bounty.product.name}</p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                    {bounty.reward_type === 'cash' ? `$${(bounty.reward_amount_cents / 100).toFixed(0)}` : '+10% Boost'}
                  </span>
                </div>
                {bounty.description && (
                  <p className="text-sm text-gray-300 mb-2">{bounty.description}</p>
                )}
                {bounty.claimed_by_pod && (
                  <p className="text-xs text-green-400">✓ Claimed by {bounty.claimed_by_pod.name}</p>
                )}
                {!bounty.claimed_by_pod && (
                  <p className="text-xs text-gray-500">
                    Expires: {new Date(bounty.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Challenge Button - Only show when no active battle */}
      {isPodLeader && activeBattles.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Ready to battle?</p>
              <p className="text-white font-medium">Challenge another pod to compete</p>
            </div>
            <button
              onClick={() => setShowChallengeModal(true)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Sword className="w-4 h-4" />
              Challenge a Pod
            </button>
          </div>
        </div>
      )}

      {/* Active Battle Warning */}
      {isPodLeader && activeBattles.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-white font-medium">Active Battle in Progress</p>
              <p className="text-sm text-gray-400">You cannot challenge or accept new battles while an active battle is ongoing.</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Challenges */}
      {pendingChallenges.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3">Pending Challenges</h3>
          <div className="space-y-3">
            {pendingChallenges.map((battle) => (
              <div
                key={battle.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {battle.challenger_pod.id === currentPodId
                        ? `You challenged ${battle.defender_pod.name}`
                        : `${battle.challenger_pod.name} challenged you`}
                    </p>
                    <p className="text-sm text-gray-400">
                      Product: {battle.product.name} • {battle.duration_days} days •{' '}
                      {battle.prize_type === 'commission_boost' ? '+10% Boost' : 
                       battle.prize_type === 'member_steal' ? 'Winner Takes a Pick' : 
                       'Bragging Rights'}
                    </p>
                    {battle.trash_talk_message && (
                      <p className="text-xs text-yellow-400/70 italic mt-1">
                        "{battle.trash_talk_message}"
                      </p>
                    )}
                  </div>
                  {battle.defender_pod.id === currentPodId && isPodLeader && (
                    <div className="flex gap-2">
                      {activeBattles.length > 0 ? (
                        <span className="px-3 py-1.5 bg-gray-700 text-gray-400 rounded-lg text-sm">
                          Active battle in progress
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => respondToChallenge(battle.id, 'accept')}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => respondToChallenge(battle.id, 'decline')}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Battle History */}
      {completedBattles.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3">Battle History</h3>
          <div className="space-y-2">
            {completedBattles.slice(0, 10).map((battle) => {
              const isWinner = battle.winner_pod?.id === currentPodId
              const opponentName =
                battle.challenger_pod.id === currentPodId
                  ? battle.defender_pod.name
                  : battle.challenger_pod.name
              const losingPodId = isWinner
                ? (battle.challenger_pod.id === currentPodId ? battle.defender_pod.id : battle.challenger_pod.id)
                : null
              const canStealMember = isWinner &&
                battle.prize_type === 'member_steal' &&
                battle.win_margin_percent &&
                battle.win_margin_percent > 20 &&
                isPodLeader

              return (
                <div
                  key={battle.id}
                  className={`bg-gray-800 border rounded-lg p-3 ${
                    isWinner ? 'border-green-500/30' : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isWinner ? (
                        <Trophy className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <Sword className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-white text-sm">
                        vs {opponentName} • {battle.product.name}
                      </span>
                      {battle.is_rematch && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                          Rematch
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        isWinner
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {isWinner ? 'Won' : 'Lost'}
                    </span>
                  </div>
                  {battle.win_margin_percent && (
                    <p className="text-xs text-gray-400 mb-2">
                      Win margin: {battle.win_margin_percent.toFixed(1)}%
                    </p>
                  )}
                  {battle.trash_talk_message && (
                    <p className="text-xs text-gray-500 italic mb-2">"{battle.trash_talk_message}"</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {!isWinner && isPodLeader && !battle.is_rematch && (
                      <button
                        onClick={() => requestRematch(battle.id)}
                        className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Request Rematch
                      </button>
                    )}
                    {canStealMember && losingPodId && (
                      <button
                        onClick={() => {
                          setMemberStealBattleId(battle.id)
                          setMemberStealLosingPodId(losingPodId)
                          setShowMemberStealModal(true)
                        }}
                        className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs"
                      >
                        Claim Your Pick
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {showChallengeModal && currentPodId && (
        <ChallengePodModal
          isOpen={showChallengeModal}
          onClose={() => setShowChallengeModal(false)}
          onSuccess={() => {
            setShowChallengeModal(false)
            fetchBattles()
          }}
          currentPodId={currentPodId}
          currentWeightClass={null}
        />
      )}

      {showMemberStealModal && memberStealBattleId && memberStealLosingPodId && (
        <MemberStealModal
          isOpen={showMemberStealModal}
          onClose={() => {
            setShowMemberStealModal(false)
            setMemberStealBattleId(null)
            setMemberStealLosingPodId(null)
          }}
          onSuccess={() => {
            fetchBattles()
          }}
          battleId={memberStealBattleId}
          losingPodId={memberStealLosingPodId}
        />
      )}
    </div>
  )

  async function requestRematch(battleId: string) {
    try {
      const res = await fetch('/api/pods/battles/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalBattleId: battleId }),
      })

      if (res.ok) {
        alert('Rematch requested! Opponent has 48 hours to respond.')
        fetchBattles()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to request rematch')
      }
    } catch (error) {
      console.error('Error requesting rematch:', error)
      alert('Failed to request rematch')
    }
  }

  async function respondToChallenge(battleId: string, response: 'accept' | 'decline') {
    try {
      const res = await fetch('/api/pods/battles/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId, response }),
      })

      if (res.ok) {
        fetchBattles()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to respond to challenge')
      }
    } catch (error) {
      console.error('Error responding to challenge:', error)
      alert('Failed to respond to challenge')
    }
  }
}

