'use client'

import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Image as ImageIcon, Send } from 'lucide-react'
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
  const router = useRouter()

  useEffect(() => {
    fetchPosts()
  }, [category])

  // Listen for refresh events (when post is created from top composer)
  useEffect(() => {
    const handleRefresh = () => {
      fetchPosts()
    }
    window.addEventListener('refreshForumFeed', handleRefresh)
    return () => {
      window.removeEventListener('refreshForumFeed', handleRefresh)
    }
  }, [category])

  const fetchPosts = async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }


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
    if (content && (content.includes('<strong>') || content.includes('<b>'))) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />
    }
    if (content && content.includes('**')) {
      const parts = content.split(/(\*\*.*?\*\*)/g)
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
    return <span>{content}</span>
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
                className="rounded-2xl p-6 cursor-pointer hover:-translate-y-0.5 transition-all duration-150"
                style={{ 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 50%, #22d3ee 100%)',
                  boxShadow: glowShadow('0 0 30px rgba(34,211,238,0.5), 0 0 60px rgba(34,211,238,0.3), 0 20px 40px rgba(14,165,233,0.25)', glowIntensity)
                }}
              >
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
                          <div className="font-semibold text-white">{post.user.name}</div>
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

