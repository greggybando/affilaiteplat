'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [showCard, setShowCard] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
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
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const cardWidth = 320 // w-80 = 320px
        const spacing = 8 // mt-2 = 8px
        
        let top = rect.bottom + spacing
        let left = rect.left
        
        // Check if card would go off right edge
        if (left + cardWidth > window.innerWidth - 16) {
          left = window.innerWidth - cardWidth - 16
        }
        
        // Check if card would go off left edge
        if (left < 16) {
          left = 16
        }
        
        setPosition({ top, left })
      }
      setShowCard(true)
    }, 500) // 500ms delay before showing
  }
  
  useEffect(() => {
    if (showCard && triggerRef.current && cardRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current || !cardRef.current) return
        
        const rect = triggerRef.current.getBoundingClientRect()
        const cardWidth = 320 // w-80 = 320px
        const cardHeight = cardRef.current.offsetHeight || 300
        const spacing = 8 // mt-2 = 8px
        
        let top = rect.bottom + spacing
        let left = rect.left
        
        // Check if card would go off bottom of screen
        if (top + cardHeight > window.innerHeight - 16) {
          // Position above instead
          top = rect.top - cardHeight - spacing
        }
        
        // Check if card would go off right edge
        if (left + cardWidth > window.innerWidth - 16) {
          left = window.innerWidth - cardWidth - 16
        }
        
        // Check if card would go off left edge
        if (left < 16) {
          left = 16
        }
        
        // Ensure card doesn't go above viewport
        if (top < 16) {
          top = 16
        }
        
        setPosition({ top, left })
      }
      
      // Initial position update
      updatePosition()
      
      // Update on scroll/resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [showCard, profileData])

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    // Delay hiding to allow moving to card
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowCard(false)
    }, 300)
  }

  const handleCardMouseEnter = () => {
    // Cancel any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  const handleCardMouseLeave = () => {
    // Delay hiding to allow moving back to trigger
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowCard(false)
    }, 300)
  }

  return (
    <>
      <div 
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      
      {showCard && typeof window !== 'undefined' && createPortal(
        <div
          ref={cardRef}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          onClick={(e) => e.stopPropagation()}
          className="fixed w-80"
          style={{
            pointerEvents: 'auto',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            zIndex: 99999,
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
        >
          <div 
            className="rounded-xl p-6 relative overflow-hidden"
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
                  <div className="flex items-start gap-4 mb-5">
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
                  <div className="grid grid-cols-3 gap-4 mb-5 pb-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
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
                  <div className="flex gap-3">
                    <Link
                      href={`/profile/${profileData.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setShowCard(false)
                        router.push(`/profile/${profileData.id}`)
                      }}
                      className="flex-1 px-5 py-3 rounded-lg text-white font-semibold text-sm transition-all transform hover:scale-[1.02] relative overflow-hidden group"
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
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setShowCard(false)
                        if (onChatClick) {
                          onChatClick()
                        } else if (profileData?.id) {
                          // Always navigate to dashboard with openDM query param
                          router.push(`/dashboard?openDM=${profileData.id}`)
                        }
                      }}
                      className="flex-1 px-5 py-3 rounded-lg text-white font-semibold text-sm transition-all transform hover:scale-[1.02] relative overflow-hidden group"
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
        </div>,
        document.body
      )}
    </>
  )
}

