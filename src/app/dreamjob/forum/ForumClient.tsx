'use client'

import { useState } from 'react'

interface PostAuthor {
  name: string
  avatar: string | null
  avatarGradient: string
  badge: string
  badgeType: 'module' | 'hired'
}

interface Post {
  id: string
  author: PostAuthor
  content: string
  timestamp: string
  likes: number
  replies: number
  liked: boolean
}

const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      name: 'Alex Thompson',
      avatar: null,
      avatarGradient: 'from-violet-500 to-purple-600',
      badge: 'Module 5',
      badgeType: 'module'
    },
    content: 'Just finished my Trial Run Project for a fintech company. Sent it to the hiring manager and got a response within 2 hours asking for a call! This method actually works 🔥',
    timestamp: '2h ago',
    likes: 24,
    replies: 8,
    liked: false
  },
  {
    id: '2',
    author: {
      name: 'Sarah Chen',
      avatar: null,
      avatarGradient: 'from-emerald-500 to-teal-600',
      badge: 'Hired! ✓',
      badgeType: 'hired'
    },
    content: 'UPDATE: I got the job!! $95k base + equity. Started applying the Dream Job method 6 weeks ago. The "reach anyone" module changed everything - I DMed the CEO directly and he forwarded my Trial Run to the team.',
    timestamp: '5h ago',
    likes: 89,
    replies: 23,
    liked: true
  },
  {
    id: '3',
    author: {
      name: 'Marcus Johnson',
      avatar: null,
      avatarGradient: 'from-amber-500 to-orange-600',
      badge: 'Module 3',
      badgeType: 'module'
    },
    content: 'Question for everyone: How specific should I get with my target company list? I have about 50 companies but wondering if I should narrow it down more before starting outreach.',
    timestamp: '8h ago',
    likes: 12,
    replies: 15,
    liked: false
  },
  {
    id: '4',
    author: {
      name: 'Emma Rodriguez',
      avatar: null,
      avatarGradient: 'from-pink-500 to-rose-600',
      badge: 'Module 6',
      badgeType: 'module'
    },
    content: 'LinkedIn tip that worked for me: Instead of "Open to Work" banner, I changed my headline to "[Industry] professional helping [target companies] solve [specific problem]" - connection requests went up 3x',
    timestamp: '1d ago',
    likes: 56,
    replies: 11,
    liked: false
  },
  {
    id: '5',
    author: {
      name: 'David Park',
      avatar: null,
      avatarGradient: 'from-blue-500 to-indigo-600',
      badge: 'Module 4',
      badgeType: 'module'
    },
    content: 'The company research template is incredible. Spent 2 hours on one company and now I understand their business better than most of their employees probably do. Feels like a cheat code for interviews.',
    timestamp: '1d ago',
    likes: 34,
    replies: 6,
    liked: false
  },
]

interface ForumClientProps {
  userAvatarUrl: string | null
  userAvatarName: string
}

export function ForumClient({ userAvatarUrl, userAvatarName }: ForumClientProps) {
  const [posts, setPosts] = useState<Post[]>(mockPosts)
  const [newPost, setNewPost] = useState('')
  const [isPosting, setIsPosting] = useState(false)

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

  const handlePost = async () => {
    if (!newPost.trim()) return
    setIsPosting(true)
    
    setTimeout(() => {
      const post: Post = {
        id: Date.now().toString(),
        author: {
          name: userAvatarName,
          avatar: userAvatarUrl,
          avatarGradient: 'from-cyan-500 to-blue-600',
          badge: 'Module 1',
          badgeType: 'module'
        },
        content: newPost,
        timestamp: 'Just now',
        likes: 0,
        replies: 0,
        liked: false
      }
      setPosts([post, ...posts])
      setNewPost('')
      setIsPosting(false)
    }, 500)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* New Post */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 mb-6">
        <div className="flex gap-3">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt={userAvatarName}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold shrink-0">
              {userAvatarName[0]?.toUpperCase() || 'Y'}
            </div>
          )}
          
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share a win, ask a question, or help someone out..."
              rows={3}
              className="w-full resize-none bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none text-sm"
            />
            
            <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
              <div className="flex gap-1">
                <button className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              
              <button
                onClick={handlePost}
                disabled={!newPost.trim() || isPosting}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-all shadow-lg shadow-cyan-500/20"
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {posts.map((post) => (
          <div 
            key={post.id}
            className={`
              bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border transition-colors
              ${post.author.badgeType === 'hired' 
                ? 'border-emerald-500/20 hover:border-emerald-500/30' 
                : 'border-slate-700/30 hover:border-slate-600/50'
              }
            `}
          >
            <div className="flex items-start gap-3">
              {post.author.avatar ? (
                <img 
                  src={post.author.avatar} 
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${post.author.avatarGradient} flex items-center justify-center text-white font-semibold shrink-0`}>
                  {post.author.name[0]}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-200">{post.author.name}</span>
                  <span className={`
                    px-2 py-0.5 text-xs font-medium rounded-full border
                    ${post.author.badgeType === 'hired'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-700/50 text-cyan-400 border-cyan-500/20'
                    }
                  `}>
                    {post.author.badge}
                  </span>
                  <span className="text-slate-500 text-sm">· {post.timestamp}</span>
                </div>

                <p className="mt-2 text-slate-300 text-sm leading-relaxed">
                  {post.content}
                </p>

                <div className="mt-3 flex items-center gap-6">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      post.liked ? 'text-rose-400' : 'text-slate-500 hover:text-rose-400'
                    }`}
                  >
                    <svg 
                      className="w-4 h-4" 
                      fill={post.liked ? 'currentColor' : 'none'} 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{post.likes}</span>
                  </button>

                  <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{post.replies}</span>
                  </button>

                  <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-cyan-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button className="px-6 py-2 text-slate-400 hover:text-cyan-400 font-medium text-sm transition-colors">
          Load more posts
        </button>
      </div>
    </div>
  )
}

