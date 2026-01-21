'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, User } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface ProfileHoverCardProps {
  userId: string
  userName: string
  userAvatar: string | null
  children: React.ReactNode
  onChatClick?: () => void
}

interface ProfileData {
  id: string
  name: string
  avatar: string | null
  bio: string | null
  lastActiveAt: string | null
  stats: {
    postsCount: number
    commentsCount: number
    likesReceived: number
  }
}

export function ProfileHoverCard({ userId, userName, userAvatar, children, onChatClick }: ProfileHoverCardProps) {
  const [showCard, setShowCard] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (showCard && !profileData && !loading) {
      fetchProfileData()
    }
  }, [showCard, userId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowCard(false)
      }
    }

    if (showCard) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCard])

  const fetchProfileData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/profile/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setProfileData(data)
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setShowCard(true)
    }, 500) // 500ms delay before showing
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    // Delay hiding to allow moving to card
    setTimeout(() => {
      setShowCard(false)
    }, 200)
  }

  const handleCardMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  const handleCardMouseLeave = () => {
    setShowCard(false)
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {showCard && (
        <div
          ref={cardRef}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="absolute z-50 mt-2 left-0 w-80"
          style={{
            pointerEvents: 'auto'
          }}
        >
          <div 
            className="rounded-xl p-5 relative overflow-hidden"
            style={{
              background: 'rgba(26,26,46,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(6,182,212,0.3)',
              boxShadow: '0 0 30px rgba(6,182,212,0.3), 0 8px 32px rgba(0,0,0,0.8)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none"></div>
            
            <div className="relative z-10">
              {loading ? (
                <div className="text-center py-4 text-[rgba(255,255,255,0.6)]">Loading...</div>
              ) : profileData ? (
                <>
                  {/* Profile Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {profileData.avatar ? (
                      <img
                        src={profileData.avatar}
                        alt={profileData.name}
                        className="w-16 h-16 rounded-full border-2 shrink-0"
                        style={{
                          borderColor: 'rgba(6,182,212,0.5)',
                          boxShadow: '0 0 20px rgba(6,182,212,0.4)'
                        }}
                      />
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl border-2 shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                          borderColor: 'rgba(6,182,212,0.5)',
                          boxShadow: '0 0 20px rgba(6,182,212,0.4)'
                        }}
                      >
                        {profileData.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg mb-1 truncate">{profileData.name}</h3>
                      {profileData.bio && (
                        <p className="text-sm text-[rgba(255,255,255,0.7)] line-clamp-2 mb-2">{profileData.bio}</p>
                      )}
                      {profileData.lastActiveAt && (
                        <p className="text-xs text-[rgba(255,255,255,0.5)]">
                          Active {formatDistanceToNow(new Date(profileData.lastActiveAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{profileData.stats.postsCount}</div>
                      <div className="text-xs text-[rgba(255,255,255,0.6)]">Posts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{profileData.stats.commentsCount}</div>
                      <div className="text-xs text-[rgba(255,255,255,0.6)]">Comments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{profileData.stats.likesReceived}</div>
                      <div className="text-xs text-[rgba(255,255,255,0.6)]">Likes</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/profile/${profileData.id}`}
                      className="flex-1 px-4 py-2 rounded-lg text-white font-semibold text-sm transition-all transform hover:scale-[1.02] relative overflow-hidden group"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(6,182,212,0.3)',
                        boxShadow: '0 0 10px rgba(6,182,212,0.2)'
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <User className="w-4 h-4" />
                        View Profile
                      </span>
                    </Link>
                    <button
                      onClick={() => {
                        if (onChatClick) {
                          onChatClick()
                        } else {
                          window.location.href = `/messages?user=${profileData.id}`
                        }
                        setShowCard(false)
                      }}
                      className="flex-1 px-4 py-2 rounded-lg text-white font-semibold text-sm transition-all transform hover:scale-[1.02] relative overflow-hidden group"
                      style={{
                        background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                        boxShadow: '0 0 20px rgba(34,211,238,0.5), 0 4px 20px rgba(0,0,0,0.3)',
                        color: '#0f0f1a'
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Chat
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-[rgba(255,255,255,0.6)]">Failed to load profile</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

