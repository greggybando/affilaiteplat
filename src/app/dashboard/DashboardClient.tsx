'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Settings, Search, ChevronRight, MessageSquare, Flame, Lock, Pin, MessageCircle, Copy, ArrowUp, CheckCircle2, Zap, Plus, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow, differenceInSeconds } from 'date-fns'
import { DMModal } from './components/DMModal'
import { NotificationsDropdown } from './components/NotificationsDropdown'
import { GroupChatModal } from './components/GroupChatModal'
import { CommunityFeed } from './components/CommunityFeed'
import { NotificationBell } from './components/NotificationBell'
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
  if (glowIntensity === 0) return 'none'
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

export function DashboardClient({ affiliate }: DashboardClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'community' | 'classroom' | 'groupchat'>('community')
  const [isDMModalOpen, setIsDMModalOpen] = useState(false)
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false)
  const [glowIntensity, setGlowIntensity] = useState(50) // Default 50%

  // YouTube Playlist Player State
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [playlistId, setPlaylistId] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [volume, setVolume] = useState(50)
  const [showPlayer, setShowPlayer] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [wasPlaying, setWasPlaying] = useState(false) // Track if music was playing before refresh
  const playerRef = useRef<any>(null)

  // Load music player state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPlaylistUrl = localStorage.getItem('music_playlistUrl')
      const savedPlaylistId = localStorage.getItem('music_playlistId')
      const savedVolume = localStorage.getItem('music_volume')
      const savedWasPlaying = localStorage.getItem('music_wasPlaying')
      
      if (savedPlaylistUrl) setPlaylistUrl(savedPlaylistUrl)
      if (savedPlaylistId) {
        setPlaylistId(savedPlaylistId)
        setShowPlayer(true)
      }
      if (savedVolume) setVolume(parseInt(savedVolume, 10))
      if (savedWasPlaying === 'true') setWasPlaying(true)
    }
  }, [])

  // Save playlist URL to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && playlistUrl) {
      localStorage.setItem('music_playlistUrl', playlistUrl)
    }
  }, [playlistUrl])

  // Save playlist ID to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (playlistId) {
        localStorage.setItem('music_playlistId', playlistId)
      } else {
        localStorage.removeItem('music_playlistId')
      }
    }
  }, [playlistId])

  // Save volume to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('music_volume', volume.toString())
    }
  }, [volume])

  // Save playing state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('music_wasPlaying', isPlaying.toString())
    }
  }, [isPlaying])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // YouTube IFrame API Loading
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScript = document.getElementsByTagName('script')[0]
      firstScript.parentNode?.insertBefore(tag, firstScript)
    }
    
    ;(window as any).onYouTubeIframeAPIReady = () => {
      setPlayerReady(true)
    }
    
    if ((window as any).YT && (window as any).YT.Player) {
      setPlayerReady(true)
    }
  }, [])

  // Initialize YouTube Player
  useEffect(() => {
    if (playlistId && playerReady) {
      // Destroy existing player if it exists
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch (e) {
          // Ignore errors
        }
        playerRef.current = null
      }
      
      // Create new player
      const timer = setTimeout(() => {
        if (playlistId && playerReady && !playerRef.current) {
          playerRef.current = new (window as any).YT.Player('yt-player', {
            height: '0',
            width: '0',
            playerVars: {
              listType: 'playlist',
              list: playlistId,
              autoplay: 0,
              controls: 0,
              rel: 0,
              modestbranding: 1,
            },
            events: {
              onReady: (event: any) => {
                event.target.setVolume(volume)
                // Resume playback if it was playing before refresh
                if (wasPlaying) {
                  setTimeout(() => {
                    try {
                      setIsBuffering(true) // Show buffering indicator
                      event.target.playVideo()
                      setIsPlaying(true)
                      setWasPlaying(false) // Reset flag after resuming
                    } catch (e) {
                      console.error('Error resuming playback:', e)
                      setIsBuffering(false)
                    }
                  }, 500)
                }
              },
              onStateChange: (event: any) => {
                const YT = (window as any).YT
                const state = event.data
                
                setIsPlaying(state === YT.PlayerState.PLAYING)
                setIsBuffering(state === YT.PlayerState.BUFFERING)
                
                // If video ends, play next
                if (state === YT.PlayerState.ENDED) {
                  setTimeout(() => {
                    try {
                      if (playerRef.current && playerRef.current.nextVideo) {
                        playerRef.current.nextVideo()
                        setTimeout(() => {
                          if (playerRef.current && playerRef.current.playVideo) {
                            playerRef.current.playVideo()
                          }
                        }, 200)
                      }
                    } catch (e) {
                      console.error('Error playing next video:', e)
                    }
                  }, 500)
                }
                // If paused unexpectedly, try to resume
                if (state === YT.PlayerState.PAUSED && isPlaying) {
                  setTimeout(() => {
                    try {
                      if (playerRef.current && playerRef.current.playVideo) {
                        playerRef.current.playVideo()
                      }
                    } catch (e) {
                      // Ignore errors
                    }
                  }, 100)
                }
              },
              onError: (event: any) => {
                console.error('YouTube player error:', event.data)
                // Try to continue to next video on error
                if (event.data === 150 || event.data === 101) {
                  setTimeout(() => {
                    try {
                      if (playerRef.current && playerRef.current.nextVideo) {
                        playerRef.current.nextVideo()
                      }
                    } catch (e) {
                      // Ignore errors
                    }
                  }, 1000)
                }
              }
            }
          })
        }
      }, 100)
      
      return () => {
        clearTimeout(timer)
      }
    }
  }, [playlistId, playerReady, volume, wasPlaying])

  // Update volume
  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(volume)
    }
  }, [volume])

  // Extract playlist ID from URL
  const extractPlaylistId = (url: string) => {
    const match = url.match(/[?&]list=([^&]+)/)
    return match ? match[1] : null
  }

  const handleLoadPlaylist = () => {
    const id = extractPlaylistId(playlistUrl)
    if (id) {
      // Destroy existing player
      if (playerRef.current) {
        try {
          playerRef.current.stopVideo()
          playerRef.current.destroy()
        } catch (e) {
          // Ignore errors
        }
        playerRef.current = null
      }
      setPlaylistId('') // Reset first
      setTimeout(() => {
        setPlaylistId(id)
        setShowPlayer(true)
      }, 100)
    }
  }

  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo()
      } else {
        playerRef.current.playVideo()
      }
    }
  }

  const nextTrack = () => {
    if (playerRef.current) {
      playerRef.current.nextVideo()
    }
  }

  const prevTrack = () => {
    if (playerRef.current) {
      playerRef.current.previousVideo()
    }
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden" style={{ width: '100vw', height: '100vh', maxWidth: '100vw', boxSizing: 'border-box', backgroundColor: '#0f0f1a' }}>
      {/* Hidden YouTube Player - Must be in main component to persist across tabs */}
      <div id="yt-player" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }} />
      
      {/* Header with Glass Morphism */}
      <header className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.1)] shrink-0" style={{ backdropFilter: 'blur(20px)' }}>
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo with glow - Cyan blue with lightning bolt */}
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.8), 0 0 40px rgba(34,211,238,0.6), 0 0 80px rgba(34,211,238,0.4)', glowIntensity)
            }}
          >
            <Zap className="w-6 h-6 text-white" fill="white" />
          </div>
              <div>
                <h1 className="text-xl font-bold text-white">Lifedesign</h1>
                <p className="text-[rgba(255,255,255,0.6)] text-xs">change your life, get rich, develop strong friendships, have some f****** FUN</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Music Player */}
              <div className="flex flex-col gap-1 px-3 py-1.5 bg-[rgba(255,255,255,0.1)] rounded-lg">
                {!showPlayer ? (
                  <div className="flex flex-col gap-1">
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>add music to create your vibe</div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Playlist URL..."
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleLoadPlaylist()
                          }
                        }}
                        style={{
                          width: '200px',
                          padding: '6px 10px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '11px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button 
                        onClick={handleLoadPlaylist}
                        style={{
                          padding: '6px 12px',
                          background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Load
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={prevTrack}
                      style={{
                        width: '28px',
                        height: '28px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >⏮</button>
                    
                    <button 
                      onClick={togglePlay}
                      style={{
                        width: '36px',
                        height: '36px',
                        background: 'linear-gradient(135deg, #fde047, #facc15)',
                        border: 'none',
                        borderRadius: '50%',
                        color: '#0f0f1a',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}
                    >
                      {isBuffering ? (
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #0f0f1a',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                      ) : (
                        isPlaying ? '⏸' : '▶'
                      )}
                      <style jsx>{`
                        @keyframes spin {
                          to { transform: rotate(360deg); }
                        }
                      `}</style>
                    </button>
                    
                    <button 
                      onClick={nextTrack}
                      style={{
                        width: '28px',
                        height: '28px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >⏭</button>
                    
                    <div className="flex items-center gap-1" style={{ width: '100px', minWidth: '100px', position: 'relative' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>🔊</span>
                      <div style={{ position: 'relative', flex: 1, height: '4px' }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '4px',
                          borderRadius: '2px',
                          background: `linear-gradient(90deg, #22d3ee ${volume}%, rgba(255,255,255,0.2) ${volume}%)`,
                          pointerEvents: 'none'
                        }} />
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => setVolume(parseInt(e.target.value))}
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: '4px',
                            margin: 0,
                            padding: 0,
                            background: 'transparent',
                            appearance: 'none',
                            cursor: 'pointer',
                            outline: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            zIndex: 1
                          }}
                        />
                        <style jsx global>{`
                          input[type="range"]::-webkit-slider-thumb {
                            appearance: none;
                            width: 12px;
                            height: 12px;
                            border-radius: 50%;
                            background: #22d3ee;
                            cursor: pointer;
                            border: 2px solid rgba(255,255,255,0.3);
                            margin-top: -4px;
                            position: relative;
                            z-index: 2;
                          }
                          input[type="range"]::-moz-range-thumb {
                            width: 12px;
                            height: 12px;
                            border-radius: 50%;
                            background: #22d3ee;
                            cursor: pointer;
                            border: 2px solid rgba(255,255,255,0.3);
                            border: none;
                            box-sizing: border-box;
                          }
                          input[type="range"]::-webkit-slider-runnable-track {
                            width: 100%;
                            height: 4px;
                            background: transparent;
                            border-radius: 2px;
                          }
                          input[type="range"]::-moz-range-track {
                            width: 100%;
                            height: 4px;
                            background: transparent;
                            border-radius: 2px;
                          }
                        `}</style>
                      </div>
                    </div>
                    
                    <button 
                 onClick={() => { 
                   setShowPlayer(false)
                   setPlaylistId('')
                   setWasPlaying(false)
                   if (typeof window !== 'undefined') {
                     localStorage.removeItem('music_playlistId')
                     localStorage.removeItem('music_wasPlaying')
                   }
                   if (playerRef.current) {
                     try {
                       playerRef.current.stopVideo()
                       playerRef.current.destroy()
                     } catch (e) {}
                     playerRef.current = null
                   }
                 }}
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                      title="Change Playlist"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              
              {/* Lightning Glow Control */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(255,255,255,0.1)] rounded-lg">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-white text-xs font-medium">Lightning</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={glowIntensity}
                  onChange={(e) => setGlowIntensity(Number(e.target.value))}
                  className="w-20 h-1 bg-[rgba(255,255,255,0.2)] rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />
                <span className="text-white text-xs w-8 text-right">{glowIntensity}%</span>
              </div>
              {/* Search Bar */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.6)]" />
                <input
                  type="text"
                  placeholder="Search forums..."
                  className="pl-9 pr-4 py-1.5 bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.2)] rounded-xl text-sm text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-yellow-400/50 w-56"
                  style={{ backdropFilter: 'blur(10px)' }}
                />
              </div>
              {/* Profile Section */}
              <div className="flex items-center gap-2">
                {affiliate.avatar_url ? (
                  <img
                    src={affiliate.avatar_url}
                    alt={affiliate.avatar_name || affiliate.name}
                    className="w-8 h-8 rounded-full object-cover border-2"
                    style={{
                      borderColor: 'rgba(34,211,238,0.5)',
                      boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                    }}
                  />
                ) : (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2"
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
              </div>
              {/* Notifications */}
              <NotificationBell currentUserId={affiliate.id} />
              <Link
                href="/settings"
                className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-xl transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-[rgba(255,255,255,0.8)]" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-xl transition-colors"
                title="Log out"
              >
                <LogOut className="w-5 h-5 text-[rgba(255,255,255,0.8)]" />
              </button>
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
                background: 'linear-gradient(135deg, #fde047, #facc15)',
                boxShadow: glowShadow('0 0 20px rgba(253,224,71,0.7), 0 0 40px rgba(253,224,71,0.5), 0 8px 30px rgba(253,224,71,0.4)', glowIntensity)
              } : {}}
            >
              Community
            </button>
            <button
              onClick={() => setActiveTab('classroom')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'classroom'
                  ? 'text-white'
                  : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
              }`}
              style={activeTab === 'classroom' ? {
                background: 'linear-gradient(135deg, #fde047, #facc15)',
                boxShadow: glowShadow('0 0 20px rgba(253,224,71,0.7), 0 0 40px rgba(253,224,71,0.5), 0 8px 30px rgba(253,224,71,0.4)', glowIntensity)
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
                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity)
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
          <CommunityTab affiliate={affiliate} activeTab={activeTab} setActiveTab={setActiveTab} setIsDMModalOpen={setIsDMModalOpen} setIsGroupChatOpen={setIsGroupChatOpen} glowIntensity={glowIntensity} />
        ) : activeTab === 'classroom' ? (
          <ClassroomTab affiliate={affiliate} activeTab={activeTab} setActiveTab={setActiveTab} setIsDMModalOpen={setIsDMModalOpen} glowIntensity={glowIntensity} />
        ) : (
          <GroupChatTab affiliate={affiliate} setIsDMModalOpen={setIsDMModalOpen} glowIntensity={glowIntensity} />
        )}
      </div>


      {/* DM Modal */}
      <DMModal
        isOpen={isDMModalOpen}
        onClose={() => setIsDMModalOpen(false)}
        currentUserId={affiliate.id}
        currentUserName={affiliate.avatar_name || affiliate.name}
        currentUserAvatar={affiliate.avatar_url}
      />

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
  setIsDMModalOpen,
  setIsGroupChatOpen,
  glowIntensity
}: { 
  affiliate: DashboardClientProps['affiliate']
  activeTab: 'community' | 'classroom'
  setActiveTab: (tab: 'community' | 'classroom') => void
  setIsDMModalOpen: (open: boolean) => void
  setIsGroupChatOpen: (open: boolean) => void
  glowIntensity: number
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
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" fill="white" />
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
                <span className="text-base">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}

          <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <button
              onClick={() => setIsGroupChatOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all text-white"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity),
                border: '1px solid rgba(34,211,238,0.3)'
              }}
            >
              <span className="text-base">💬</span>
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
            <button
              onClick={() => setIsDMModalOpen(true)}
              className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 text-white"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Messages
            </button>
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
              <p className="text-xs text-[rgba(255,255,255,0.6)]">Share insights and connect with others</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.6)]" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.2)] rounded-lg text-sm text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-yellow-400/50 w-64 rounded-xl"
                  style={{ backdropFilter: 'blur(10px)' }}
                />
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
  setIsDMModalOpen,
  glowIntensity
}: { 
  affiliate: DashboardClientProps['affiliate']
  activeTab: 'community' | 'classroom' | 'groupchat'
  setActiveTab: (tab: 'community' | 'classroom' | 'groupchat') => void
  setIsDMModalOpen: (open: boolean) => void
  glowIntensity: number
}) {
  const [selectedWorld, setSelectedWorld] = useState<'mindset' | 'dreamjob' | 'affiliate' | null>(null)
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<{ id?: string, title?: string, moduleName?: string } | null>(null)
  
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
  
  const mindsetCategories = [
    {
      id: 'starthere',
      title: 'START HERE SO YOU KNOW WHAT TO DO',
      isStartHere: true,
      sections: [
        {
          id: 0, number: 0, title: 'Getting Started', description: 'Watch this first to understand how to navigate and use the Mindset course.',
          videos: [
            { id: 'v0-1', title: 'How to Use This Course', loomId: '' }, // Placeholder - user will add video
          ]
        },
      ]
    },
    {
      id: 'mindset',
      title: 'Mindset',
      sections: [
        {
          id: 1, number: 1, title: 'Core Re-Frames', description: 'Fundamental mindset shifts to transform how you see yourself and your potential.',
          videos: [
            { id: 'v1-1', title: 'You can change your life', loomId: extractLoomId('https://www.loom.com/share/9424ea6ec43e415d87ac9ee1383c404c') },
            { id: 'v1-2', title: 'Every problem is a personal power problem', loomId: extractLoomId('https://www.loom.com/share/1d55647b1c7f4953a7718465dc2747c5') },
            { id: 'v1-3', title: 'No such thing as wasted time', loomId: extractLoomId('https://www.loom.com/share/7388824c447b4b139be63d8cb55e8636') },
            { id: 'v1-4', title: 'You are a problem solver', loomId: extractLoomId('https://www.loom.com/share/00b9923a57064b4bbcac9e032ce5564f') },
            { id: 'v1-5', title: 'Balance is a lie. Obsession wins', loomId: extractLoomId('https://www.loom.com/share/ec745026fb254f548c9535bd5f4d1e46') },
            { id: 'v1-6', title: 'You are the authority of your life', loomId: extractLoomId('https://www.loom.com/share/0207f161adaa4cd0a8a777189167425b') },
            { id: 'v1-7', title: 'Your dreams are not distant fantasies', loomId: extractLoomId('https://www.loom.com/share/e455e6f78ca94b9db8f3bc1d6af6906e') },
            { id: 'v1-8', title: 'Mind-based system to feel-based system', loomId: extractLoomId('https://www.loom.com/share/876677b2bbe14a4d9721ee8e3df71ac8') },
            { id: 'v1-9', title: 'What is life directionality?', loomId: extractLoomId('https://www.loom.com/share/cad4c4eea34f4ab1936f2433d9a3dc38') },
            { id: 'v1-10', title: 'Can\'t do anything, but can do exactly what you want', loomId: extractLoomId('https://www.loom.com/share/81c618ea1c604e65938eb368bde61e49') },
          ]
        },
        {
          id: 2, number: 2, title: 'Operational Foundations', description: 'Core principles for building a strong foundation in your life and decision-making.',
          videos: [
            { id: 'v2-1', title: 'Being okay with being alone', loomId: extractLoomId('https://www.loom.com/share/76bd1113ec39482abebe847a1db35016') },
            { id: 'v2-2', title: 'Removing "right vs wrong" thinking', loomId: extractLoomId('https://www.loom.com/share/ebcb5ea388004ee185b1039c2a4d3fbc') },
            { id: 'v2-3', title: 'The idea of "creating space"', loomId: extractLoomId('https://www.loom.com/share/c296a736abff425f864dcf736c9654ac') },
            { id: 'v2-4', title: 'God-given niche', loomId: extractLoomId('https://www.loom.com/share/c9b1777f7965493683b341682899a27c') },
            { id: 'v2-5', title: 'Removing the victim mindset', loomId: extractLoomId('https://www.loom.com/share/3206285ebbf64733b7d04f49713b8d44') },
            { id: 'v2-6', title: 'Taking monstrous & absurd personal responsibility', loomId: extractLoomId('https://www.loom.com/share/aa72270f27394f46aca6181d89efb140') },
            { id: 'v2-7', title: 'Scarcity vs abundance mindset', loomId: extractLoomId('https://www.loom.com/share/f1de5d422bf94c42be2d68b436a5fcf6') },
          ]
        },
        {
          id: 10, number: 3, title: 'Fixing Normie Thinking Errors', description: 'Identify and eliminate common thinking patterns that hold you back.',
          videos: [
            { id: 'v10-1', title: 'The secret formula', loomId: extractLoomId('https://www.loom.com/share/3e6f7267f80d42d28bffe1ca8637a365') },
            { id: 'v10-2', title: 'Stats don\'t apply to you', loomId: extractLoomId('https://www.loom.com/share/3dcabbb3fd5d4b52a0dbd6878f5dc099') },
            { id: 'v10-3', title: 'Kill entitlement', loomId: extractLoomId('https://www.loom.com/share/785eb5383e414d5cafb5ca0f98e436da') },
            { id: 'v10-4', title: 'How the world works', loomId: extractLoomId('https://www.loom.com/share/1fbd32dbd2cd4c6db9af2a7756166872') },
            { id: 'v10-5', title: 'Actually understanding things', loomId: extractLoomId('https://www.loom.com/share/67a971fa679249cfac13dcb187449bdd') },
            { id: 'v10-6', title: 'Forbidden normie errors', loomId: extractLoomId('https://www.loom.com/share/4641d3510463447ca18b08c2237aae2b') },
          ]
        },
      ]
    },
    {
      id: 'lifedesign',
      title: 'Life Design System',
      sections: [
        {
          id: 3, number: 1, title: 'The Life Design Process', description: 'The systematic approach to designing and building the life you want.',
          videos: [
            { id: 'v3-1', title: 'Step 1 - Diagnosis process', youtubeId: extractYouTubeId('https://youtu.be/V2u6MtzHjlw') },
            { id: 'v3-2', title: 'Step 2 - survival income', youtubeId: extractYouTubeId('https://youtu.be/EwaYBchD43k') },
            { id: 'v3-3', title: '3 - running the diagnosis process', youtubeId: extractYouTubeId('https://youtu.be/mqRRHfwdeNw') },
            { id: 'v3-4', title: '4 - Analyzing your data points + rough buildout live', youtubeId: extractYouTubeId('https://youtu.be/lNhzBOMaW0k') },
            { id: 'v3-5', title: '5- reverse engineer + research next steps', youtubeId: extractYouTubeId('https://youtu.be/Tw_0QfukYuE') },
            { id: 'v3-6', title: '6 - design your day system', youtubeId: extractYouTubeId('https://youtu.be/lHw76uDbdRE') },
            { id: 'v3-7', title: 'Researching + finding people that know', youtubeId: extractYouTubeId('https://youtu.be/8s3bzEd162c') },
          ]
        },
        {
          id: 7, number: 2, title: 'The Game of Capitalism', description: 'Understand how money works and how to play the game to win.',
          videos: [
            { id: 'v7-1', title: 'The game + its current problems', loomId: extractLoomId('https://www.loom.com/share/5166d05c5b7a45858c98ef13ff9bbfa5') },
            { id: 'v7-2', title: 'How money works and how to get it', loomId: extractLoomId('https://www.loom.com/share/474596192262401084262de5bde6f6b9') },
            { id: 'v7-3', title: 'The 7 levels of capitalism', loomId: extractLoomId('https://www.loom.com/share/4805508f33f548458f75cae4a1feb447') },
            { id: 'v7-4', title: 'Skill pack + skill-pack systems', loomId: extractLoomId('https://www.loom.com/share/9d2179b1ba554276958a2c10d273a569') },
            { id: 'v7-5', title: 'Stored leverage', loomId: extractLoomId('https://www.loom.com/share/2a0213ed5e9346338940380504588c6b') },
            { id: 'v7-6', title: 'Expense management', loomId: extractLoomId('https://www.loom.com/share/250cf2c657d9416495a120d4473bf822') },
          ]
        },
        {
          id: 9, number: 3, title: 'Life Directionality', description: 'Discover and align with your true life direction and purpose.',
          videos: [
            { id: 'v9-1', title: 'Reality/life directionality', loomId: extractLoomId('https://www.loom.com/share/aa35407c3bee4ede8791a9772331b986') },
            { id: 'v9-2', title: 'Signal is simple, noise isn\'t', loomId: extractLoomId('https://www.loom.com/share/667e9a2769d740e0a46e83d89f6052f4') },
            { id: 'v9-3', title: 'Barrier to life alignment', loomId: extractLoomId('https://www.loom.com/share/f129a45dbcf04f10a44a8e13fa05a66c') },
            { id: 'v9-4', title: 'Strengthen conviction in self', loomId: extractLoomId('https://www.loom.com/share/c569894df2d448b19ab4b2de14f2e2b5') },
            { id: 'v9-5', title: 'I will get better', loomId: extractLoomId('https://www.loom.com/share/5c3e982f1f98437e8e43e9ffde2407e2') },
            { id: 'v9-6', title: 'Managing your energy', loomId: extractLoomId('https://www.loom.com/share/b91a491bc6334ed8960c5ffe83fc81fa') },
          ]
        },
        {
          id: 8, number: 4, title: 'Life Design Starter Packs', description: 'Pre-built templates and systems to jumpstart your life design journey.',
          videos: [
            { id: 'v8-1', title: 'Life Design Starter Pack Overview', loomId: extractLoomId('https://www.loom.com/share/6d20be7d84bb4a38b01d9638f6334d3f') },
            { id: 'v8-2', title: 'Youngblood grinder template', loomId: extractLoomId('https://www.loom.com/share/19c4a63fd79c49be882966e5394cfe0c') },
            { id: 'v8-3', title: 'Rando-job lifefloater', loomId: extractLoomId('https://www.loom.com/share/59a52110a4a340e7aa9ede851ac56255') },
            { id: 'v8-4', title: 'Corporate sidehustler', loomId: extractLoomId('https://www.loom.com/share/c2b99ffd662c49f995c3e67ed65f5870') },
            { id: 'v8-5', title: 'Remote dreamor', loomId: extractLoomId('https://www.loom.com/share/daacdb14a75643d2a4816887dd932e87') },
            { id: 'v8-6', title: 'Corporate lifemaxxer', loomId: extractLoomId('https://www.loom.com/share/9a5168e5cab441f090b8f74e41505555') },
            { id: 'v8-7', title: 'Future worldwide entrepreneur', loomId: extractLoomId('https://www.loom.com/share/349c724bfb1a45459904ce439aac9225') },
            { id: 'v8-8', title: 'Entrepreneurial lifemaxxr', loomId: extractLoomId('https://www.loom.com/share/d6fa514553be452fb6367e2d4032c621') },
          ]
        },
      ]
    },
    {
      id: 'thinkingtools',
      title: 'Thinking Tools/Models',
      sections: [
        {
          id: 4, number: 1, title: 'Reverse Engineering', description: 'Learn to work backwards from your goals to create actionable steps.',
          videos: [
            { id: 'v4-1', title: 'Reverse engineering the steps of your life', loomId: extractLoomId('https://www.loom.com/share/693655ad78a147d6b139d55a653aa00b') },
            { id: 'v4-2', title: 'The DESIGN YOUR DAY system', loomId: extractLoomId('https://www.loom.com/share/bfd58023e63d448392b86074f35c41d6') },
            { id: 'v4-3', title: 'Research/finding ppl that know (hardest part)', loomId: extractLoomId('https://www.loom.com/share/9971245dfd424125a5b3c648e7fdf18f') },
            { id: 'v4-4', title: 'ADDITIONAL reverse engineering (use as extra examples)', loomId: extractLoomId('https://www.loom.com/share/e10e99531f87484c8fa47e184a83e525') },
            { id: 'v4-5', title: '"Don\'t know moment" = good', loomId: extractLoomId('https://www.loom.com/share/363eec37084d4650934bfb375f4c7196') },
          ]
        },
        {
          id: 6, number: 2, title: 'Decision-Making', description: 'Master the art of making confident decisions and trusting your choices.',
          videos: [
            { id: 'v6-1', title: 'Decision-making overview', loomId: extractLoomId('https://www.loom.com/share/c544dd89a60a456c8d20f71263fd1e93') },
            { id: 'v6-2', title: 'Decision-making mental model', loomId: extractLoomId('https://www.loom.com/share/4dc358afda54482893b7ca73faf855c4') },
            { id: 'v6-3', title: 'There is no \'right decision\'', loomId: extractLoomId('https://www.loom.com/share/5733ab6af0464cd5ba6b9d3c7d822da1') },
            { id: 'v6-4', title: 'Additional decision-making idea', loomId: extractLoomId('https://www.loom.com/share/183a85dad7f24755aa2549b8c65217b0') },
          ]
        },
        {
          id: 5, number: 3, title: 'Procrastination', description: 'Systems and strategies to overcome procrastination and build consistent action.',
          videos: [
            { id: 'v5-1', title: 'Anti procrastination module', loomId: extractLoomId('https://www.loom.com/share/00d9d44d3dae4b1a9a612ec7c4f0559f') },
            { id: 'v5-2', title: 'Procrastination destruction system', loomId: extractLoomId('https://www.loom.com/share/b85982d48967474c9c0882e35aca5424') },
          ]
        },
      ]
    },
  ]
  
  // Flatten for backward compatibility with MindsetModuleList
  const mindsetModules = mindsetCategories.flatMap(category => 
    category.sections.map(section => ({
      ...section,
      categoryId: category.id,
      categoryTitle: category.title
    }))
  )
  
  // Dream Job modules data
  const dreamJobModules = [
    {
      id: 1, number: 1, title: 'INTRO', description: 'Get started with the Dream Job program',
      videos: [{ id: 'v1-1', title: 'House Rules', youtubeId: extractYouTubeId('https://youtu.be/tKCQuBJcOJI') }]
    },
    {
      id: 2, number: 2, title: 'THE GREAT UNLEARNING', description: 'Unlearn the broken job search advice',
      videos: [
        { id: 'v2-1', title: 'The great unlearning lesson 1', youtubeId: extractYouTubeId('https://youtu.be/PfgsbC2OQ3w') },
        { id: 'v2-2', title: 'The great unlearning lesson 2', youtubeId: extractYouTubeId('https://youtu.be/9AK-qoJ4QD0') },
        { id: 'v2-3', title: 'Great unlearning lesson 3', youtubeId: extractYouTubeId('https://youtu.be/MZZ1gnfA1Uc') },
        { id: 'v2-4', title: 'Lesson 4', youtubeId: extractYouTubeId('https://youtu.be/a6oT475-bNA') },
        { id: 'v2-5', title: 'Lesson 5', youtubeId: extractYouTubeId('https://youtu.be/M_IYaTtr0F0') },
        { id: 'v2-6', title: 'Lesson 6', youtubeId: extractYouTubeId('https://youtu.be/7npWIycpkfE') },
        { id: 'v2-7', title: 'Lesson 7', youtubeId: extractYouTubeId('https://youtu.be/ll75o_cW0uo') },
        { id: 'v2-8', title: 'Lesson 8', youtubeId: '' },
      ]
    },
    {
      id: 3, number: 3, title: 'KNOW THYSELF', description: 'Discover your unique strengths and values',
      videos: [
        { id: 'v3-1', title: 'Know thyself: Lesson 1', youtubeId: extractYouTubeId('https://youtu.be/m7SE3iT41ZU') },
        { id: 'v3-2', title: 'Lesson 2', youtubeId: extractYouTubeId('https://youtu.be/cMp3D7etkeQ') },
        { id: 'v3-3', title: 'Lesson 3', youtubeId: extractYouTubeId('https://youtu.be/-K3KsXLHARw') },
      ]
    },
    {
      id: 4, number: 4, title: 'RESEARCH LIKE HEAVEN', description: 'Master the art of company and role research',
      videos: [
        { id: 'v4-1', title: 'Research like heaven: Lesson 1', youtubeId: extractYouTubeId('https://youtu.be/AJf9LB2Le3Y') },
        { id: 'v4-2', title: 'Lesson 2', youtubeId: extractYouTubeId('https://youtu.be/ilL-E1ks8XU') },
        { id: 'v4-3', title: '3', youtubeId: extractYouTubeId('https://youtu.be/U1RAtTAwNxA') },
        { id: 'v4-4', title: '3 part 2', youtubeId: extractYouTubeId('https://youtu.be/QxKkCazV2NY') },
      ]
    },
    {
      id: 5, number: 5, title: 'TRIAL PROJECT', description: 'Create work samples that prove your value',
      videos: [
        { id: 'v5-1', title: 'Trial Project: Lesson 1', youtubeId: extractYouTubeId('https://youtu.be/z3IX2ACDXNs') },
        { id: 'v5-2', title: 'Lesson 2', youtubeId: extractYouTubeId('https://youtu.be/E9sBYsPmhw8') },
        { id: 'v5-3', title: 'Lesson 3', youtubeId: extractYouTubeId('https://youtu.be/jd3wQ3k7Nlk') },
        { id: 'v5-4', title: 'Lesson 4', youtubeId: extractYouTubeId('https://youtu.be/xpcpLPdDU_A') },
        { id: 'v5-5', title: 'Lesson 5', youtubeId: extractYouTubeId('https://youtu.be/tbWygenb3iI') },
        { id: 'v5-6', title: 'Lesson 6', youtubeId: extractYouTubeId('https://youtu.be/GRVoPEB9yBI') },
      ]
    },
    {
      id: 6, number: 6, title: 'REACH ANYONE IN THE WORLD', description: 'Learn how to connect with decision makers',
      videos: [
        { id: 'v6-1', title: 'Reach Anyone In The World: Lesson 1', youtubeId: extractYouTubeId('https://youtu.be/aK45c5bjEms') },
        { id: 'v6-2', title: 'Lesson 2', youtubeId: extractYouTubeId('https://youtu.be/FPb7qVArelg') },
        { id: 'v6-3', title: 'Lesson 3', youtubeId: extractYouTubeId('https://youtu.be/1ehr1fk9sY8') },
      ]
    },
    {
      id: 7, number: 7, title: 'ACING EVERY INTERVIEW', description: 'Turn interviews into conversations and job offers',
      videos: [
        { id: 'v7-1', title: 'Acing Every Interview: Lesson 1 (master lesson)', youtubeId: extractYouTubeId('https://youtu.be/fyeoO8EzD6w') },
      ]
    },
    {
      id: 8, number: 8, title: 'FINAL FIRST IMPRESSION', description: 'Close the deal and start your dream job',
      videos: [
        { id: 'v8-1', title: 'Final First Impression: Master lesson', youtubeId: extractYouTubeId('https://youtu.be/AkF6LvlvroY') },
        { id: 'v8-2', title: 'Lesson 6 final adjustment Bonus video', youtubeId: extractYouTubeId('https://youtu.be/qXjuyco6RQw') },
      ]
    },
  ]
  
  return (
    <div className="flex h-full w-full" style={{ display: 'flex', width: '100%', maxWidth: '100%', boxSizing: 'border-box', margin: 0, padding: 0, gap: 0, backgroundColor: '#0f0f1a' }}>
      {/* Sidebar - Match CommunityTab styling */}
      <div className="w-[250px] text-white flex flex-col shrink-0" style={{ width: '250px', flexShrink: 0, background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)' }}>
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" fill="white" />
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
                <span className="text-base">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}

          <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <button
              onClick={() => setActiveTab('groupchat')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all text-white"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity),
                border: '1px solid rgba(34,211,238,0.3)'
              }}
            >
              <span className="text-base">💬</span>
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
            <button
              onClick={() => setIsDMModalOpen(true)}
              className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 text-white"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Messages
            </button>
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
              <p className="text-xs text-[rgba(255,255,255,0.6)]">
                {selectedWorld === 'mindset' ? 'Mindset & Foundations' : 
                 selectedWorld === 'dreamjob' ? 'Get Your Dream Job' :
                 selectedWorld === 'affiliate' ? 'Build Your Side Income' :
                 'Choose a world to explore and start your journey'}
              </p>
            </div>
            {selectedWorld && (
              <button
                onClick={() => setSelectedWorld(null)}
                className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                ← Back to Worlds
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 w-full px-4 sm:px-6 lg:px-8 py-8" style={{ width: '100%', maxWidth: '100%', flex: 1, minWidth: 0, boxSizing: 'border-box', margin: 0 }}>
            {!selectedWorld ? (
              /* World Selection Screen */
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Welcome back, {affiliate.avatar_name || affiliate.name}!
                  </h2>
                  <p className="text-[rgba(255,255,255,0.6)] text-lg">
                    Choose a world to explore and start your journey
                  </p>
                </div>

                {/* World Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Mindset & Foundations */}
                  <button
                    onClick={() => setSelectedWorld('mindset')}
                    className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 border-emerald-500 rounded-2xl p-8 text-center hover:shadow-lg transition-all group"
                    style={{
                      backdropFilter: 'blur(10px)',
                      boxShadow: glowShadow('0 0 30px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.2)', glowIntensity)
                    }}
                  >
                    <div className="text-6xl mb-4">🧠</div>
                    <h3 className="text-xl font-bold text-white mb-2">Mindset & Foundations</h3>
                    <p className="text-[rgba(255,255,255,0.6)] mb-4">
                      Build your mental foundation for success
                    </p>
                    <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full font-semibold">
                      Active
                    </span>
                    <div className="mt-4 text-emerald-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Enter World →
                    </div>
                  </button>

                  {/* Get Your Dream Job */}
                  <button
                    onClick={() => setSelectedWorld('dreamjob')}
                    className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 border-cyan-500 rounded-2xl p-8 text-center hover:shadow-lg transition-all group"
                    style={{
                      backdropFilter: 'blur(10px)',
                      boxShadow: glowShadow('0 0 30px rgba(6,182,212,0.3), 0 0 60px rgba(6,182,212,0.2)', glowIntensity)
                    }}
                  >
                    <div className="text-6xl mb-4">💼</div>
                    <h3 className="text-xl font-bold text-white mb-2">Get Your Dream Job</h3>
                    <p className="text-[rgba(255,255,255,0.6)] mb-4">
                      Land the career you've always wanted
                    </p>
                    <span className="inline-block px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-full font-semibold">
                      Active
                    </span>
                    <div className="mt-4 text-cyan-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Enter World →
                    </div>
                  </button>

                  {/* Build Your Side Income */}
                  <Link
                    href="/affiliate"
                    className="bg-[rgba(255,255,255,0.1)] backdrop-blur-[10px] border-2 border-green-500 rounded-2xl p-8 text-center hover:shadow-lg transition-all group"
                    style={{
                      backdropFilter: 'blur(10px)',
                      boxShadow: glowShadow('0 0 30px rgba(34,197,94,0.3), 0 0 60px rgba(34,197,94,0.2)', glowIntensity)
                    }}
                  >
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-xl font-bold text-white mb-2">Build Your Side Income</h3>
                    <p className="text-[rgba(255,255,255,0.6)] mb-4">
                      grab our done-for-you products, take the content training & begin printing ASAP!
                    </p>
                    <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-semibold">
                      Active
                    </span>
                    <div className="mt-4 text-green-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Enter World →
                    </div>
                  </Link>
                </div>
              </div>
            ) : selectedWorld === 'mindset' ? (
              /* LD World / Mindset Content */
              <div>
                <MindsetModuleList 
                  modules={mindsetModules} 
                  categories={mindsetCategories}
                  affiliate={affiliate}
                />
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
                <DreamJobModuleList 
                  modules={dreamJobModules} 
                  affiliate={affiliate}
                  onVideoSelect={(video, module) => {
                    setSelectedLesson({
                      id: video.id,
                      title: video.title,
                      moduleName: module.title
                    })
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Floating Dream Job Assistant - Only show when Dream Job is active */}
      {selectedWorld === 'dreamjob' && (
        <>
          {/* Floating Button */}
          <button
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white z-50 transition-all hover:scale-110 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity)
            }}
            title="Course Assistant"
          >
            {/* Robot Emoji */}
            <span className="text-2xl">🤖</span>
          </button>

          {/* Assistant Drawer/Popup */}
          {isAssistantOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setIsAssistantOpen(false)}
              />
              
              {/* Drawer */}
              <div
                className="fixed bottom-6 right-6 w-[400px] h-[500px] bg-[#0f0f1a] rounded-xl border-2 border-[rgba(34,211,238,0.3)] shadow-2xl z-50 flex flex-col overflow-hidden"
                style={{
                  boxShadow: glowShadow('0 0 30px rgba(34,211,238,0.5), 0 0 60px rgba(34,211,238,0.3), 0 20px 40px rgba(14,165,233,0.25)', glowIntensity)
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between bg-[rgba(26,26,46,0.8)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <span className="font-semibold text-white">Course Assistant</span>
                  </div>
                  <button
                    onClick={() => setIsAssistantOpen(false)}
                    className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[rgba(255,255,255,0.6)]" />
                  </button>
                </div>

                {/* Assistant Content */}
                <div className="flex-1 overflow-hidden">
                  <CourseAssistant
                    lessonId={selectedLesson?.id}
                    lessonTitle={selectedLesson?.title}
                    moduleName={selectedLesson?.moduleName}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
