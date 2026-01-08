'use client'

import { useState } from 'react'

interface Post {
  id: string
  author: {
    name: string
    avatar: string | null
    avatarGradient: string
    badge: string
    badgeType: 'module' | 'success'
  }
  content: string
  timestamp: string
  likes: number
  replies: number
  liked: boolean
}

interface ForumClientProps {
  userAvatarUrl: string | null
  userAvatarName: string
}

const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      name: 'Alex Thompson',
      avatar: null,
      avatarGradient: 'from-violet-500 to-purple-600',
      badge: 'Module 2',
      badgeType: 'module'
    },
    content: 'The "creating space" concept from Operational Foundations completely changed how I approach my day. Instead of filling every minute, I now intentionally leave gaps for reflection and new opportunities.',
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
      badge: 'Module 5',
      badgeType: 'module'
    },
    content: 'Just finished the procrastination destruction system. Already implemented it and my productivity has doubled. The key was understanding that procrastination is just fear in disguise.',
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
    content: 'Question: How do you know when you\'ve found your "God-given niche"? I feel like I\'m close but not quite there yet.',
    timestamp: '8h ago',
    likes: 12,
    replies: 15,
    liked: false
  },
]

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
    
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: newPost,
          category: 'Discussion'
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to create post')
      }

      const data = await res.json()
      const post: Post = {
        id: data.post.id,
        author: {
          name: data.post.user.name,
          avatar: data.post.user.avatar,
          avatarGradient: 'from-emerald-500 to-teal-600',
          badge: 'Module 1',
          badgeType: 'module'
        },
        content: data.post.content,
        timestamp: 'Just now',
        likes: data.post.likesCount || 0,
        replies: data.post.repliesCount || 0,
        liked: false
      }
      setPosts([post, ...posts])
      setNewPost('')
    } catch (error: any) {
      console.error('Error creating post:', error)
      alert(error?.message || 'Failed to create post. Please try again.')
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Modern Header */}
      <div className="mb-8 pb-6 border-b border-slate-700/50">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
          Community
        </h1>
        <p className="text-slate-400 text-lg">Share insights, ask questions, and grow together</p>
      </div>

      {/* Modern Post Composer */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 mb-8 border border-slate-700/30 shadow-2xl">
        <div className="flex gap-4">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt={userAvatarName}
              className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-2 ring-emerald-500/30 shadow-lg"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shrink-0 ring-2 ring-emerald-500/30 shadow-lg">
              {userAvatarName[0]}
            </div>
          )}
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="w-full resize-none bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 p-4 text-base leading-relaxed transition-all"
            />
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-3">
                <button className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handlePost}
                disabled={!newPost.trim() || isPosting}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105 disabled:hover:scale-100"
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Feed */}
      <div className="space-y-6">
        {posts.map((post) => (
          <article
            key={post.id}
            className="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/20 hover:border-slate-600/40 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/5"
          >
            <div className="flex gap-4">
              {/* Avatar */}
              {post.author.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-2 ring-slate-700/50 shadow-lg"
                />
              ) : (
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${post.author.avatarGradient} flex items-center justify-center text-white font-bold text-lg shrink-0 ring-2 ring-slate-700/50 shadow-lg`}>
                  {post.author.name[0]}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Author Info */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <h3 className="font-bold text-white text-lg">{post.author.name}</h3>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {post.author.badge}
                  </span>
                  <span className="text-slate-500 text-sm">·</span>
                  <time className="text-slate-500 text-sm">{post.timestamp}</time>
                </div>

                {/* Post Content */}
                <p className="text-slate-100 text-base leading-relaxed mb-5 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-8 pt-4 border-t border-slate-700/30">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 group transition-all ${
                      post.liked 
                        ? 'text-rose-400' 
                        : 'text-slate-400 hover:text-rose-400'
                    }`}
                  >
                    <div className={`p-2 rounded-xl transition-all ${
                      post.liked 
                        ? 'bg-rose-500/10' 
                        : 'group-hover:bg-rose-500/10'
                    }`}>
                      <svg 
                        className={`w-5 h-5 transition-transform ${post.liked ? 'scale-110 fill-current' : ''}`}
                        fill={post.liked ? 'currentColor' : 'none'} 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-sm">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-all group">
                    <div className="p-2 rounded-xl group-hover:bg-emerald-500/10 transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-sm">{post.replies}</span>
                  </button>
                  <button className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-all group">
                    <div className="p-2 rounded-xl group-hover:bg-emerald-500/10 transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-sm">Share</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Load More */}
      <div className="mt-10 text-center">
        <button className="px-8 py-3 text-slate-400 hover:text-emerald-400 font-semibold text-sm transition-all bg-slate-800/40 hover:bg-slate-800/60 rounded-2xl border border-slate-700/30 hover:border-emerald-500/30">
          Load more posts
        </button>
      </div>
    </div>
  )
}
