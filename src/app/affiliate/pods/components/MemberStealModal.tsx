'use client'

import { useState, useEffect } from 'react'
import { X, Shield, User, AlertCircle } from 'lucide-react'

type Member = {
  id: string
  affiliate_id: string
  name: string
  avatarName: string
  avatarUrl: string | null
  isLeader: boolean
  isProtected: boolean
  protectionReason?: string
}

interface MemberStealModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  battleId: string
  losingPodId: string
}

export function MemberStealModal({
  isOpen,
  onClose,
  onSuccess,
  battleId,
  losingPodId,
}: MemberStealModalProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [stealing, setStealing] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && losingPodId) {
      fetchMembers()
    }
  }, [isOpen, losingPodId])

  async function fetchMembers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/pods/battles/stealable-members?battleId=${battleId}&losingPodId=${losingPodId}`)
      const data = await res.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  async function stealMember(memberId: string) {
    if (stealing) return
    setStealing(memberId)
    try {
      const res = await fetch('/api/pods/battles/steal-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId, targetMemberId: memberId }),
      })

      const data = await res.json()

      if (res.ok) {
        alert('Member successfully recruited!')
        onSuccess()
        onClose()
      } else {
        alert(data.error || 'Failed to recruit member')
      }
    } catch (error) {
      console.error('Error stealing member:', error)
      alert('Failed to recruit member')
    } finally {
      setStealing(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={stealing !== null}
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-6">Claim Your Pick</h3>
        <p className="text-gray-400 mb-6">
          You won with a 20%+ margin! Select one member to recruit from the losing pod.
        </p>

        {loading ? (
          <div className="text-gray-400 text-center py-8">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No members available to recruit (all protected or leader)
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className={`bg-gray-800 border rounded-lg p-4 ${
                  member.isProtected ? 'border-yellow-500/30' : 'border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.avatarName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{member.avatarName}</p>
                      {member.isProtected && member.protectionReason && (
                        <p className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                          <Shield className="w-3 h-3" />
                          {member.protectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => stealMember(member.id)}
                    disabled={member.isProtected || member.isLeader || stealing !== null}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      member.isProtected || member.isLeader
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {stealing === member.id ? 'Recruiting...' : 'Recruit'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




