'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CommunityClientProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
  }
}

interface Post {
  id: string
  author: {
    name: string
    avatar: string | null
    avatarGradient: string
    badge: string
    badgeType: 'world' | 'success'
  }
  content: string
  timestamp: string
  likes: number
  replies: number
  reposts: number
  liked: boolean
  reposted: boolean
}

const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      name: 'Alex Thompson',
      avatar: null,
      avatarGradient: 'from-violet-500 to-purple-600',
      badge: 'Dream Job',
      badgeType: 'world' as const
    },
    content: 'Just finished my Trial Run Project for a fintech company. Sent it to the hiring manager and got a response within 2 hours asking for a call! This method actually works 🔥',
    timestamp: '2h ago',
    likes: 24,
    replies: 8,
    reposts: 3,
    liked: false,
    reposted: false
  },
  {
    id: '2',
    author: {
      name: 'Sarah Chen',
      avatar: null,
      avatarGradient: 'from-emerald-500 to-teal-600',
      badge: 'Hired! ✓',
      badgeType: 'success' as const
    },
    content: 'UPDATE: I got the job!! $95k base + equity. Started applying the Dream Job method 6 weeks ago. The "reach anyone" module changed everything - I DMed the CEO directly and he forwarded my Trial Run to the team.',
    timestamp: '5h ago',
    likes: 89,
    replies: 23,
    reposts: 12,
    liked: true,
    reposted: false
  },
  {
    id: '3',
    author: {
      name: 'Marcus Johnson',
      avatar: null,
      avatarGradient: 'from-amber-500 to-orange-600',
      badge: 'Side Income',
      badgeType: 'world' as const
    },
    content: 'Question for everyone: How specific should I get with my target company list? I have about 50 companies but wondering if I should narrow it down more before starting outreach.',
    timestamp: '8h ago',
    likes: 12,
    replies: 15,
    reposts: 2,
    liked: false,
    reposted: false
  },
  {
    id: '4',
    author: {
      name: 'Emma Rodriguez',
      avatar: null,
      avatarGradient: 'from-pink-500 to-rose-600',
      badge: 'Dream Job',
      badgeType: 'world' as const
    },
    content: 'LinkedIn tip that worked for me: Instead of "Open to Work" banner, I changed my headline to "[Industry] professional helping [target companies] solve [specific problem]" - connection requests went up 3x',
    timestamp: '1d ago',
    likes: 56,
    replies: 11,
    reposts: 8,
    liked: false,
    reposted: false
  },
  {
    id: '5',
    author: {
      name: 'David Park',
      avatar: null,
      avatarGradient: 'from-blue-500 to-indigo-600',
      badge: 'Side Income',
      badgeType: 'world' as const
    },
    content: 'The company research template is incredible. Spent 2 hours on one company and now I understand their business better than most of their employees probably do. Feels like a cheat code for interviews.',
    timestamp: '1d ago',
    likes: 34,
    replies: 6,
    reposts: 4,
    liked: false,
    reposted: false
  },
]

export function CommunityClient({ affiliate }: CommunityClientProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>(mockPosts)
  const [newPost, setNewPost] = useState('')
  const [isPosting, setIsPosting] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1
        }
      }
      return post
    }))
  }

  const handleRepost = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          reposted: !post.reposted,
          reposts: post.reposted ? post.reposts - 1 : post.reposts + 1
        }
      }
      return post
    }))
  }

  const handlePost = async () => {
    if (!newPost.trim()) return
    setIsPosting(true)
    
    setTimeout(() => {
      const post: Post = {
        id: Date.now().toString(),
        author: {
          name: affiliate.avatar_name || affiliate.name,
          avatar: affiliate.avatar_url,
          avatarGradient: 'from-green-500 to-emerald-600',
          badge: 'Member',
          badgeType: 'world' as const
        },
        content: newPost,
        timestamp: 'Just now',
        likes: 0,
        replies: 0,
        reposts: 0,
        liked: false,
        reposted: false
      }
      setPosts([post, ...posts])
      setNewPost('')
      setIsPosting(false)
    }, 500)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <h1 className="text-xl font-bold text-white">Community</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Log out"
            >
              <LogOut className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* New Post */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            {affiliate.avatar_url ? (
              <img
                src={affiliate.avatar_url}
                alt={affiliate.avatar_name || affiliate.name}
                className="w-12 h-12 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-semibold shrink-0">
                {(affiliate.avatar_name || affiliate.name || 'U')[0].toUpperCase()}
              </div>
            )}
            
            <div className="flex-1">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                className="w-full resize-none bg-transparent text-white placeholder-gray-500 focus:outline-none text-base"
              />
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <div className="flex gap-1">
                  <button className="p-2 text-gray-500 hover:text-green-400 hover:bg-gray-800 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-500 hover:text-green-400 hover:bg-gray-800 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                
                <button
                  onClick={handlePost}
                  disabled={!newPost.trim() || isPosting}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-all"
                >
                  {isPosting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {posts.map((post) => (
            <div 
              key={post.id}
              className={`
                bg-gray-900 border rounded-xl p-5 transition-colors
                ${post.author.badgeType === 'success'
                  ? 'border-emerald-500/30 hover:border-emerald-500/50' 
                  : 'border-gray-800 hover:border-gray-700'
                }
              `}
            >
              <div className="flex items-start gap-3">
                {post.author.avatar ? (
                  <img 
                    src={post.author.avatar} 
                    alt={post.author.name}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${post.author.avatarGradient} flex items-center justify-center text-white font-semibold shrink-0`}>
                    {post.author.name[0]}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-bold text-white">{post.author.name}</span>
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${post.author.badgeType === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-800 text-gray-400'
                      }
                    `}>
                      {post.author.badge}
                    </span>
                    <span className="text-gray-500 text-sm">· {post.timestamp}</span>
                  </div>

                  <p className="text-gray-200 text-base leading-relaxed mb-4">
                    {post.content}
                  </p>

                  <div className="flex items-center gap-8">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        post.liked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'
                      }`}
                    >
                      <svg 
                        className="w-5 h-5" 
                        fill={post.liked ? 'currentColor' : 'none'} 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{post.likes}</span>
                    </button>

                    <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{post.replies}</span>
                    </button>

                    <button
                      onClick={() => handleRepost(post.id)}
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        post.reposted ? 'text-green-400' : 'text-gray-500 hover:text-green-400'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{post.reposts}</span>
                    </button>

                    <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className="px-6 py-2 text-gray-400 hover:text-green-400 font-medium text-sm transition-colors">
            Load more posts
          </button>
        </div>
      </main>
    </div>
  )
}

