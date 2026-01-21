'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Settings, Search, ChevronRight, MessageSquare, Flame, Lock, Pin, MessageCircle, Copy, ArrowUp, CheckCircle2, Zap, Plus, X, Play, FileCheck, Paperclip, Save, Loader2, Check, Trash2, BarChart3 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow, differenceInSeconds } from 'date-fns'
import { NotificationsDropdown } from './components/NotificationsDropdown'
import { GroupChatModal } from './components/GroupChatModal'
import { CommunityFeed } from './components/CommunityFeed'
import { NotificationBell } from './components/NotificationBell'
import { DMInbox } from './components/DMInbox'
import { GroupChatTab } from './components/GroupChatTab'
import ClassroomTab from './components/ClassroomTab'

interface DashboardClientProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
    role?: string
  }
  isAdmin?: boolean
}

interface Post {
  id: string
  author: {
    name: string
    avatar: string | null
    avatarGradient: string
    rank: string
    posts: number
    joinDate: string
  }
  title: string
  content: string
  category: string
  date: string
  time: string
  views: number
  replies: number
  lastPost: {
    author: string
    date: string
    time: string
  }
  isHot: boolean
  isLocked: boolean
  isPinned: boolean
  postNumber: number
}

const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      name: 'AlexThompson',
      avatar: null,
      avatarGradient: 'from-violet-500 to-purple-600',
      rank: 'Member',
      posts: 127,
      joinDate: 'Jan 2024'
    },
    title: 'Marketing & Sales - Need Help!',
    content: 'Any info in this course or any recommendations on how to go about marketing and getting actual paying customers? Whether to use cold email/LinkedIn or paid ads, etc? I dont see any modules on here',
    category: 'General Discussion',
    date: 'Jun 29, 2024',
    time: '9:15 PM',
    views: 342,
    replies: 8,
    lastPost: {
      author: 'SarahChen',
      date: 'Jun 29, 2024',
      time: '11:42 PM'
    },
    isHot: true,
    isLocked: false,
    isPinned: false,
    postNumber: 1
  },
  {
    id: '2',
    author: {
      name: 'WillMaxwell',
      avatar: null,
      avatarGradient: 'from-emerald-500 to-teal-600',
      rank: 'Admin',
      posts: 2847,
      joinDate: 'Dec 2023'
    },
    title: 'No call today',
    content: 'Sorry for late notice, travelling. If you need any help just dm me. Congrats to @Casey Monaghan on breaking $2k MRR.',
    category: 'Announcements',
    date: 'Apr 15, 2024',
    time: '2:30 PM',
    views: 892,
    replies: 23,
    lastPost: {
      author: 'CaseyMonaghan',
      date: 'Apr 15, 2024',
      time: '4:15 PM'
    },
    isHot: false,
    isLocked: false,
    isPinned: true,
    postNumber: 2
  },
  {
    id: '3',
    author: {
      name: 'MarcusJ',
      avatar: null,
      avatarGradient: 'from-amber-500 to-orange-600',
      rank: 'Senior Member',
      posts: 456,
      joinDate: 'Feb 2024'
    },
    title: 'Question about target companies',
    content: 'Question for everyone: How specific should I get with my target company list? I have about 50 companies but wondering if I should narrow it down more before starting outreach.',
    category: 'General Discussion',
    date: 'May 12, 2024',
    time: '3:22 PM',
    views: 189,
    replies: 15,
    lastPost: {
      author: 'EmmaR',
      date: 'May 13, 2024',
      time: '10:08 AM'
    },
    isHot: false,
    isLocked: false,
    isPinned: false,
    postNumber: 3
  },
  {
    id: '4',
    author: {
      name: 'EmmaRodriguez',
      avatar: null,
      avatarGradient: 'from-pink-500 to-rose-600',
      rank: 'Member',
      posts: 89,
      joinDate: 'Mar 2024'
    },
    title: 'LinkedIn tip that worked for me',
    content: 'LinkedIn tip that worked for me: Instead of "Open to Work" banner, I changed my headline to "[Industry] professional helping [target companies] solve [specific problem]" - connection requests went up 3x',
    category: 'Success Stories',
    date: 'May 8, 2024',
    time: '7:45 PM',
    views: 567,
    replies: 31,
    lastPost: {
      author: 'DavidPark',
      date: 'May 9, 2024',
      time: '1:20 PM'
    },
    isHot: true,
    isLocked: false,
    isPinned: false,
    postNumber: 4
  },
  {
    id: '5',
    author: {
      name: 'DavidPark',
      avatar: null,
      avatarGradient: 'from-blue-500 to-indigo-600',
      rank: 'Member',
      posts: 203,
      joinDate: 'Jan 2024'
    },
    title: 'Company research template is incredible',
    content: 'The company research template is incredible. Spent 2 hours on one company and now I understand their business better than most of their employees probably do. Feels like a cheat code for interviews.',
    category: 'General Discussion',
    date: 'Apr 22, 2024',
    time: '11:30 AM',
    views: 234,
    replies: 12,
    lastPost: {
      author: 'AlexThompson',
      date: 'Apr 23, 2024',
      time: '9:15 AM'
    },
    isHot: false,
    isLocked: false,
    isPinned: false,
    postNumber: 5
  },
]

// Glow utility function
const glowShadow = (shadows: string, glowIntensity: number) => {
  if (!glowIntensity || glowIntensity === 0) return 'none'
  const intensity = glowIntensity / 100
  const boosted = intensity * 0.69
  return shadows.split(', ').map(shadow => {
    return shadow.replace(/(\d+)px/g, (match, num) => {
      const val = parseInt(num)
      if (val > 8) {
        return `${Math.round(val * boosted)}px`
      }
      return match
    }).replace(/rgba?\(([^)]+)\)/g, (match, content) => {
      const parts = content.split(',')
      if (parts.length === 4) {
        const alpha = Math.min(1, parseFloat(parts[3].trim()) * boosted)
        return `rgba(${parts.slice(0,3).join(',')},${alpha.toFixed(2)})`
      }
      return match
    })
  }).join(', ')
}

export function DashboardClient({ affiliate, isAdmin = false }: DashboardClientProps) {
  // Debug admin status
  useEffect(() => {
    console.log('[DashboardClient] Admin check:', {
      isAdmin,
      role: affiliate.role,
      affiliateId: affiliate.id
    })
  }, [isAdmin, affiliate.role, affiliate.id])
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const openDMUserId = searchParams.get('openDM')
  const tabParam = searchParams.get('tab') as 'community' | 'classroom' | 'groupchat' | null
  const [activeTab, setActiveTab] = useState<'community' | 'classroom' | 'groupchat'>(tabParam || 'community')
  
  // Clear openDM query param after it's been used
  useEffect(() => {
    if (openDMUserId) {
      // Remove the query param from URL without reloading
      const url = new URL(window.location.href)
      url.searchParams.delete('openDM')
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [openDMUserId, router])
  
  // Update activeTab when tab query param changes
  useEffect(() => {
    if (tabParam && ['community', 'classroom', 'groupchat'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false)
  const [glowIntensity, setGlowIntensity] = useState(50) // Default 50%
  const [classroomResetKey, setClassroomResetKey] = useState(0)
  
  // Debug: Log when key changes
  useEffect(() => {
    console.log('[DashboardClient] classroomResetKey changed to:', classroomResetKey)
  }, [classroomResetKey])
  const [searchQuery, setSearchQuery] = useState('')
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false)
  const avatarDropdownRef = useRef<HTMLDivElement>(null)

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
        setIsAvatarDropdownOpen(false)
      }
    }
    if (isAvatarDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isAvatarDropdownOpen])
  
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }


  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden" style={{ width: '100vw', height: '100vh', maxWidth: '100vw', boxSizing: 'border-box', backgroundColor: '#0f0f1a', position: 'relative' }}>
      {/* Header with Glass Morphism */}
      <header className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.1)] shrink-0 relative" style={{ backdropFilter: 'blur(20px)', zIndex: 50000 }}>
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo with glow - Metallic cyan with lightning bolt */}
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
              border: '2px solid rgba(34,211,238,0.6)',
              boxShadow: `
                inset 0 1px 2px rgba(255,255,255,0.1),
                inset 0 -1px 2px rgba(0,0,0,0.9),
                0 2px 8px rgba(0,0,0,0.8),
                0 0 1px rgba(34,211,238,0.5),
                ${glowShadow('0 0 20px rgba(34,211,238,0.8), 0 0 40px rgba(34,211,238,0.6), 0 0 80px rgba(34,211,238,0.4)', glowIntensity)}
              `
            }}
          >
            <div className="absolute inset-0 opacity-20" style={{
              background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(34,211,238,0.1) 2px, rgba(34,211,238,0.1) 4px)',
              backgroundSize: '8px 100%'
            }} />
            <Zap className="w-6 h-6 relative z-10" fill="rgba(34,211,238,0.9)" stroke="rgba(34,211,238,0.9)" style={{
              filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.8)) drop-shadow(0 0 8px rgba(34,211,238,0.6))',
              textShadow: '0 0 8px rgba(34,211,238,0.8)'
            }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Lifedesign</h1>
            <p className="text-[rgba(255,255,255,0.6)] text-xs">change your life, get rich, develop strong friendships, have some f****** FUN</p>
          </div>
        </div>
            <div className="flex items-center gap-3 relative" style={{ zIndex: 99998 }}>
              {/* Life Design Neon Sign */}
              <div className="relative px-4 py-2.5 bg-gradient-to-br from-cyan-900/40 via-blue-900/30 to-cyan-800/40 rounded-xl border border-cyan-500/40 backdrop-blur-sm overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-shimmer" style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 3s ease-in-out infinite'
                }} />
                <style jsx>{`
                  @keyframes shimmer {
                    0%, 100% { background-position: -200% 0; }
                    50% { background-position: 200% 0; }
                  }
                  @keyframes pulse-glow {
                    0%, 100% { 
                      filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.9)) drop-shadow(0 0 16px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 24px rgba(34, 211, 238, 0.7));
                    }
                    50% { 
                      filter: drop-shadow(0 0 12px rgba(34, 211, 238, 1)) drop-shadow(0 0 24px rgba(6, 182, 212, 0.9)) drop-shadow(0 0 36px rgba(34, 211, 238, 0.8));
                    }
                  }
                  @keyframes lightning {
                    0%, 90%, 100% { opacity: 1; transform: scale(1); }
                    5%, 10% { opacity: 0.3; transform: scale(0.95); }
                    7.5% { opacity: 1; transform: scale(1.1); }
                  }
                `}</style>
                <div className="relative flex items-center gap-2">
                  <div className="relative" style={{
                    animation: 'lightning 4s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.9)) drop-shadow(0 0 16px rgba(6, 182, 212, 0.7))'
                  }}>
                    <Zap className="w-5 h-5 text-cyan-400" fill="currentColor" style={{
                      filter: 'drop-shadow(0 0 4px rgba(34, 211, 238, 1))'
                    }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300" style={{
                      textShadow: '0 0 20px rgba(34, 211, 238, 0.9), 0 0 40px rgba(6, 182, 212, 0.8), 0 0 60px rgba(34, 211, 238, 0.7)',
                      animation: 'pulse-glow 2s ease-in-out infinite',
                      letterSpacing: '0.05em',
                      fontWeight: 700
                    }}>
                      LIFE
                    </span>
                    <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-cyan-400" style={{
                      textShadow: '0 0 20px rgba(34, 211, 238, 1), 0 0 40px rgba(6, 182, 212, 0.9), 0 0 60px rgba(34, 211, 238, 0.8)',
                      animation: 'pulse-glow 2s ease-in-out infinite 0.5s',
                      letterSpacing: '0.05em',
                      fontWeight: 700
                    }}>
                      DESIGN
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Lightning Glow Control */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[rgba(255,255,255,0.1)] rounded-lg">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={glowIntensity}
                  onChange={(e) => setGlowIntensity(Number(e.target.value))}
                  className="w-16 h-1 bg-[rgba(255,255,255,0.2)] rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span className="text-white text-[10px] w-6 text-right">{glowIntensity}%</span>
              </div>
              {/* Search Bar */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.6)]" />
                <input
                  type="text"
                  placeholder="Search forums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && activeTab === 'community') {
                      // Search is handled by CommunityFeed component
                    }
                  }}
                  className="pl-9 pr-4 py-1.5 bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.2)] rounded-xl text-sm text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-yellow-400/50 w-56"
                  style={{ backdropFilter: 'blur(10px)' }}
                />
              </div>
              <NotificationBell currentUserId={affiliate.id} />
              <DMInbox key={openDMUserId || 'default'} currentUserId={affiliate.id} initialUserId={openDMUserId || undefined} />
              
              {/* Profile Avatar Dropdown */}
              <div className="relative" ref={avatarDropdownRef} style={{ zIndex: 999999 }}>
                <button
                  onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  title="Profile menu"
                >
                  {affiliate.avatar_url ? (
                    <img
                      src={affiliate.avatar_url}
                      alt={affiliate.avatar_name || affiliate.name}
                      className="w-8 h-8 rounded-full object-cover border-2 cursor-pointer"
                      style={{
                        borderColor: 'rgba(34,211,238,0.5)',
                        boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                      }}
                    />
                  ) : (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center border-2 cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                        borderColor: 'rgba(34,211,238,0.5)',
                        boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                      }}
                    >
                      <span className="text-white text-xs font-bold">
                        {affiliate.avatar_name?.[0]?.toUpperCase() || affiliate.name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isAvatarDropdownOpen && (
                  <div 
                    className="fixed w-56 bg-[rgba(26,26,46,0.95)] backdrop-blur-[20px] rounded-xl border border-[rgba(255,255,255,0.2)] overflow-hidden shadow-2xl"
                    style={{ 
                      right: '1rem', 
                      top: '4rem', 
                      zIndex: 999999, 
                      backdropFilter: 'blur(20px)', 
                      boxShadow: '0 0 40px rgba(6,182,212,0.3), 0 8px 32px rgba(0,0,0,0.8)' 
                    }}
                  >
                    {/* User Info Header */}
                    <div className="p-4 border-b border-[rgba(255,255,255,0.1)] bg-gradient-to-r from-[rgba(24,24,27,0.92)] to-[rgba(12,74,110,0.85)]">
                      <div className="text-white font-semibold truncate">{affiliate.avatar_name || affiliate.name}</div>
                      <div className="text-xs text-[rgba(255,255,255,0.6)] truncate">{affiliate.name}</div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        href="/settings"
                        onClick={() => setIsAvatarDropdownOpen(false)}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-3 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-cyan-400" />
                        Settings
                      </Link>
                      {(isAdmin || (affiliate as any).role === 'admin' || (affiliate as any).role === 'moderator' || (affiliate as any).is_admin) && (
                        <>
                          <div className="border-t border-[rgba(255,255,255,0.1)] my-1" />
                          <Link
                            href="/admin/dashboard"
                            onClick={() => setIsAvatarDropdownOpen(false)}
                            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-3 transition-colors"
                          >
                            <BarChart3 className="w-4 h-4 text-purple-400" />
                            Admin Dashboard
                          </Link>
                        </>
                      )}
                      <div className="border-t border-[rgba(255,255,255,0.1)] my-1" />
                      <button
                        onClick={() => {
                          setIsAvatarDropdownOpen(false)
                          handleLogout()
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-3 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-1 mt-3 border-t border-[rgba(255,255,255,0.1)] pt-2">
            <button
              onClick={() => setActiveTab('community')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'community'
                  ? 'text-white'
                  : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
              }`}
              style={activeTab === 'community' ? {
                background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
                border: '2px solid rgba(34,211,238,0.6)',
                boxShadow: `
                  inset 0 1px 2px rgba(255,255,255,0.1),
                  inset 0 -1px 2px rgba(0,0,0,0.9),
                  0 2px 8px rgba(0,0,0,0.8),
                  0 0 1px rgba(34,211,238,0.5),
                  ${glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity)}
                `,
                color: 'rgba(34,211,238,0.95)',
                textShadow: '0 0 8px rgba(34,211,238,0.6), 0 1px 2px rgba(0,0,0,0.8)'
              } : {}}
            >
              Community
            </button>
            <button
              onClick={() => {
                setActiveTab('classroom')
                setClassroomResetKey(prev => prev + 1) // Force reset when button is clicked
              }}
              className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'classroom'
                  ? 'text-white'
                  : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
              }`}
              style={activeTab === 'classroom' ? {
                background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
                border: '2px solid rgba(34,211,238,0.6)',
                boxShadow: `
                  inset 0 1px 2px rgba(255,255,255,0.1),
                  inset 0 -1px 2px rgba(0,0,0,0.9),
                  0 2px 8px rgba(0,0,0,0.8),
                  0 0 1px rgba(34,211,238,0.5),
                  ${glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity)}
                `,
                color: 'rgba(34,211,238,0.95)',
                textShadow: '0 0 8px rgba(34,211,238,0.6), 0 1px 2px rgba(0,0,0,0.8)'
              } : {}}
            >
              Classroom
            </button>
            <button
              onClick={() => setActiveTab('groupchat')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'groupchat'
                  ? 'text-white'
                  : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
              }`}
              style={activeTab === 'groupchat' ? {
                background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
                border: '2px solid rgba(34,211,238,0.6)',
                boxShadow: `
                  inset 0 1px 2px rgba(255,255,255,0.1),
                  inset 0 -1px 2px rgba(0,0,0,0.9),
                  0 2px 8px rgba(0,0,0,0.8),
                  0 0 1px rgba(34,211,238,0.5),
                  ${glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity)}
                `,
                color: 'rgba(34,211,238,0.95)',
                textShadow: '0 0 8px rgba(34,211,238,0.6), 0 1px 2px rgba(0,0,0,0.8)'
              } : {}}
            >
              Group Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full" style={{ display: 'flex', flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        {activeTab === 'community' ? (
          <CommunityTab affiliate={affiliate} activeTab={activeTab} setActiveTab={setActiveTab} setIsGroupChatOpen={setIsGroupChatOpen} glowIntensity={glowIntensity} searchQuery={searchQuery} />
        ) : activeTab === 'classroom' ? (
          <ClassroomTab key={classroomResetKey} affiliate={affiliate} activeTab={activeTab} setActiveTab={setActiveTab} glowIntensity={glowIntensity} />
        ) : (
          <GroupChatTab affiliate={affiliate} glowIntensity={glowIntensity} />
        )}
      </div>

      {/* Group Chat Modal */}
      <GroupChatModal
        isOpen={isGroupChatOpen}
        onClose={() => setIsGroupChatOpen(false)}
        currentUserId={affiliate.id}
        currentUserName={affiliate.avatar_name || affiliate.name}
        currentUserAvatar={affiliate.avatar_url}
      />
    </div>
  )
}

function CommunityTab({ 
  affiliate, 
  activeTab, 
  setActiveTab,
  setIsGroupChatOpen,
  glowIntensity,
  searchQuery
}: { 
  affiliate: DashboardClientProps['affiliate']
  activeTab: 'community' | 'classroom' | 'groupchat'
  setActiveTab: (tab: 'community' | 'classroom' | 'groupchat') => void
  setIsGroupChatOpen: (open: boolean) => void
  glowIntensity: number
  searchQuery: string
}) {
  const [posts, setPosts] = useState<Post[]>(mockPosts)
  const [newPost, setNewPost] = useState('')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All Forums')
  const [viewingThread, setViewingThread] = useState<Post | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null)
  const [quoteText, setQuoteText] = useState('')
  const [quotedPostId, setQuotedPostId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-save draft
  useEffect(() => {
    const savedDraft = localStorage.getItem('forum-draft')
    if (savedDraft && !newPost && !newPostTitle) {
      try {
        const draft = JSON.parse(savedDraft)
        setNewPost(draft.content || '')
        setNewPostTitle(draft.title || '')
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (newPost || newPostTitle) {
        localStorage.setItem('forum-draft', JSON.stringify({ content: newPost, title: newPostTitle }))
      } else {
        localStorage.removeItem('forum-draft')
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [newPost, newPostTitle])

  // Back to top button
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setShowBackToTop(scrollContainerRef.current.scrollTop > 400)
      }
    }
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [viewingThread])

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const copyPostLink = (postId: string, postNumber: number) => {
    const url = `${window.location.origin}/dashboard?post=${postId}#post-${postNumber}`
    navigator.clipboard.writeText(url)
    setCopiedPostId(postId)
    setTimeout(() => setCopiedPostId(null), 2000)
  }

  const handleQuote = (post: Post) => {
    setQuoteText(`[quote="${post.author.name}"]${post.content}[/quote]\n\n`)
    setQuotedPostId(post.id)
    if (viewingThread) {
      // Scroll to reply box
      setTimeout(() => {
        document.getElementById('reply-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }

  const formatTimestamp = (date: string, time: string) => {
    try {
      const dateTime = new Date(`${date} ${time}`)
      const secondsAgo = differenceInSeconds(new Date(), dateTime)
      if (secondsAgo < 10) return 'just now'
      if (secondsAgo < 60) return `${secondsAgo} seconds ago`
      if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} minutes ago`
      return formatDistanceToNow(dateTime, { addSuffix: true })
    } catch {
      return `${date} at ${time}`
    }
  }

  const handlePost = async () => {
    if (!newPost.trim() || !newPostTitle.trim()) return
    setIsPosting(true)
    
    setTimeout(() => {
      const post: Post = {
        id: Date.now().toString(),
        author: {
          name: affiliate.avatar_name || affiliate.name,
          avatar: affiliate.avatar_url,
          avatarGradient: 'from-green-500 to-emerald-600',
          rank: 'Member',
          posts: 1,
          joinDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        },
        title: newPostTitle,
        content: newPost,
        category: 'General Discussion',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        views: 0,
        replies: 0,
        lastPost: {
          author: affiliate.avatar_name || affiliate.name,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        },
        isHot: false,
        isLocked: false,
        isPinned: false,
        postNumber: posts.length + 1
      }
      setPosts([post, ...posts])
      setNewPost('')
      setNewPostTitle('')
      setQuoteText('')
      localStorage.removeItem('forum-draft') // Clear draft on successful post
      setIsPosting(false)
    }, 300)
  }

  const viewYourPosts = () => {
    const yourPosts = posts.filter(p => p.author.name === (affiliate.avatar_name || affiliate.name))
    if (yourPosts.length === 0) {
      alert('You haven\'t posted any threads yet.')
      return
    }
    // In a real app, this would filter the view
    alert(`You have ${yourPosts.length} thread(s).`)
  }

  const markForumAsRead = () => {
    // In a real app, this would mark all threads as read
    alert('Forum marked as read!')
  }

  if (viewingThread) {
    return (
      <div ref={scrollContainerRef} className="h-full overflow-y-auto">
        {/* Breadcrumbs */}
        <div className="bg-slate-200 px-4 py-2 mb-4 rounded-lg border border-slate-300">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <button onClick={() => setViewingThread(null)} className="hover:text-amber-600 font-semibold">Home</button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-600">{viewingThread.category}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold">{viewingThread.title}</span>
          </div>
        </div>

        {/* Thread Header */}
        <div className="bg-white border-2 border-slate-400 rounded-lg shadow-lg mb-4">
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2 border-b-2 border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{viewingThread.title}</h2>
              <button
                onClick={() => setViewingThread(null)}
                className="text-white hover:text-amber-300 text-sm font-semibold"
              >
                ← Back to Forum
              </button>
            </div>
          </div>
          
          {/* Original Post */}
          <div className="p-4 border-b-2 border-slate-300">
            <div className="flex gap-4">
              {/* Profile Sidebar - Matching Image Style */}
              <div className="w-32 shrink-0 bg-slate-100 border-2 border-slate-300 rounded p-3 text-center">
                {viewingThread.author.avatar ? (
                  <img
                    src={viewingThread.author.avatar}
                    alt={viewingThread.author.name}
                    className="w-20 h-20 rounded-full mx-auto mb-2 border-2 border-slate-400"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${viewingThread.author.avatarGradient} mx-auto mb-2 border-2 border-slate-400 flex items-center justify-center`}>
                    <span className="text-white font-bold text-2xl">{viewingThread.author.name[0]}</span>
                  </div>
                )}
                <div className="text-xs text-slate-600 mt-1 mb-2">{viewingThread.author.joinDate}</div>
                {/* Badge/Shield Icon */}
                <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-red-600 to-red-700 rounded flex items-center justify-center border-2 border-amber-400">
                  <svg className="w-6 h-6 text-amber-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                  </svg>
                </div>
                <div className="font-bold text-amber-600 text-sm mb-1">{viewingThread.author.name}</div>
                <div className="text-xs text-slate-600 mt-1">{viewingThread.author.rank}</div>
                <div className="text-xs text-slate-500 mt-2">Posts: {viewingThread.author.posts}</div>
              </div>
              <div className="flex-1" id={`post-${viewingThread.postNumber}`}>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-300">
                  <div className="text-sm text-slate-600">
                    <span title={`${viewingThread.date} at ${viewingThread.time}`} className="cursor-help">
                      {formatTimestamp(viewingThread.date, viewingThread.time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`#post-${viewingThread.postNumber}`} className="text-sm font-semibold text-slate-700 hover:text-amber-600">
                      #{viewingThread.postNumber}
                    </a>
                    <button
                      onClick={() => copyPostLink(viewingThread.id, viewingThread.postNumber)}
                      className="text-slate-500 hover:text-amber-600 transition-colors"
                      title="Copy link to post"
                    >
                      {copiedPostId === viewingThread.id ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-slate-800 leading-relaxed whitespace-pre-wrap">{viewingThread.content}</div>
                <div className="mt-4 pt-3 border-t border-slate-300 flex gap-2">
                  <button
                    onClick={() => handleQuote(viewingThread)}
                    className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded font-semibold text-slate-700"
                  >
                    Quote
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reply Section */}
        <div id="reply-box" className="bg-white border-2 border-slate-400 rounded-lg shadow-lg p-4">
          <h3 className="font-bold text-slate-800 mb-3">Post a Reply</h3>
          <textarea
            value={quoteText || newPost}
            onChange={(e) => {
              if (quoteText) {
                setQuoteText(e.target.value)
                setNewPost(e.target.value)
              } else {
                setNewPost(e.target.value)
              }
            }}
            placeholder="Type your reply here... Use @username to mention someone"
            rows={6}
            className="w-full px-3 py-2 border-2 border-slate-400 rounded bg-white text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                setNewPost('')
                setViewingThread(null)
              }}
              className="px-4 py-2 bg-slate-400 hover:bg-slate-500 text-white font-semibold rounded mr-2"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setNewPost('')
                setQuoteText('')
                setQuotedPostId(null)
                // In real app, would add reply here
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded"
            >
              Post Reply
            </button>
          </div>
        </div>

        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-20 right-6 z-40 w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
            title="Back to top"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        )}
      </div>
    )
  }

  const [activeFilter, setActiveFilter] = useState('All')

  // Transform posts to match new format
  const forumPosts = posts.slice(0, 4).map((post) => ({
    id: post.id,
    title: post.title,
    author: post.author.name,
    avatar: post.author.name.substring(0, 2).toUpperCase(),
    replies: post.replies,
    likes: Math.floor(post.views / 2),
    time: formatTimestamp(post.date, post.time),
    tag: post.category === 'Success Stories' ? 'Win' : post.category === 'Announcements' ? 'Resource' : 'Discussion',
    pinned: post.isPinned
  }))

  return (
    <div className="flex h-full w-full community-full-width" style={{ display: 'flex', width: '100%', maxWidth: '100%', boxSizing: 'border-box', margin: 0, padding: 0, gap: 0, backgroundColor: '#0f0f1a' }}>
      {/* Sidebar */}
      <div className="w-[250px] text-white flex flex-col shrink-0" style={{ width: '250px', flexShrink: 0, background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)' }}>
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
              border: '2px solid rgba(168,85,247,0.6)',
              boxShadow: `
                inset 0 1px 2px rgba(255,255,255,0.1),
                inset 0 -1px 2px rgba(0,0,0,0.9),
                0 2px 8px rgba(0,0,0,0.8),
                0 0 1px rgba(168,85,247,0.5),
                0 0 20px rgba(168,85,247,0.6), 0 0 40px rgba(168,85,247,0.4)
              `
            }}>
              <div className="absolute inset-0 opacity-20" style={{
                background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(168,85,247,0.1) 2px, rgba(168,85,247,0.1) 4px)',
                backgroundSize: '8px 100%'
              }} />
              <Zap className="w-6 h-6 relative z-10" fill="rgba(168,85,247,0.9)" stroke="rgba(168,85,247,0.9)" style={{
                filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.8)) drop-shadow(0 0 8px rgba(168,85,247,0.6))',
                textShadow: '0 0 8px rgba(168,85,247,0.8)'
              }} />
            </div>
            <div>
              <div className="font-bold text-sm">LifeDesign</div>
              <div className="text-[10px] text-slate-400">2,847 members</div>
            </div>
          </div>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="text-[10px] text-[rgba(255,255,255,0.6)] mb-3 font-semibold uppercase tracking-wider px-2">Navigation</div>
          {[
            { id: 'community', icon: '💬', label: 'Community' },
            { id: 'classroom', icon: '📚', label: 'Classroom' },
            { id: 'members', icon: '👥', label: 'Members' },
            ...((affiliate as any).role === 'admin' || (affiliate as any).role === 'moderator' 
              ? [{ id: 'admin', icon: '⚙️', label: 'Admin', href: '/community/admin' }]
              : []
            ),
          ].map(item => {
            const hasHref = !!(item as any).href
            const isActive = activeTab === (item.id as any) || item.id === 'members' || item.id === 'admin'
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'community' || item.id === 'classroom') {
                    setActiveTab(item.id as 'community' | 'classroom')
                  } else if (hasHref) {
                    window.location.href = (item as any).href
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all ${
                  activeTab === item.id
                    ? 'text-white'
                    : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
                }`}
                style={activeTab === item.id ? {
                  background: 'linear-gradient(135deg, #fde047, #facc15)',
                  boxShadow: glowShadow('0 0 20px rgba(253,224,71,0.7), 0 0 40px rgba(253,224,71,0.5), 0 8px 30px rgba(253,224,71,0.4)', glowIntensity)
                } : {}}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {item.id === 'community' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))',
                          stroke: isActive ? 'rgba(253,224,71,0.9)' : 'rgba(120,120,120,0.8)'
                        }}
                      />
                      <path d="M7 9h10M7 13h6" 
                        stroke={isActive ? 'rgba(253,224,71,0.9)' : 'rgba(120,120,120,0.8)'} 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        style={{
                          filter: isActive ? 'drop-shadow(0 0 4px rgba(253,224,71,0.6)) drop-shadow(0 0 8px rgba(253,224,71,0.4))' : 'none'
                        }}
                      />
                    </svg>
                  )}
                  {item.id === 'classroom' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <path d="M12 2L12 22" 
                        stroke={isActive ? 'rgba(34,211,238,0.9)' : 'rgba(120,120,120,0.8)'} 
                        strokeWidth="2" 
                        strokeLinecap="round"
                        style={{
                          filter: isActive ? 'drop-shadow(0 0 4px rgba(34,211,238,0.6))' : 'none'
                        }}
                      />
                      <path d="M8 6L12 2L16 6" 
                        stroke={isActive ? 'rgba(34,211,238,0.9)' : 'rgba(120,120,120,0.8)'} 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))',
                        }}
                      />
                      <path d="M10 18L12 22L14 18" 
                        stroke={isActive ? 'rgba(34,211,238,0.9)' : 'rgba(120,120,120,0.8)'} 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))',
                        }}
                      />
                    </svg>
                  )}
                  {item.id === 'members' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))',
                          stroke: isActive ? 'rgba(34,211,238,0.9)' : 'rgba(120,120,120,0.8)'
                        }}
                      />
                      <circle cx="9" cy="7" r="4" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))',
                          stroke: isActive ? 'rgba(34,211,238,0.9)' : 'rgba(120,120,120,0.8)'
                        }}
                      />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" 
                        stroke={isActive ? 'rgba(34,211,238,0.9)' : 'rgba(120,120,120,0.8)'} 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        style={{
                          filter: isActive ? 'drop-shadow(0 0 4px rgba(34,211,238,0.6))' : 'none'
                        }}
                      />
                    </svg>
                  )}
                  {item.id === 'admin' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <circle cx="12" cy="12" r="3" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))',
                          stroke: 'rgba(34,211,238,0.9)'
                        }}
                      />
                      <path d="M12 1v6m0 6v6M1 12h6m6 0h6" 
                        stroke="rgba(34,211,238,0.9)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))'
                        }}
                      />
                      <path d="M19.07 4.93l-4.24 4.24m0 5.66l4.24 4.24M4.93 19.07l4.24-4.24m0-5.66L4.93 4.93" 
                        stroke="rgba(34,211,238,0.9)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))'
                        }}
                      />
                    </svg>
                  )}
                </div>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}

          <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <button
              onClick={() => setActiveTab('groupchat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all relative ${
                activeTab === 'groupchat'
                  ? 'text-white'
                  : 'text-[rgba(255,255,255,0.6)] hover:text-white'
              }`}
              style={activeTab === 'groupchat' ? {
                background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
                border: '2px solid rgba(34,211,238,0.6)',
                boxShadow: `
                  inset 0 1px 2px rgba(255,255,255,0.1),
                  inset 0 -1px 2px rgba(0,0,0,0.9),
                  0 2px 8px rgba(0,0,0,0.8),
                  0 0 1px rgba(34,211,238,0.5),
                  ${glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity)}
                `,
                color: 'rgba(34,211,238,0.95)',
                textShadow: '0 0 8px rgba(34,211,238,0.6), 0 1px 2px rgba(0,0,0,0.8)'
              } : {
                background: 'transparent',
                border: '1px solid transparent'
              }}
            >
              <div className="w-5 h-5 flex items-center justify-center relative">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" 
                    stroke="rgba(255,255,255,0.9)" 
                    strokeWidth="1.5" 
                    fill="rgba(60,60,60,0.8)"
                    style={{
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                    }}
                  />
                  <path d="M7 9h10M7 13h6" 
                    stroke="rgba(255,255,255,0.9)" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute -bottom-0.5 -right-0.5 text-[6px] font-bold leading-none" style={{
                  color: '#fde047',
                  textShadow: '0 0 3px rgba(253,224,71,0.8), 0 1px 1px rgba(0,0,0,0.9)',
                  filter: 'drop-shadow(0 0 2px rgba(253,224,71,0.6))',
                  background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
                  padding: '1px 2px',
                  borderRadius: '2px',
                  border: '0.5px solid rgba(253,224,71,0.3)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.9)'
                }}>
                  ld
                </div>
              </div>
              <span className="font-medium">Group Chat</span>
              <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
          </div>

          <div className="mt-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-4 border border-[rgba(255,255,255,0.1)]" style={{ backdropFilter: 'blur(10px)' }}>
            <div className="text-xs font-semibold mb-2 text-white">Your Progress</div>
            <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full mb-2 overflow-hidden">
              <div 
                className="h-full rounded-full"
                style={{
                  width: '42%',
                  background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                  boxShadow: glowShadow('0 0 12px rgba(34,211,238,0.9), 0 0 24px rgba(34,211,238,0.6)', glowIntensity)
                }}
              />
            </div>
            <div className="text-[11px] text-[rgba(255,255,255,0.6)]">15 of 36 lessons completed</div>
          </div>
        </div>

        <div className="p-4 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px]" style={{ backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center gap-3 mb-3">
            {affiliate.avatar_url ? (
              <img 
                src={affiliate.avatar_url} 
                alt={affiliate.avatar_name || affiliate.name} 
                className="w-10 h-10 rounded-full border-2"
                style={{
                  borderColor: 'rgba(34,211,238,0.5)',
                  boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                }}
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2"
                style={{
                  background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                  borderColor: 'rgba(34,211,238,0.5)',
                  boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                }}
              >
                <span className="text-white">{(affiliate.avatar_name || affiliate.name).substring(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-white">{affiliate.avatar_name || affiliate.name}</div>
              <div className="text-[10px] text-[rgba(255,255,255,0.6)]">Member</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/settings"
              className="px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] rounded-xl transition-colors flex items-center justify-center"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-white" />
            </Link>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/login'
              }}
              className="px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] rounded-xl transition-colors flex items-center justify-center"
              title="Log out"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div className="flex-1 flex flex-col overflow-hidden h-full w-full min-w-0 relative" style={{ flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
        {/* Color Splash Header */}
        <div 
          className="absolute top-0 left-0 right-0 h-[300px] z-0"
          style={{
            background: 'linear-gradient(135deg, #fde047 0%, #fde047 25%, #f472b6 25%, #f472b6 50%, #22d3ee 50%, #22d3ee 75%, #0ea5e9 75%, #0ea5e9 100%)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(15,15,26,0.5)] to-[#0f0f1a]" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
          <div className="h-14 bg-[rgba(26,26,46,0.8)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0" style={{ backdropFilter: 'blur(20px)' }}>
            <div>
              <h1 className="text-lg font-bold text-white">Community</h1>
              <p className="text-xs text-[rgba(255,255,255,0.6)]">Send Some Messages & Connect With Some Homies</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative px-3 py-1.5 rounded" style={{
                background: 'linear-gradient(135deg, rgba(50,50,55,0.85) 0%, rgba(35,35,40,0.9) 50%, rgba(30,30,35,0.85) 100%)',
                border: '1px solid rgba(70,70,75,0.6)',
                boxShadow: `
                  inset 0 1px 1px rgba(255,255,255,0.08),
                  inset 0 -1px 1px rgba(0,0,0,0.8),
                  0 1px 3px rgba(0,0,0,0.6)
                `,
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div className="absolute inset-0 opacity-20" style={{
                  background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(100,100,100,0.08) 2px, rgba(100,100,100,0.08) 4px)',
                  backgroundSize: '6px 100%'
                }} />
                <div className="relative text-xs font-serif italic" style={{
                  letterSpacing: '0.02em',
                  fontWeight: 500,
                  fontStyle: 'italic',
                  textTransform: 'none',
                  color: 'rgba(130, 130, 135, 0.9)',
                  textShadow: `
                    0 0.5px 0 rgba(0,0,0,1),
                    0 1px 0 rgba(0,0,0,0.9),
                    inset 0 0.5px 1px rgba(255,255,255,0.06),
                    inset 0 -0.5px 1px rgba(0,0,0,0.9)
                  `,
                  filter: 'drop-shadow(0 0.5px 1px rgba(0,0,0,0.8))',
                  position: 'relative',
                  zIndex: 2,
                  borderBottom: '1.5px solid transparent',
                  backgroundImage: 'linear-gradient(to bottom, transparent 0%, transparent 96%, rgba(34,211,238,0.7) 96%, rgba(6,182,212,0.8) 98%, rgba(34,211,238,0.7) 100%)',
                  backgroundSize: '200% 100%',
                  backgroundPosition: '0% 100%',
                  paddingBottom: '1px',
                  animation: 'neon-underline 3s ease-in-out infinite'
                }}>
                  <style jsx>{`
                    @keyframes neon-underline {
                      0%, 100% { 
                        background-position: 0% 100%;
                      }
                      50% { 
                        background-position: 100% 100%;
                      }
                    }
                  `}</style>
                  "he who jumps into the void owes no explanation to those who stand and watch"
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 w-full" style={{ width: '100%', maxWidth: '100%', flex: 1, minWidth: 0, boxSizing: 'border-box', margin: 0, padding: 0 }}>
            <CommunityFeed
              currentUser={{
                id: affiliate.id,
                name: affiliate.avatar_name || affiliate.name,
                avatar: affiliate.avatar_url
              }}
              glowIntensity={glowIntensity}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
