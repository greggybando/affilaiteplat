'use client'

import { useState, useEffect } from 'react'
import { Clock, Crown, User } from 'lucide-react'
import { getWeightClassBadgeColor, getWeightClassIcon } from '@/lib/pod-battles'

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
  trash_talk_message?: string | null
  is_rematch?: boolean
  challengerStats?: { total_sales: number; total_conversions: number; salesPerMember: number }
  defenderStats?: { total_sales: number; total_conversions: number; salesPerMember: number }
  challengerMemberCount: number
  defenderMemberCount: number
  challengerClass?: { level: number; name: string; sales: number }
  defenderClass?: { level: number; name: string; sales: number }
}

interface ActiveBattleCardProps {
  battle: Battle
  currentPodId: string
}

type MemberStat = {
  affiliateId: string
  avatarName: string
  avatarUrl: string | null
  podName: string
  podId: string
  revenue: number
  conversions: number
}

export function ActiveBattleCard({ battle, currentPodId }: ActiveBattleCardProps) {
  const [challengerClass, setChallengerClass] = useState<{ level: number; name: string; sales: number } | null>(null)
  const [defenderClass, setDefenderClass] = useState<{ level: number; name: string; sales: number } | null>(null)
  const [memberStats, setMemberStats] = useState<MemberStat[]>([])
  const [topPerformer, setTopPerformer] = useState<MemberStat | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    fetchWeightClasses()
    fetchMemberStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchMemberStats, 30000)
    return () => clearInterval(interval)
  }, [battle.id])

  async function fetchWeightClasses() {
    try {
      const [challengerRes, defenderRes] = await Promise.all([
        fetch(`/api/pods/weight-class?podId=${battle.challenger_pod.id}`),
        fetch(`/api/pods/weight-class?podId=${battle.defender_pod.id}`),
      ])
      const challengerData = await challengerRes.json()
      const defenderData = await defenderRes.json()
      setChallengerClass(challengerData.weightClass)
      setDefenderClass(defenderData.weightClass)
    } catch (error) {
      console.error('Error fetching weight classes:', error)
    }
  }

  async function fetchMemberStats() {
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/pods/battles/member-stats?battleId=${battle.id}`)
      const data = await res.json()
      setMemberStats(data.memberStats || [])
      setTopPerformer(data.topPerformer || null)
    } catch (error) {
      console.error('Error fetching member stats:', error)
    } finally {
      setLoadingStats(false)
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

    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  const isChallenger = battle.challenger_pod.id === currentPodId
  const ourPodId = isChallenger ? battle.challenger_pod.id : battle.defender_pod.id
  const theirPodId = isChallenger ? battle.defender_pod.id : battle.challenger_pod.id
  const ourPodName = isChallenger ? battle.challenger_pod.name : battle.defender_pod.name
  const theirPodName = isChallenger ? battle.defender_pod.name : battle.challenger_pod.name
  const ourStats = isChallenger ? battle.challengerStats : battle.defenderStats
  const theirStats = isChallenger ? battle.defenderStats : battle.challengerStats
  const ourClass = isChallenger ? challengerClass : defenderClass
  const theirClass = isChallenger ? defenderClass : challengerClass

  const ourSalesPerMember = (ourStats?.salesPerMember || 0) / 100
  const theirSalesPerMember = (theirStats?.salesPerMember || 0) / 100
  const isLeading = ourSalesPerMember > theirSalesPerMember

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-white font-medium text-lg">
          Product: {battle.product.name}
        </p>
        {battle.is_rematch && (
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
            Rematch
          </span>
        )}
      </div>

      {/* Time and Prize */}
      <div className="flex items-center gap-4 text-sm">
        {battle.end_date && (
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-4 h-4" />
            <span>{formatTimeRemaining(battle.end_date)} remaining</span>
          </div>
        )}
        <div className="text-gray-400">
          Prize: {battle.prize_type === 'commission_boost' ? '+10% Boost' : 
                  battle.prize_type === 'member_steal' ? 'Winner Takes a Pick' : 
                  'Bragging Rights'}
        </div>
      </div>

      {/* Pods Comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Our Pod */}
        <div className={`bg-gray-900/50 rounded-lg p-4 border-2 ${isLeading ? 'border-green-500/50' : 'border-gray-700'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getWeightClassIcon(ourClass?.level || 1)}</span>
            <div>
              <p className="text-white font-semibold">{ourPodName}</p>
              <p className={`text-xs ${getWeightClassBadgeColor(ourClass?.level || 1)} px-2 py-0.5 rounded inline-block`}>
                Level {ourClass?.level || 1}: {ourClass?.name || 'Startup Squad'}
              </p>
            </div>
          </div>
                    <div className="space-y-1 mt-3">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Revenue Generated:</span>
                        <span className="text-white font-medium">${((ourStats?.total_sales || 0) / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Conversions:</span>
                        <span className="text-white font-medium">{(ourStats?.total_conversions || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Sales/Member:</span>
                        <span className="text-white font-medium">${ourSalesPerMember.toFixed(2)}</span>
                      </div>
                    </div>
          {isLeading && (
            <div className="mt-2 text-xs text-green-400 font-medium">✓ Leading</div>
          )}
        </div>

        {/* VS Divider */}
        <div className="flex items-center justify-center">
          <span className="text-gray-500 font-bold text-xl">VS</span>
        </div>

        {/* Their Pod */}
        <div className={`bg-gray-900/50 rounded-lg p-4 border-2 ${!isLeading && theirSalesPerMember > 0 ? 'border-green-500/50' : 'border-gray-700'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getWeightClassIcon(theirClass?.level || 1)}</span>
            <div>
              <p className="text-white font-semibold">{theirPodName}</p>
              <p className={`text-xs ${getWeightClassBadgeColor(theirClass?.level || 1)} px-2 py-0.5 rounded inline-block`}>
                Level {theirClass?.level || 1}: {theirClass?.name || 'Startup Squad'}
              </p>
            </div>
          </div>
                    <div className="space-y-1 mt-3">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Revenue Generated:</span>
                        <span className="text-white font-medium">${((theirStats?.total_sales || 0) / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Conversions:</span>
                        <span className="text-white font-medium">{(theirStats?.total_conversions || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Sales/Member:</span>
                        <span className="text-white font-medium">${theirSalesPerMember.toFixed(2)}</span>
                      </div>
                    </div>
          {!isLeading && theirSalesPerMember > 0 && (
            <div className="mt-2 text-xs text-green-400 font-medium">✓ Leading</div>
          )}
        </div>
      </div>

      {/* Top Performer */}
      {topPerformer && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-medium">
              Top Performer: {topPerformer.avatarName} - ${topPerformer.revenue.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Battle Leaderboard */}
      {memberStats.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">BATTLE LEADERBOARD</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Player</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Pod</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Revenue</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map((member, index) => (
                  <tr
                    key={member.affiliateId}
                    className={`border-b border-gray-800/50 ${
                      index === 0 ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-white text-sm">
                      {index + 1}
                      {index === 0 && (
                        <span className="ml-1">👑</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
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
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-300 text-sm">{member.podName}</td>
                    <td className="py-2 px-3 text-right text-white text-sm font-medium">
                      ${member.revenue.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-300 text-sm">
                      {member.conversions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

