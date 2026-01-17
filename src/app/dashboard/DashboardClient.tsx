'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Settings, Search, ChevronRight, MessageSquare, Flame, Lock, Pin, MessageCircle, Copy, ArrowUp, CheckCircle2, Zap, Plus, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow, differenceInSeconds } from 'date-fns'
import { NotificationsDropdown } from './components/NotificationsDropdown'
import { AdminDropdown } from '@/components/AdminDropdown'
import { GroupChatModal } from './components/GroupChatModal'
import { CommunityFeed } from './components/CommunityFeed'
import { NotificationBell } from './components/NotificationBell'
import { DMInbox } from './components/DMInbox'
import { GroupChatTab } from './components/GroupChatTab'
import { MindsetModuleList } from '../mindset/components/MindsetModuleList'
import { DreamJobModuleList } from '../dreamjob/components/DreamJobModuleList'
import CourseAssistant from '@/components/CourseAssistant'

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
  return shadows
}

export function DashboardClient({ affiliate, isAdmin = false }: DashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const openDMUserId = searchParams.get('openDM')
  const [activeTab, setActiveTab] = useState<'community' | 'classroom' | 'groupchat'>('community')
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false)
  const [glowIntensity, setGlowIntensity] = useState(50) // Default 50%
  const [classroomResetKey, setClassroomResetKey] = useState(0)
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
              {/* Admin Button - Only show for admins */}
              {isAdmin && (
                <div className="relative px-5 py-3 bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-purple-800/40 rounded-xl border border-purple-500/40 backdrop-blur-sm overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-shimmer" style={{
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s ease-in-out infinite'
                  }} />
                  <div className="relative z-10">
                    <AdminDropdown isAdmin={isAdmin} />
                  </div>
                </div>
              )}
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
              <DMInbox currentUserId={affiliate.id} initialUserId={openDMUserId || undefined} />
              
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

function ClassroomTab({ 
  affiliate, 
  activeTab, 
  setActiveTab,
  glowIntensity
}: { 
  affiliate: DashboardClientProps['affiliate']
  activeTab: 'community' | 'classroom' | 'groupchat'
  setActiveTab: (tab: 'community' | 'classroom' | 'groupchat') => void
  glowIntensity: number
}) {
  const [selectedWorld, setSelectedWorld] = useState<'mindset' | 'dreamjob' | 'affiliate' | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null) // For SkillBank courses
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<{ id?: string, title?: string, moduleName?: string } | null>(null)
  const [mindsetCategories, setMindsetCategories] = useState<any[]>([])
  const [dreamJobModules, setDreamJobModules] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [allCourses, setAllCourses] = useState<any[]>([])
  const [courseDetail, setCourseDetail] = useState<any | null>(null) // Full course details with sections/lessons
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCourse, setNewCourse] = useState({
    title: '',
    slug: '',
    description: '',
    emoji: '',
    color: '#06B6D4'
  })
  const isAdmin = (affiliate as any).role === 'admin' || (affiliate as any).role === 'moderator'
  
  // Reset to world selection when Classroom tab is clicked
  useEffect(() => {
    if (activeTab === 'classroom') {
      setSelectedWorld(null)
      setSelectedCourse(null)
      setCourseDetail(null)
    }
  }, [activeTab])

  // Fetch full course details when a course is selected
  useEffect(() => {
    if (selectedCourse) {
      fetchCourseDetail(selectedCourse.slug || selectedCourse.id)
    }
  }, [selectedCourse])

  const fetchCourseDetail = async (courseIdOrSlug: string) => {
    try {
      const res = await fetch(`/api/courses-v2?courseId=${courseIdOrSlug}`)
      const data = await res.json()
      if (data.course) {
        setCourseDetail(data.course)
      }
    } catch (error) {
      console.error('Error fetching course detail:', error)
    }
  }

  // Fetch course data from database
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true)
        
        // Fetch all courses from new system (include drafts if admin)
        const coursesRes = await fetch(`/api/courses-v2${isAdmin ? '?all=true' : ''}`)
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json()
          if (coursesData.courses) {
            setAllCourses(coursesData.courses)
          }
        }
        
        // Fetch Life Design world structure (mindset + lifedesign)
        const mindsetRes = await fetch('/api/courses/structure?courseType=mindset')
        if (mindsetRes.ok) {
          const mindsetData = await mindsetRes.json()
          if (mindsetData.categories) {
            setMindsetCategories(mindsetData.categories)
          }
        }

        // Fetch DreamJob course structure
        const dreamJobRes = await fetch('/api/courses/structure?courseType=dreamjob')
        if (dreamJobRes.ok) {
          const dreamJobData = await dreamJobRes.json()
          if (dreamJobData.modules) {
            setDreamJobModules(dreamJobData.modules)
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoadingCourses(false)
      }
    }

    fetchCourses()
  }, [selectedWorld])

  const handleCreateCourse = async () => {
    if (!newCourse.title) {
      alert('Title is required')
      return
    }

    // Auto-generate slug from title with timestamp to ensure uniqueness
    const baseSlug = newCourse.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const slug = `${baseSlug}-${Date.now()}`

    try {
      const res = await fetch('/api/admin/courses-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCourse,
          slug
        })
      })

      const data = await res.json()

      if (data.error) {
        alert('Error: ' + data.error)
        return
      }

      setShowCreateModal(false)
      setNewCourse({ title: '', slug: '', description: '', emoji: '', color: '#06B6D4' })
      
      // Refresh courses
      const coursesRes = await fetch('/api/courses-v2')
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json()
        if (coursesData.courses) {
          setAllCourses(coursesData.courses)
        }
      }
      
      alert('Course created as draft! You can now edit it and publish when ready.')
      
      // Redirect to course builder
      if (data.id) {
        window.location.href = `/admin/courses-v2/${data.id}`
      }
    } catch (error) {
      console.error('Error creating course:', error)
      alert('Error creating course')
    }
  }
  
  // Mindset modules data
  const extractLoomId = (url: string): string => {
    const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
    return match ? match[1] : ''
  }

  const extractYouTubeId = (url: string): string => {
    if (!url) return ''
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0].split('&')[0]
    if (url.includes('youtube.com/watch?v=')) return url.split('youtube.com/watch?v=')[1].split('&')[0]
    if (url.includes('youtube.com/embed/')) return url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0]
    return url
  }

  const hexToRgb = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '')
    
    // Parse hex to RGB
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    
    return `${r},${g},${b}`
  }

  // Use database data only (no hardcoded course fallback)
  const activeMindsetCategories = mindsetCategories
  
  // Flatten for backward compatibility with MindsetModuleList
  const mindsetModules = activeMindsetCategories.flatMap((category: any) => 
    category.sections.map((section: any) => ({
      ...section,
      categoryId: category.id,
      categoryTitle: category.title
    }))
  )
  
  return (
    <div className="flex h-full w-full" style={{ display: 'flex', width: '100%', maxWidth: '100%', boxSizing: 'border-box', margin: 0, padding: 0, gap: 0, backgroundColor: '#0f0f1a' }}>
      {/* Sidebar - Match CommunityTab styling */}
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

      {/* Main Content - Match CommunityTab styling */}
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
              <h1 className="text-lg font-bold text-white">Classroom</h1>
              <p className="text-xs text-[rgba(255,255,255,0.6)]">don't just watch. ENACT the lessons IRL. Make your life ACTUALLY better &lt;3</p>
            </div>
            {(selectedWorld || selectedCourse) && (
              <button
                onClick={() => {
                  setSelectedWorld(null)
                  setSelectedCourse(null)
                  setCourseDetail(null)
                }}
                className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                ← Back to Courses
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 w-full px-4 sm:px-6 lg:px-8 py-8" style={{ width: '100%', maxWidth: '100%', flex: 1, minWidth: 0, boxSizing: 'border-box', margin: 0 }}>
            {!selectedWorld && !selectedCourse ? (
              /* Main Classroom View */
              <div className="max-w-6xl mx-auto">
                {/* Financial Foundation Section */}
                <div className="mb-16">
                  <h1 className="text-4xl font-bold text-white mb-2">Building Your Financial Foundation</h1>
                  <p className="text-[rgba(255,255,255,0.6)] text-lg mb-8">Start with these core courses</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Mindset & Foundations */}
                    <button
                      onClick={() => setSelectedWorld('mindset')}
                      className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 border-emerald-500 rounded-2xl p-6 text-left hover:shadow-lg transition-all group"
                      style={{
                        backdropFilter: 'blur(10px)',
                        boxShadow: glowShadow('0 0 30px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.2)', glowIntensity)
                      }}
                    >
                      <div className="text-4xl mb-3">🧠</div>
                      <h3 className="text-lg font-bold text-white mb-2">Mindset & Foundations</h3>
                      <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4">
                        Build your mental foundation for success
                      </p>
                      <div className="text-emerald-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Start →
                      </div>
                    </button>

                    {/* Get Your Dream Job */}
                    <button
                      onClick={() => setSelectedWorld('dreamjob')}
                      className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 border-cyan-500 rounded-2xl p-6 text-left hover:shadow-lg transition-all group"
                      style={{
                        backdropFilter: 'blur(10px)',
                        boxShadow: glowShadow('0 0 30px rgba(6,182,212,0.3), 0 0 60px rgba(6,182,212,0.2)', glowIntensity)
                      }}
                    >
                      <div className="text-4xl mb-3">💼</div>
                      <h3 className="text-lg font-bold text-white mb-2">Get Your Dream Job</h3>
                      <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4">
                        Land the career you've always wanted
                      </p>
                      <div className="text-cyan-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Start →
                      </div>
                    </button>

                    {/* Build Your Side Income */}
                    <Link
                      href="/affiliate"
                      className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 border-yellow-500 rounded-2xl p-6 text-left hover:shadow-lg transition-all group"
                      style={{
                        backdropFilter: 'blur(10px)',
                        boxShadow: glowShadow('0 0 30px rgba(234,179,8,0.3), 0 0 60px rgba(234,179,8,0.2)', glowIntensity)
                      }}
                    >
                      <div className="text-4xl mb-3">💰</div>
                      <h3 className="text-lg font-bold text-white mb-2">Build Your Side Income</h3>
                      <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4">
                        grab our done-for-you products & begin printing ASAP!
                      </p>
                      <div className="text-yellow-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Start →
                      </div>
                    </Link>
                  </div>
                </div>

                {/* SkillBank Section */}
                <div>
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">SkillBank</h2>
                      <p className="text-[rgba(255,255,255,0.6)] text-lg">
                        Learn the micro-skills you need to continue balling hard IRL
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                        Add Course
                      </button>
                    )}
                  </div>

                  {loadingCourses ? (
                    <div className="text-center py-12 text-white">Loading courses...</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {allCourses.filter(c => !['mindset', 'dream-job', 'side-income'].includes(c.slug)).map((course) => {
                        const courseColor = course.color || '#06B6D4' // Default cyan
                        const rgbValues = hexToRgb(courseColor)
                        const borderColor = course.is_published ? courseColor : '#FCD34D' // Yellow for drafts
                        
                        return (
                          <div
                            key={course.id}
                            className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 rounded-2xl p-6 transition-all hover:shadow-lg group"
                            style={{
                              backdropFilter: 'blur(10px)',
                              borderColor: borderColor,
                              opacity: !course.is_published && !isAdmin ? 0.6 : 1,
                              boxShadow: course.is_published 
                                ? glowShadow(`0 0 30px rgba(${rgbValues},0.3), 0 0 60px rgba(${rgbValues},0.2)`, glowIntensity)
                                : glowShadow('0 0 20px rgba(252,211,77,0.3), 0 0 40px rgba(252,211,77,0.2)', glowIntensity)
                            }}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="text-4xl">{course.emoji || '📚'}</div>
                              {!course.is_published && (
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold border border-yellow-500/30">
                                  Draft
                                </span>
                              )}
                              {course.is_published && (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold border border-green-500/30">
                                  Live
                                </span>
                              )}
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{course.title}</h3>
                            
                            {course.description && (
                              <p className="text-[rgba(255,255,255,0.6)] text-sm mb-4 line-clamp-2">
                                {course.description}
                              </p>
                            )}
                            
                            {course.stats && (
                              <div className="flex items-center gap-3 text-xs text-[rgba(255,255,255,0.5)] mb-4">
                                <span>{course.stats.lessons} lessons</span>
                                {course.stats.progress > 0 && (
                                  <span className="text-cyan-400 font-semibold">{course.stats.progress}% complete</span>
                                )}
                              </div>
                            )}
                            
                            <div className="flex flex-col gap-2 mt-4">
                              {/* View Course button - visible to everyone if published */}
                              {course.is_published && (
                                <button
                                  onClick={() => setSelectedCourse(course)}
                                  className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-cyan-500/50 flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                                >
                                  <span>View Course</span>
                                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </button>
                              )}
                              
                              {/* Admin controls */}
                              {isAdmin && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => window.location.href = `/admin/courses-v2/${course.id}`}
                                    className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] border border-[rgba(255,255,255,0.2)] text-white text-xs rounded-lg font-semibold transition-all"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      try {
                                        const res = await fetch('/api/admin/courses-v2', {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            id: course.id,
                                            is_published: !course.is_published
                                          })
                                        })
                                        if (res.ok) {
                                          // Refresh courses
                                          const coursesRes = await fetch('/api/courses-v2?all=true')
                                          const data = await coursesRes.json()
                                          if (data.courses) {
                                            setAllCourses(data.courses)
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Error toggling publish:', error)
                                      }
                                    }}
                                    className={`flex-1 px-3 py-2 text-xs rounded-lg font-semibold transition-colors ${
                                      course.is_published
                                        ? 'bg-yellow-600/80 hover:bg-yellow-600 text-white'
                                        : 'bg-green-600/80 hover:bg-green-600 text-white'
                                    }`}
                                  >
                                    {course.is_published ? 'Unpublish' : 'Publish'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      
                      {allCourses.filter(c => !['mindset', 'dream-job', 'side-income'].includes(c.slug)).length === 0 && !isAdmin && (
                        <div className="col-span-full text-center py-12">
                          <p className="text-[rgba(255,255,255,0.5)]">No courses available yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedWorld === 'mindset' ? (
              /* LD World / Mindset Content */
              <div>
                {loadingCourses ? (
                  <div className="text-center py-12 text-white">Loading courses...</div>
                ) : activeMindsetCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-block bg-[rgba(255,255,255,0.06)] backdrop-blur-[10px] rounded-2xl p-8 border border-[rgba(255,255,255,0.12)] max-w-xl">
                      <h2 className="text-xl font-semibold text-white mb-2">Course not configured yet</h2>
                      <p className="text-[rgba(255,255,255,0.65)] text-sm">
                        The classroom now uses <span className="text-white">only</span> the database-backed course structure.
                        Add categories/sections/videos in the admin course editor and this will populate automatically.
                      </p>
                    </div>
                  </div>
                ) : (
                  <MindsetModuleList 
                    modules={mindsetModules} 
                    categories={activeMindsetCategories}
                    affiliate={affiliate}
                    onDataChange={async () => {
                      // Refetch data after drag operation
                      try {
                        const res = await fetch('/api/courses/structure?courseType=mindset')
                        const data = await res.json()
                        if (data.categories) {
                          setMindsetCategories(data.categories)
                        }
                      } catch (error) {
                        console.error('Error refetching mindset data:', error)
                      }
                    }}
                  />
                )}
              </div>
            ) : selectedWorld === 'dreamjob' ? (
              /* Dream Job Content */
              <div>
                <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 mb-6 border border-[rgba(255,255,255,0.1)]" style={{ backdropFilter: 'blur(10px)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Course Progress</h2>
                      <p className="text-[rgba(255,255,255,0.6)] text-sm">Complete all 8 modules to master the Dream Job method</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">0%</span>
                      <p className="text-[rgba(255,255,255,0.5)] text-sm">Complete</p>
                    </div>
                  </div>
                  <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
                {loadingCourses ? (
                  <div className="text-center py-12 text-white">Loading courses...</div>
                ) : dreamJobModules.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-block bg-[rgba(255,255,255,0.06)] backdrop-blur-[10px] rounded-2xl p-8 border border-[rgba(255,255,255,0.12)] max-w-xl">
                      <h2 className="text-xl font-semibold text-white mb-2">Dream Job course not configured yet</h2>
                      <p className="text-[rgba(255,255,255,0.65)] text-sm">
                        This course now loads from the database only. Add modules/lessons in the admin course editor to publish content here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <DreamJobModuleList 
                    modules={dreamJobModules} 
                    affiliate={affiliate}
                    onDataChange={async () => {
                      // Refetch data after drag operation
                      try {
                        const res = await fetch('/api/courses/structure?courseType=dreamjob')
                        const data = await res.json()
                        if (data.modules) {
                          setDreamJobModules(data.modules)
                        }
                      } catch (error) {
                        console.error('Error refetching dreamjob data:', error)
                      }
                    }}
                  />
                )}
              </div>
            ) : selectedWorld === 'affiliate' ? (
              /* Affiliate Content */
              <div>
                <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 mb-6 border border-[rgba(255,255,255,0.1)]" style={{ backdropFilter: 'blur(10px)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Course Progress</h2>
                      <p className="text-[rgba(255,255,255,0.6)] text-sm">Complete all 8 modules to master the Dream Job method</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">0%</span>
                      <p className="text-[rgba(255,255,255,0.5)] text-sm">Complete</p>
                    </div>
                  </div>
                  <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
                <Link href="/affiliate" className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors">
                  Go to Affiliate Portal
                </Link>
              </div>
            ) : selectedCourse && courseDetail ? (
              /* SkillBank Course Content */
              <div>
                <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-6 mb-6 border border-[rgba(255,255,255,0.1)]" style={{ backdropFilter: 'blur(10px)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{selectedCourse.emoji || '📚'}</span>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{selectedCourse.title}</h2>
                        {selectedCourse.description && (
                          <p className="text-[rgba(255,255,255,0.6)] text-sm">{selectedCourse.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCourse(null)
                        setCourseDetail(null)
                      }}
                      className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}
                    >
                      ← Back to Courses
                    </button>
                  </div>
                  {courseDetail.stats && (
                    <div className="flex items-center justify-between">
                      <div className="text-right">
                        <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                          {courseDetail.stats.progress || 0}%
                        </span>
                        <p className="text-[rgba(255,255,255,0.5)] text-sm">Complete</p>
                      </div>
                      <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2 max-w-xs">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${courseDetail.stats.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {loadingCourses ? (
                  <div className="text-center py-12 text-white">Loading course content...</div>
                ) : courseDetail.sections && courseDetail.sections.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-block bg-[rgba(255,255,255,0.06)] backdrop-blur-[10px] rounded-2xl p-8 border border-[rgba(255,255,255,0.12)] max-w-xl">
                      <h2 className="text-xl font-semibold text-white mb-2">Course content coming soon</h2>
                      <p className="text-[rgba(255,255,255,0.65)] text-sm">
                        This course is being built. Check back soon!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courseDetail.sections?.map((section: any, sectionIndex: number) => (
                      <div
                        key={section.id}
                        className="bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-xl border border-[rgba(255,255,255,0.1)] overflow-hidden"
                        style={{ backdropFilter: 'blur(10px)' }}
                      >
                        {/* Section Header */}
                        <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                              {String(sectionIndex + 1).padStart(2, '0')}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-base font-semibold text-white">{section.title}</h3>
                              {section.description && (
                                <p className="text-[rgba(255,255,255,0.6)] text-sm mt-1">{section.description}</p>
                              )}
                            </div>
                            <span className="text-xs text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.1)] px-2 py-1 rounded-full">
                              {section.lessons?.length || 0} lessons
                            </span>
                          </div>
                        </div>

                        {/* Lessons */}
                        {section.lessons && section.lessons.length > 0 && (
                          <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                            {section.lessons.map((lesson: any, lessonIndex: number) => (
                              <button
                                key={lesson.id}
                                onClick={() => window.location.href = `/courses/${selectedCourse.slug}?lesson=${lesson.id}`}
                                className="w-full px-6 py-4 text-left hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center gap-4 group"
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${
                                  lesson.progress?.completed
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.1)]'
                                }`}>
                                  {lesson.progress?.completed ? '✓' : lessonIndex + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                                    {lesson.title}
                                  </div>
                                  {lesson.description && (
                                    <div className="text-xs text-[rgba(255,255,255,0.6)] mt-1 line-clamp-1">
                                      {lesson.description}
                                    </div>
                                  )}
                                  {lesson.duration_minutes > 0 && (
                                    <div className="text-xs text-[rgba(255,255,255,0.4)] mt-1">
                                      {lesson.duration_minutes} min
                                    </div>
                                  )}
                                </div>
                                <div className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  →
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Create Course Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
            <div className="bg-[rgba(26,26,46,0.95)] backdrop-blur-xl rounded-2xl border border-[rgba(255,255,255,0.2)] p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">Create New Course</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newCourse.title}
                    onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500 text-sm"
                    placeholder="e.g., Productivity Mastery"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCourse.description}
                    onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500 h-16 resize-none text-sm"
                    placeholder="Brief course description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-1">
                      Emoji
                    </label>
                    <input
                      type="text"
                      value={newCourse.emoji}
                      onChange={e => setNewCourse({ ...newCourse, emoji: e.target.value })}
                      className="w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500 text-center text-xl"
                      placeholder="⚡"
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={newCourse.color}
                      onChange={e => setNewCourse({ ...newCourse, color: e.target.value })}
                      className="w-full h-10 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.2)] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCourse}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all text-sm"
                >
                  Create Course
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
