'use client'

import { useState } from 'react'
import { AvatarSetupModal } from '../components/AvatarSetupModal'
import { User, Shield } from 'lucide-react'
import { TITLES } from '@/lib/titles'

export function SettingsClient({
  currentAvatarName,
  currentAvatarUrl,
  currentSignature,
  commissionBoostPercent,
  commissionBoostExpiresAt,
  stealProtectionUntil,
  titles,
}: {
  currentAvatarName?: string | null
  currentAvatarUrl?: string | null
  currentSignature?: string | null
  commissionBoostPercent?: number
  commissionBoostExpiresAt?: string | null
  stealProtectionUntil?: string | null
  titles?: string[]
}) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [avatarName, setAvatarName] = useState(currentAvatarName)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [signature, setSignature] = useState(currentSignature || '')

  function handleSuccess() {
    // Reload page to get updated data
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Profile</h2>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={avatarName || 'Avatar'}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-500" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">Avatar Name</p>
              <p className="text-white font-medium">{avatarName || 'Not set'}</p>
              {signature && (
                <>
                  <p className="text-sm text-gray-400 mb-1 mt-3">Signature</p>
                  <p className="text-white italic">{signature}</p>
                </>
              )}
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </section>

      {/* Status Section */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Status</h2>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          {/* Commission Boost */}
          {commissionBoostPercent && commissionBoostPercent > 0 && commissionBoostExpiresAt && new Date(commissionBoostExpiresAt) > new Date() && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-white font-medium">+{commissionBoostPercent}% Commission Boost</p>
                  <p className="text-sm text-gray-400">
                    {Math.ceil((new Date(commissionBoostExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Steal Protection */}
          {stealProtectionUntil && new Date(stealProtectionUntil) > new Date() && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Steal Protection Active</p>
                  <p className="text-sm text-gray-400">
                    Protected for {Math.ceil((new Date(stealProtectionUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} more days
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Titles */}
          {titles && titles.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Earned Titles</p>
              <div className="flex flex-wrap gap-2">
                {titles.map((titleSlug) => {
                  const title = TITLES[titleSlug as keyof typeof TITLES]
                  if (!title) return null
                  return (
                    <div
                      key={titleSlug}
                      className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg flex items-center gap-2"
                      title={title.description}
                    >
                      <span className="text-lg">{title.icon}</span>
                      <span className="text-white text-sm">{title.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <AvatarSetupModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleSuccess}
        currentAvatarName={avatarName || undefined}
        currentAvatarUrl={avatarUrl || undefined}
        currentSignature={signature || undefined}
      />
    </div>
  )
}

