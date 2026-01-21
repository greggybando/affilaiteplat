'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, ArrowLeft, Calendar, Heart, MessageSquare, FileText } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { ProfileHoverCard } from '@/app/components/ProfileHoverCard'

interface ProfileData {
  id: string
  name: string
  avatar: string | null
  bio: string | null
  memberSince: string
  lastActiveAt: string | null
  role: string | null
  stats: {
    postsCount: number
    commentsCount: number
    likesReceived: number
  }
}

interface Post {
  id: string
  title: string
  content: string
  category: string
  imageUrls: string[]
  createdAt: string
  editedAt: string | null
  likesCount: number
  repliesCount: number
}

interface ProfilePageClientProps {
  profileData: ProfileData
  currentUserId: string
}

export function ProfilePageClient({ profileData, currentUserId }: ProfilePageClientProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const isOwnProfile = profileData.id === currentUserId
  const isAdmin = false // TODO: Get from current user context

  useEffect(() => {
    fetchPosts()
  }, [profileData.id])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/profile/${profileData.id}/posts?limit=20`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-4xl w-full relative z-10">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-cyan-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Profile Card */}
        <div 
          className="rounded-2xl p-8 mb-8 relative overflow-hidden"
          style={{
            background: 'rgba(26,26,46,0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(6,182,212,0.2)',
            boxShadow: '0 0 40px rgba(6,182,212,0.2), 0 8px 32px rgba(0,0,0,0.8)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
              {/* Avatar */}
              {profileData.avatar ? (
                <img
                  src={profileData.avatar}
                  alt={profileData.name}
                  className="w-24 h-24 rounded-full border-4 shrink-0"
                  style={{
                    borderColor: 'rgba(6,182,212,0.5)',
                    boxShadow: '0 0 30px rgba(6,182,212,0.5)'
                  }}
                />
              ) : (
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl border-4 shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                    borderColor: 'rgba(6,182,212,0.5)',
                    boxShadow: '0 0 30px rgba(6,182,212,0.5)'
                  }}
                >
                  {profileData.name[0]?.toUpperCase()}
                </div>
              )}

              {/* Name and Bio */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{profileData.name}</h1>
                  {profileData.role && profileData.role !== 'member' && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {profileData.role}
                    </span>
                  )}
                </div>
                {profileData.bio ? (
                  <p className="text-[rgba(255,255,255,0.7)] mb-3">{profileData.bio}</p>
                ) : (
                  <p className="text-[rgba(255,255,255,0.5)] italic mb-3">No bio yet</p>
                )}
                <div className="flex items-center gap-4 text-sm text-[rgba(255,255,255,0.6)]">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Member since {format(new Date(profileData.memberSince), 'MMM yyyy')}
                  </div>
                  {profileData.lastActiveAt && (
                    <div className="flex items-center gap-1">
                      <span>Active {formatTime(profileData.lastActiveAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!isOwnProfile && (
                <button
                  onClick={() => {
                    window.location.href = `/dashboard?openDM=${profileData.id}`
                  }}
                  className="px-6 py-3 rounded-xl text-white font-semibold transition-all transform hover:scale-[1.02] relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                    boxShadow: '0 0 20px rgba(34,211,238,0.5), 0 4px 20px rgba(0,0,0,0.3)',
                    color: '#0f0f1a'
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Send Message
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <div className="text-3xl font-bold text-white">{profileData.stats.postsCount}</div>
                </div>
                <div className="text-sm text-[rgba(255,255,255,0.6)]">Posts</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <div className="text-3xl font-bold text-white">{profileData.stats.commentsCount}</div>
                </div>
                <div className="text-sm text-[rgba(255,255,255,0.6)]">Comments</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-cyan-400" />
                  <div className="text-3xl font-bold text-white">{profileData.stats.likesReceived}</div>
                </div>
                <div className="text-sm text-[rgba(255,255,255,0.6)]">Likes Received</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div 
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: 'rgba(26,26,46,0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(6,182,212,0.2)',
            boxShadow: '0 0 40px rgba(6,182,212,0.2), 0 8px 32px rgba(0,0,0,0.8)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
            
            {loading ? (
              <div className="text-center py-8 text-[rgba(255,255,255,0.6)]">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-[rgba(255,255,255,0.6)]">No posts yet</div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/dashboard?post=${post.id}`}
                    className="block p-4 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors border" 
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1 line-clamp-1">{post.title || 'Untitled'}</h3>
                        <p className="text-sm text-[rgba(255,255,255,0.7)] line-clamp-2 mb-2">{post.content}</p>
                        <div className="flex items-center gap-4 text-xs text-[rgba(255,255,255,0.5)]">
                          <span className={`px-2 py-0.5 rounded-full ${
                            post.category === 'Wins' ? 'bg-green-500/20 text-green-400' :
                            post.category === 'dreamjob questions' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {post.category}
                          </span>
                          <span>{formatTime(post.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[rgba(255,255,255,0.6)] shrink-0">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {post.likesCount}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.repliesCount}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

