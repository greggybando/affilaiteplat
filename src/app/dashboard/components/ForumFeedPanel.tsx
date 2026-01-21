'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Heart, MessageCircle, Image as ImageIcon, Send, Zap, Pin, MoreVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProfileHoverCard } from '@/app/components/ProfileHoverCard'

interface User {
  id: string
  name: string
  avatar: string | null
}

interface Post {
  id: string
  title: string
  content: string
  category: string
  imageUrls: string[]
  videoUrl?: string | null
  pinned: boolean
  createdAt: string
  user: User & { role?: string }
  likesCount: number
  repliesCount: number
  isLiked: boolean
}

interface ForumFeedPanelProps {
  category: string
  currentUser: {
    id: string
    name: string
    avatar: string | null
    role?: string
  }
  glowIntensity: number
  onPostClick?: (post: Post) => void
}

const glowShadow = (shadows: string, intensity: number) => {
  return shadows.split(',').map(shadow => {
    const match = shadow.match(/rgba?\([^)]+\)/)
    if (match) {
      const rgba = match[0]
      const alphaMatch = rgba.match(/[\d.]+\)$/)
      if (alphaMatch) {
        const alpha = parseFloat(alphaMatch[0].replace(')', ''))
        const newAlpha = (alpha * intensity) / 100
        return shadow.replace(rgba, rgba.replace(/[\d.]+\)$/, `${newAlpha})`))
      }
    }
    return shadow
  }).join(', ')
}

export default function ForumFeedPanel({ category, currentUser, glowIntensity, onPostClick }: ForumFeedPanelProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState<string | null>(null)
  const router = useRouter()
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'moderator'
  
  // Debug: Log admin status
  useEffect(() => {
    console.log('ForumFeedPanel - currentUser:', currentUser)
    console.log('ForumFeedPanel - isAdmin:', isAdmin)
  }, [currentUser, isAdmin])

  const fetchPosts = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    try {
      const params = new URLSearchParams()
      if (category && category !== 'All' && category !== 'Home') {
        // Category is already the database value (passed from tabs)
        params.append('category', category)
      }
      const url = `/api/community/posts${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [category])

  useEffect(() => {
    fetchPosts(true) // Show loading on initial load
  }, [fetchPosts])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showMenu) {
        const menuElement = menuRefs.current[showMenu]
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setShowMenu(null)
        }
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleModeratePost = async (postId: string, action: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (!res.ok) throw new Error('Failed to moderate post')

      const data = await res.json()
      
      setPosts(posts.map(p =>
        p.id === postId
          ? {
              ...p,
              pinned: data.post.pinned
            }
          : p
      ))

      setShowMenu(null)
      // Refresh posts to ensure proper ordering
      fetchPosts(false)
    } catch (error) {
      console.error('Error moderating post:', error)
      alert('Failed to moderate post. Please try again.')
    }
  }

  // Listen for refresh events (when post is created from top composer)
  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<{ newPost?: Post }>
      // Optimistic update - add post immediately if provided
      if (customEvent.detail?.newPost) {
        const newPost = customEvent.detail.newPost
        // Check if post category matches current feed category
        // category prop is already the database value (e.g., "Organize Grindhouse", "Global Sends", "Meetups")
        if (newPost.category === category) {
          setPosts(prevPosts => {
            // Avoid duplicates - check if post already exists
            if (prevPosts.some(p => p.id === newPost.id)) {
              return prevPosts
            }
            return [newPost, ...prevPosts]
          })
        }
      }
      // Then refresh in background to ensure consistency (silent - no loading screen)
      fetchPosts(false)
    }
    window.addEventListener('refreshForumFeed', handleRefresh)
    return () => {
      window.removeEventListener('refreshForumFeed', handleRefresh)
    }
  }, [fetchPosts, category])

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST'
      })
      if (res.ok) {
        await fetchPosts()
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const renderContent = (content: string) => {
    if (!content) return <span></span>
    
    // Strip empty HTML tags and normalize whitespace
    let cleanedContent = content
      .replace(/<div><br><\/div>/gi, '')
      .replace(/<div><\/div>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .trim()
    
    // If no content after cleaning, return empty
    if (!cleanedContent) return <span></span>
    
    // Check if content contains HTML formatting tags
    if (cleanedContent.includes('<strong>') || cleanedContent.includes('<b>') || cleanedContent.includes('<em>') || cleanedContent.includes('<i>')) {
      return <div dangerouslySetInnerHTML={{ __html: cleanedContent }} />
    }
    
    // Check for markdown bold (**text**)
    if (cleanedContent.includes('**')) {
      const parts = cleanedContent.split(/(\*\*.*?\*\*)/g)
      return (
        <>
          {parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>
            }
            return <span key={idx}>{part}</span>
          })}
        </>
      )
    }
    
    // Plain text with preserved line breaks
    return <span className="whitespace-pre-wrap">{cleanedContent}</span>
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[rgba(255,255,255,0.6)]">Loading posts...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Posts Feed */}
      <div className="flex-1 overflow-y-auto p-4">
        {posts.length === 0 ? (
          <div className="rounded-2xl p-12 text-center">
            <p className="text-[rgba(255,255,255,0.6)] mb-4">Be the first to start a conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div
                key={post.id}
                onClick={() => onPostClick?.(post)}
                className="rounded-2xl p-6 cursor-pointer hover:-translate-y-0.5 transition-all duration-150 relative"
                style={{ 
                  background: post.pinned 
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 50%, #22d3ee 100%)',
                  boxShadow: post.pinned
                    ? glowShadow('0 0 40px rgba(250,204,21,0.6), 0 0 80px rgba(250,204,21,0.4), 0 20px 40px rgba(217,119,6,0.3)', glowIntensity)
                    : glowShadow('0 0 30px rgba(34,211,238,0.5), 0 0 60px rgba(34,211,238,0.3), 0 20px 40px rgba(14,165,233,0.25)', glowIntensity),
                  border: post.pinned ? '2px solid rgba(250,204,21,0.5)' : 'none'
                }}
              >
                <div className="flex items-center gap-2 absolute top-4 right-4 z-20">
                  {post.pinned && (
                    <Pin className="w-5 h-5 text-yellow-200 fill-yellow-200" />
                  )}
                  {isAdmin && (
                    <div 
                      className="relative" 
                      ref={(el) => { menuRefs.current[post.id] = el }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMenu(showMenu === post.id ? null : post.id)
                        }}
                        className="p-1.5 hover:bg-[rgba(255,255,255,0.2)] rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-white" />
                      </button>
                      {showMenu === post.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-[rgba(26,26,46,0.95)] backdrop-blur-[20px] rounded-xl border border-[rgba(255,255,255,0.2)] shadow-2xl overflow-hidden z-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleModeratePost(post.id, post.pinned ? 'unpin' : 'pin')
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2 transition-colors"
                          >
                            <Pin className="w-4 h-4" />
                            {post.pinned ? 'Unpin' : 'Pin'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ProfileHoverCard
                      userId={post.user.id}
                      userName={post.user.name}
                      userAvatar={post.user.avatar}
                      onChatClick={() => {
                        const currentPath = window.location.pathname
                        if (currentPath === '/dashboard') {
                          window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: post.user.id } }))
                        } else {
                          router.replace('/dashboard')
                          requestAnimationFrame(() => {
                            window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: post.user.id } }))
                          })
                        }
                      }}
                    >
                      <Link href={`/profile/${post.user.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        {post.user.avatar ? (
                          <img
                            src={post.user.avatar}
                            alt={post.user.name}
                            className="w-10 h-10 rounded-full border-2"
                            style={{
                              borderColor: 'rgba(34,211,238,0.5)',
                              boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                            }}
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold border-2"
                            style={{
                              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                              borderColor: 'rgba(34,211,238,0.5)',
                              boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                            }}
                          >
                            {post.user.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            {(post.user.role === 'admin' || post.user.role === 'moderator') ? (
                              <span 
                                className="font-semibold"
                                style={{
                                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundClip: 'text',
                                  filter: 'drop-shadow(0 0 1px rgba(250,204,21,0.4))'
                                }}
                              >
                                {post.user.name}
                              </span>
                            ) : (
                              <span className="font-semibold text-white">{post.user.name}</span>
                            )}
                            {(post.user.role === 'admin' || post.user.role === 'moderator') && (
                              <Zap 
                                className="w-5 h-5 text-yellow-400 flex-shrink-0" 
                                fill="currentColor"
                                style={{
                                  filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.8)) drop-shadow(0 0 8px rgba(250,204,21,0.6))'
                                }}
                              />
                            )}
                          </div>
                          <div className="text-sm text-[rgba(255,255,255,0.6)]">{formatTime(post.createdAt)}</div>
                        </div>
                      </Link>
                    </ProfileHoverCard>
                  </div>
                </div>

                <div className="text-white mb-4 whitespace-pre-wrap">
                  {renderContent(post.content)}
                </div>

                {post.imageUrls && post.imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {post.imageUrls.slice(0, 4).map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Post image ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-[rgba(255,255,255,0.2)]">
                  <button
                    onClick={(e) => handleLike(post.id, e)}
                    className="flex items-center gap-2 text-white hover:text-cyan-300 transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likesCount}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onPostClick?.(post)
                    }}
                    className="flex items-center gap-2 text-white hover:text-cyan-300 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{post.repliesCount}</span>
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

