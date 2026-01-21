'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Heart, Star, MessageCircle, Image as ImageIcon, X, Send, MoreVertical, Copy, CheckCircle2, ChevronDown, Edit, Trash2, Pin, Lock, Flag, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProfileHoverCard } from '@/app/components/ProfileHoverCard'
import TripsTab from './TripsTab'
import GrindhouseTab from './GrindhouseTab'
import MeetupsTab from './MeetupsTab'

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
  pinnedAt?: string | null
  editedAt?: string | null
  locked?: boolean
  createdAt: string
  user: User & { role?: string }
  likesCount: number
  repliesCount: number
  isLiked: boolean
  lastReply: {
    date: string
    user: {
      avatar: string | null
      name: string
    }
  } | null
}

interface Reply {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  user: User
  likesCount: number
  isLiked: boolean
  replies: Reply[]
}

interface CommunityFeedProps {
  currentUser: {
    id: string
    name: string
    avatar: string | null
    role?: string
  }
  glowIntensity?: number
  searchQuery?: string
}

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

export function CommunityFeed({ currentUser, glowIntensity = 50, searchQuery = '' }: CommunityFeedProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [composerExpanded, setComposerExpanded] = useState(false)
  const [composerContent, setComposerContent] = useState('')
  
  // Auto-set composer category based on selected filter (only for valid post categories)
  const getComposerCategory = () => {
    // If selected category is a special tab (not a post category), default to first question category
    if (selectedCategory === 'Global Sends' || selectedCategory === 'Grindhouses' || selectedCategory === 'Meetups' || selectedCategory === 'All') {
      return 'dreamjob Q\'s'
    }
    // Otherwise use the selected category
    return selectedCategory
  }
  const composerCategory = getComposerCategory()
  const [composerImages, setComposerImages] = useState<string[]>([])
  const [composerVideo, setComposerVideo] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [posting, setPosting] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [replying, setReplying] = useState(false)
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editImages, setEditImages] = useState<string[]>([])
  const [showMenu, setShowMenu] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isBoldActive, setIsBoldActive] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 })
  const composerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const editableRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)

  // Category display names (shortened for UI) mapped to database values
  const categoryMap: Record<string, string> = {
    'All': 'All',
    'dreamjob Q\'s': 'dreamjob questions',
    'lifedesign Q\'s': 'lifedesign questions',
    'make money Q\'s': 'make money questions',
    'Wins': 'Wins',
    'Global Sends': 'Organize Trips',
    'Grindhouses': 'Organize Grindhouse',
    'Meetups': 'Meetups'
  }
  
  // Reverse mapping: database value -> display name
  const categoryDisplayMap: Record<string, string> = {
    'All': 'All',
    'dreamjob questions': 'dreamjob Q\'s',
    'lifedesign questions': 'lifedesign Q\'s',
    'make money questions': 'make money Q\'s',
    'Wins': 'Wins',
    'Organize Trips': 'Global Sends',
    'Organize Grindhouse': 'Grindhouses',
    'Meetups': 'Meetups'
  }
  
  const categories = ['All', 'dreamjob Q\'s', 'lifedesign Q\'s', 'make money Q\'s', 'Wins', 'Global Sends', 'Grindhouses', 'Meetups']
  
  // Helper to get database category name from display name
  const getCategoryValue = (displayName: string) => categoryMap[displayName] || displayName
  // Helper to get display name from database category name
  const getCategoryDisplay = (dbValue: string) => categoryDisplayMap[dbValue] || dbValue

  // Bold button is a toggle - stays on until clicked again
  // No need to check cursor position, just track toggle state

  // Render HTML content (for posts with HTML formatting)
  const renderContent = (content: string) => {
    // Check if content contains HTML tags
    if (content && (content.includes('<strong>') || content.includes('<b>') || content.includes('<strong'))) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />
    }
    // Fallback: check for markdown bold (**text**)
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
    // Plain text
    return <span>{content}</span>
  }

  useEffect(() => {
    // Don't fetch posts when Global Sends, Grindhouses, or Meetups category is selected (shows tabs instead)
    if (selectedCategory !== 'Global Sends' && selectedCategory !== 'Grindhouses' && selectedCategory !== 'Meetups') {
      fetchPosts()
    }
  }, [selectedCategory, searchQuery])

  // Sync contentEditable with state when composer is expanded
  useEffect(() => {
    if (composerExpanded && editableRef.current && !editableRef.current.textContent) {
      editableRef.current.innerHTML = composerContent || ''
    }
  }, [composerExpanded])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(event.target as Node)) {
        if (!composerContent && composerImages.length === 0 && !composerVideo) {
          setComposerExpanded(false)
        }
      }
    }

    if (composerExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [composerExpanded, composerContent, composerImages, composerVideo])

  useEffect(() => {
    if (selectedPost) {
      fetchReplies(selectedPost.id)
    }
  }, [selectedPost])

  // Update emoji picker position on scroll/resize
  useEffect(() => {
    if (!showEmojiPicker || !emojiButtonRef.current) return

    const updatePosition = () => {
      if (emojiButtonRef.current) {
        const rect = emojiButtonRef.current.getBoundingClientRect()
        setEmojiPickerPosition({
          top: rect.bottom + 8,
          left: rect.left
        })
      }
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [showEmojiPicker])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPost) {
        setSelectedPost(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedPost])

  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'All') {
        // Map display name to database category name
        params.append('category', getCategoryValue(selectedCategory))
      }
      if (searchQuery && searchQuery.trim()) {
        params.append('search', searchQuery.trim())
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

  const fetchReplies = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/replies`)
      const data = await res.json()
      setReplies(data.replies || [])
    } catch (error) {
      console.error('Error fetching replies:', error)
    }
  }

  const handlePost = async () => {
    // Check if content has actual text (strip HTML tags for validation)
    const textContent = editableRef.current?.textContent || composerContent.replace(/<[^>]*>/g, '').trim()
    if (!textContent && composerImages.length === 0 && !composerVideo) return

    setPosting(true)
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '', // Empty title - will be auto-generated from content
          content: composerContent,
          category: getCategoryValue(composerCategory), // Map display name to database value
          imageUrls: composerImages,
          videoUrl: composerVideo || null // Ensure null instead of empty string
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Failed to create post')
      }

      const data = await res.json()
      
      // Optimistic update
      setPosts([data.post, ...posts])
      setComposerContent('')
      if (editableRef.current) {
        editableRef.current.innerHTML = ''
      }
      setComposerImages([])
      setComposerVideo(null)
      setComposerExpanded(false)
    } catch (error: any) {
      console.error('Error creating post:', error)
      alert(error?.message || 'Failed to create post. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    // Optimistic update
    const updatedPosts = posts.map(p =>
      p.id === postId
        ? {
            ...p,
            isLiked: !p.isLiked,
            likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1
          }
        : p
    )
    setPosts(updatedPosts)

    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST'
      })
      const data = await res.json()

      // Update with server response
      setPosts(updatedPosts.map(p =>
        p.id === postId
          ? { ...p, isLiked: data.liked, likesCount: data.likesCount }
          : p
      ))
    } catch (error) {
      // Rollback on error
      setPosts(posts)
      console.error('Error toggling like:', error)
    }
  }

  const handleReplyLike = async (replyId: string, isNested: boolean = false) => {
    // Find the reply in the replies array
    const findAndUpdateReply = (replyList: Reply[], id: string): Reply[] => {
      return replyList.map(reply => {
        if (reply.id === id) {
          return {
            ...reply,
            isLiked: !reply.isLiked,
            likesCount: reply.isLiked ? reply.likesCount - 1 : reply.likesCount + 1
          }
        }
        if (reply.replies && reply.replies.length > 0) {
          return {
            ...reply,
            replies: findAndUpdateReply(reply.replies, id)
          }
        }
        return reply
      })
    }

    // Optimistic update
    const updatedReplies = findAndUpdateReply(replies, replyId)
    setReplies(updatedReplies)

    try {
      const res = await fetch(`/api/community/replies/${replyId}/like`, {
        method: 'POST'
      })
      const data = await res.json()

      // Update with server response
      const updateWithServerData = (replyList: Reply[], id: string): Reply[] => {
        return replyList.map(reply => {
          if (reply.id === id) {
            return {
              ...reply,
              isLiked: data.liked,
              likesCount: data.likesCount
            }
          }
          if (reply.replies && reply.replies.length > 0) {
            return {
              ...reply,
              replies: updateWithServerData(reply.replies, id)
            }
          }
          return reply
        })
      }
      setReplies(updateWithServerData(replies, replyId))
    } catch (error) {
      // Rollback on error
      setReplies(replies)
      console.error('Error toggling reply like:', error)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages: string[] = []
    let newVideo: string | null = null

    for (const file of Array.from(files)) {
      // Check if it's a video
      if (file.type.startsWith('video/')) {
        if (file.size > 50 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum 50MB per video.`)
          continue
        }
        const formData = new FormData()
        formData.append('file', file)
        try {
          const res = await fetch('/api/community/upload', {
            method: 'POST',
            body: formData
          })
          const data = await res.json()
          newVideo = data.url
          setComposerVideo(newVideo)
        } catch (error) {
          console.error('Error uploading video:', error)
          alert('Failed to upload video')
        }
      } else {
        // It's an image
        if (composerImages.length + newImages.length >= 4) {
          alert('Maximum 4 images allowed')
          continue
        }
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} is too large. Maximum 10MB per image.`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)

        try {
          const res = await fetch('/api/community/upload', {
            method: 'POST',
            body: formData
          })
          const data = await res.json()
          newImages.push(data.url)
        } catch (error) {
          console.error('Error uploading image:', error)
        }
      }
    }

    if (newImages.length > 0) {
      setComposerImages([...composerImages, ...newImages])
    }
  }

  const handleReply = async (postId: string, parentReplyId?: string) => {
    if (!replyContent.trim()) return

    setReplying(true)
    try {
      const res = await fetch(`/api/community/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          parentReplyId: parentReplyId || null
        })
      })

      if (!res.ok) throw new Error('Failed to create reply')

      const data = await res.json()
      
      // Optimistic update
      if (parentReplyId) {
        setReplies(replies.map(reply => {
          if (reply.id === parentReplyId) {
            return {
              ...reply,
              replies: [...(reply.replies || []), data.reply]
            }
          }
          return reply
        }))
      } else {
        setReplies([...replies, data.reply])
      }

      // Update post replies count
      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, repliesCount: p.repliesCount + 1 }
          : p
      ))

      setReplyContent('')
    } catch (error) {
      console.error('Error creating reply:', error)
      alert('Failed to create reply. Please try again.')
    } finally {
      setReplying(false)
    }
  }

  const copyPostLink = (postId: string) => {
    const url = `${window.location.origin}/dashboard?post=${postId}`
    navigator.clipboard.writeText(url)
    setCopiedPostId(postId)
    setTimeout(() => setCopiedPostId(null), 2000)
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return dateString
    }
  }

  const isOwner = (post: Post) => post.user.id === currentUser.id
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'moderator'

  const handleEditPost = (post: Post) => {
    setEditingPost(post.id)
    setEditContent(post.content)
    setEditCategory(post.category)
    setEditImages([...post.imageUrls])
    setShowMenu(null)
  }

  const handleSaveEdit = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          content: editContent,
          category: editCategory,
          imageUrls: editImages
        })
      })

      if (!res.ok) throw new Error('Failed to update post')

      const data = await res.json()
      
      setPosts(posts.map(p =>
        p.id === postId
          ? {
              ...p,
              content: editContent,
              category: editCategory,
              imageUrls: editImages,
              editedAt: data.post.edited_at
            }
          : p
      ))

      setEditingPost(null)
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Failed to update post. Please try again.')
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' })
      })

      if (!res.ok) throw new Error('Failed to delete post')

      setPosts(posts.filter(p => p.id !== postId))
      setShowDeleteConfirm(null)
      setShowMenu(null)
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post. Please try again.')
    }
  }

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
              pinned: data.post.pinned,
              locked: data.post.locked,
              hidden: data.post.hidden
            }
          : p
      ))

      setShowMenu(null)
    } catch (error) {
      console.error('Error moderating post:', error)
      alert('Failed to moderate post. Please try again.')
    }
  }

  const handleReport = async (postId: string) => {
    if (!reportReason) {
      alert('Please select a reason')
      return
    }

    try {
      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          reason: reportReason,
          details: reportDetails
        })
      })

      if (!res.ok) throw new Error('Failed to submit report')

      alert('Report submitted. Thank you for helping keep the community safe.')
      setShowReportModal(null)
      setReportReason('')
      setReportDetails('')
      setShowMenu(null)
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Failed to submit report. Please try again.')
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(null)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full community-full-width" data-dashboard-content style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', margin: 0, padding: 0 }}>
      {/* Main Feed */}
      <div className="flex-1 overflow-y-auto w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', margin: 0, padding: 0 }}>
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4" style={{ boxSizing: 'border-box' }}>
          {/* Post Composer */}
          <div
            ref={composerRef}
            className={`rounded-2xl transition-all duration-150 w-full ${
              composerExpanded ? 'shadow-lg' : ''
            }`}
            style={{ 
              width: '100%', 
              maxWidth: '100%',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div className="p-4">
              <div className="flex gap-3">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full shrink-0 border-2"
                    style={{
                      borderColor: 'rgba(34,211,238,0.5)',
                      boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                    }}
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0 border-2"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                      borderColor: 'rgba(34,211,238,0.5)',
                      boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                    }}
                  >
                    {currentUser.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  {!composerExpanded ? (
                    <input
                      type="text"
                      placeholder="Write something..."
                      onFocus={() => setComposerExpanded(true)}
                      className="w-full px-4 py-2 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-white placeholder-[rgba(255,255,255,0.5)]"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <div
                          ref={editableRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            const html = e.currentTarget.innerHTML
                            setComposerContent(html)
                            // Auto-resize
                            e.currentTarget.style.height = 'auto'
                            e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 300)}px`
                          }}
                          onKeyDown={(e) => {
                            // Ctrl/Cmd + B for bold
                            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                              e.preventDefault()
                              document.execCommand('bold', false)
                              setIsBoldActive(!isBoldActive)
                              // Update state after command
                              setTimeout(() => {
                                if (editableRef.current) {
                                  setComposerContent(editableRef.current.innerHTML)
                                }
                              }, 0)
                            }
                          }}
                          data-placeholder="What's on your mind?"
                          className="w-full px-4 py-2 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-white resize-none overflow-y-auto"
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            minHeight: '80px',
                            maxHeight: '300px',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word'
                          }}
                        />
                        <style jsx>{`
                          div[contenteditable][data-placeholder]:empty:before {
                            content: attr(data-placeholder);
                            color: rgba(255,255,255,0.5);
                            pointer-events: none;
                          }
                        `}</style>
                      </div>
                      {composerImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {composerImages.map((url, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={url}
                                alt={`Upload ${idx + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => setComposerImages(composerImages.filter((_, i) => i !== idx))}
                                className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.1)] relative">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (editableRef.current) {
                                editableRef.current.focus()
                                document.execCommand('bold', false)
                                setIsBoldActive(!isBoldActive)
                                // Update state with new HTML
                                setTimeout(() => {
                                  if (editableRef.current) {
                                    setComposerContent(editableRef.current.innerHTML)
                                  }
                                }, 0)
                              }
                            }}
                            className={`p-2 rounded-xl transition-all duration-200 ${
                              isBoldActive 
                                ? 'bg-yellow-400/20 border-2 border-yellow-400/50' 
                                : 'hover:bg-[rgba(255,255,255,0.1)] border-2 border-transparent'
                            }`}
                            title="Bold (Ctrl+B) - Toggle"
                            style={isBoldActive ? {
                              boxShadow: glowShadow('0 0 15px rgba(253,224,71,0.6), 0 0 30px rgba(253,224,71,0.3)', glowIntensity)
                            } : {}}
                          >
                            <span className={`font-bold text-sm transition-colors ${
                              isBoldActive 
                                ? 'text-yellow-400' 
                                : 'text-[rgba(255,255,255,0.8)]'
                            }`}>B</span>
                          </button>
                          <button
                            ref={emojiButtonRef}
                            onClick={() => {
                              if (!showEmojiPicker && emojiButtonRef.current) {
                                const rect = emojiButtonRef.current.getBoundingClientRect()
                                setEmojiPickerPosition({
                                  top: rect.bottom + 8,
                                  left: rect.left
                                })
                              }
                              setShowEmojiPicker(!showEmojiPicker)
                            }}
                            className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-xl transition-colors"
                            title="Emoji"
                          >
                            <span className="text-[rgba(255,255,255,0.8)] text-lg">😀</span>
                          </button>
                          {showEmojiPicker && typeof document !== 'undefined' && createPortal(
                            <>
                              {/* Backdrop */}
                              <div
                                className="fixed inset-0 z-[9998]"
                                onClick={() => setShowEmojiPicker(false)}
                              />
                              {/* Emoji Picker */}
                              <div 
                                className="emoji-picker-scroll fixed bg-[rgba(26,26,46,0.95)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.1)] rounded-xl p-1.5 z-[9999] shadow-2xl" 
                                style={{ 
                                  top: `${emojiPickerPosition.top}px`,
                                  left: `${emojiPickerPosition.left}px`,
                                  width: '120px',
                                  maxHeight: '140px',
                                  overflowY: 'auto',
                                  overflowX: 'hidden'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                              <div className="grid grid-cols-4 gap-1">
                                {[
                                  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
                                  '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
                                  '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
                                  '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟',
                                  '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
                                  '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡',
                                  '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
                                  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
                                  '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
                                  '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅',
                                  '👄', '💋', '🩸', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
                                  '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️',
                                  '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️',
                                  '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️',
                                  '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫',
                                  '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚',
                                  '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇',
                                  '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾',
                                  '🔥', '⭐', '🌟', '✨', '💫', '💥', '💢', '💯', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉',
                                  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳', '🏹',
                                  '🎣', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸', '🤺', '⛹️',
                                  '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🚣', '🧗', '🚵', '🚴', '🏆', '🎖️', '🏅', '🎗️', '🎫', '🎟️',
                                  '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻',
                                  '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒',
                                  '🚐', '🛻', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡',
                                  '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫',
                                  '🛬', '🛩️', '💺', '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🛎️', '🧳', '⌛', '⏳', '⌚', '⏰',
                                  '⏱️', '⏲️', '🕰️', '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕',
                                  '🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦', '🌑', '🌒', '🌓', '🌔', '🌕',
                                  '🌖', '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '🌝', '🌞', '⭐', '🌟', '💫', '✨', '☄️', '💥', '🔥',
                                  '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '⚡', '☔', '❄️', '☃️', '⛄', '🌨️', '🌬️',
                                  '💨', '💧', '💦', '☂️', '☔', '☂️', '🌊', '🌫️', '🌈', '☂️', '☔', '☂️', '🌊', '🌫️', '🌈'
                                ].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      if (editableRef.current) {
                                        editableRef.current.focus()
                                        document.execCommand('insertText', false, emoji)
                                        setTimeout(() => {
                                          if (editableRef.current) {
                                            setComposerContent(editableRef.current.innerHTML)
                                          }
                                        }, 0)
                                      }
                                      setShowEmojiPicker(false)
                                    }}
                                    className="text-base hover:scale-125 transition-transform p-0.5"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                            </>,
                            document.body
                          )}
                          <label className="cursor-pointer">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                            <div className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-xl transition-colors">
                              <ImageIcon className="w-5 h-5 text-[rgba(255,255,255,0.8)]" />
                            </div>
                          </label>
                          {/* Category is auto-set based on selected filter */}
                          <div className="px-3 py-1.5 rounded-xl text-white text-sm flex items-center gap-2" style={{
                            background: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)'
                          }}>
                            <span className="text-[rgba(255,255,255,0.7)] text-xs">Posting to:</span>
                            <span className="font-medium">{composerCategory}</span>
                          </div>
                        </div>
                        <button
                          onClick={handlePost}
                          disabled={posting}
                          className="px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                          style={!posting ? {
                            background: 'linear-gradient(135deg, #fde047, #facc15)',
                            color: '#0f0f1a',
                            boxShadow: glowShadow('0 0 20px rgba(253,224,71,0.7), 0 0 40px rgba(253,224,71,0.5), 0 8px 30px rgba(253,224,71,0.4)', glowIntensity)
                          } : {
                            background: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.5)'
                          }}
                        >
                          {posting ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="sticky top-0 rounded-2xl p-2 flex items-center justify-start z-10 w-full backdrop-blur-[20px]" style={{ 
            width: '100%', 
            maxWidth: '100%',
            background: 'rgba(26,26,46,0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div className="flex gap-2 overflow-x-auto flex-nowrap" style={{ scrollbarWidth: 'thin', minWidth: 'max-content', flexWrap: 'nowrap', width: '100%' }}>
              {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
                      selectedCategory === cat
                        ? 'text-white'
                        : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
                    }`}
                    style={selectedCategory === cat ? {
                      background: 'linear-gradient(135deg, #fde047, #facc15)',
                      color: '#0f0f1a',
                      boxShadow: glowShadow('0 0 20px rgba(253,224,71,0.7), 0 0 40px rgba(253,224,71,0.5), 0 8px 30px rgba(253,224,71,0.4)', glowIntensity)
                    } : {}}
                  >
                    {cat}
                  </button>
              ))}
            </div>
          </div>

          {/* Show TripsTab when Global Sends category is selected */}
          {selectedCategory === 'Global Sends' ? (
            <TripsTab 
              affiliate={{
                id: currentUser.id,
                name: currentUser.name,
                avatar_name: currentUser.name,
                avatar_url: currentUser.avatar
              }}
              glowIntensity={glowIntensity}
            />
          ) : selectedCategory === 'Grindhouses' ? (
            <GrindhouseTab 
              affiliate={{
                id: currentUser.id,
                name: currentUser.name,
                avatar_name: currentUser.name,
                avatar_url: currentUser.avatar
              }}
              glowIntensity={glowIntensity}
            />
          ) : selectedCategory === 'Meetups' ? (
            <MeetupsTab 
              affiliate={{
                id: currentUser.id,
                name: currentUser.name,
                avatar_name: currentUser.name,
                avatar_url: currentUser.avatar
              }}
              glowIntensity={glowIntensity}
            />
          ) : (
            <>
              {/* Posts Feed */}
              {posts.length === 0 ? (
            <div className="rounded-2xl p-12 text-center w-full backdrop-blur-[10px]" style={{ 
              width: '100%', 
              maxWidth: '100%',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <p className="text-[rgba(255,255,255,0.6)] mb-4">Be the first to start a conversation</p>
              <button
                onClick={() => setComposerExpanded(true)}
                className="px-6 py-2 text-white rounded-xl font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, #fde047, #facc15)',
                  color: '#0f0f1a',
                  boxShadow: glowShadow('0 0 20px rgba(253,224,71,0.7), 0 0 40px rgba(253,224,71,0.5), 0 8px 30px rgba(253,224,71,0.4)', glowIntensity)
                }}
              >
                Create Post
              </button>
            </div>
          ) : (
            <div className="space-y-4 w-full" style={{ width: '100%', maxWidth: '100%' }}>
              {posts.map(post => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="rounded-2xl p-6 cursor-pointer hover:-translate-y-0.5 transition-all duration-150 w-full"
                  style={{ 
                    width: '100%', 
                    maxWidth: '100%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 50%, #22d3ee 100%)',
                    boxShadow: glowShadow('0 0 30px rgba(34,211,238,0.5), 0 0 60px rgba(34,211,238,0.3), 0 20px 40px rgba(14,165,233,0.25)', glowIntensity)
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
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
                              className="w-10 h-10 rounded-full border-2 cursor-pointer"
                              style={{
                                borderColor: 'rgba(34,211,238,0.5)',
                                boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                              }}
                            />
                          ) : (
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold border-2 cursor-pointer"
                              style={{
                                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                                borderColor: 'rgba(34,211,238,0.5)',
                                boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                              }}
                            >
                              {post.user.name[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold text-white hover:text-cyan-400 transition-colors cursor-pointer">{post.user.name}</div>
                              <div className="text-sm text-[rgba(255,255,255,0.6)]">{formatTime(post.createdAt)}</div>
                            </div>
                            {post.user.id !== currentUser.id && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
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
                                className="p-1.5 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                                title={`Message ${post.user.name}`}
                              >
                                <MessageCircle className="w-4 h-4 text-cyan-400" />
                              </button>
                            )}
                          </div>
                        </Link>
                      </ProfileHoverCard>
                      </div>
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={post.category === 'Wins' ? {
                          background: 'linear-gradient(135deg, #fde047, #facc15)',
                          boxShadow: glowShadow('0 0 15px rgba(253,224,71,0.8), 0 0 30px rgba(253,224,71,0.5)', glowIntensity),
                          color: '#0f0f1a'
                        } : {
                          background: 'rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(10px)'
                        }}
                      >
                        {getCategoryDisplay(post.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.pinned && (
                        <span className="text-xs text-slate-500">📌</span>
                      )}
                      <div className="relative" ref={menuRef}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMenu(showMenu === post.id ? null : post.id)
                          }}
                          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-500" />
                        </button>
                        {showMenu === post.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                            {isOwner(post) && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditPost(post)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowDeleteConfirm(post.id)
                                    setShowMenu(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <div className="border-t border-slate-200 my-1" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleModeratePost(post.id, post.pinned ? 'unpin' : 'pin')
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Pin className="w-4 h-4" />
                                  {post.pinned ? 'Unpin' : 'Pin'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleModeratePost(post.id, post.locked ? 'unlock' : 'lock')
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Lock className="w-4 h-4" />
                                  {post.locked ? 'Unlock' : 'Lock'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleModeratePost(post.id, 'delete')
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete (Admin)
                                </button>
                              </>
                            )}
                            {!isOwner(post) && (
                              <>
                                <div className="border-t border-slate-200 my-1" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowReportModal(post.id)
                                    setShowMenu(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                                >
                                  <Flag className="w-4 h-4" />
                                  Report
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingPost === post.id ? (
                    <div className="space-y-3 mb-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-slate-900 resize-none"
                        rows={4}
                        maxLength={2000}
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-slate-900 text-sm"
                      >
                        {categories.filter(c => c !== 'All').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(post.id)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPost(null)}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-white mb-4 line-clamp-3 whitespace-pre-wrap">
                        {renderContent(post.content)}
                      </div>
                    </>
                  )}

                  {post.videoUrl && (
                    <div className="mb-4">
                      <video
                        src={post.videoUrl}
                        controls
                        className="w-full rounded-lg"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                  )}

                  {post.imageUrls.length > 0 && (
                    <div className={`mb-4 grid gap-2 ${
                      post.imageUrls.length === 1 ? 'grid-cols-1' :
                      post.imageUrls.length === 2 ? 'grid-cols-2' :
                      'grid-cols-2'
                    }`}>
                      {post.imageUrls.slice(0, 4).map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Post image ${idx + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-3 border-t border-slate-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLike(post.id)
                      }}
                      className={`flex items-center gap-2 text-sm transition-all ${
                        post.isLiked
                          ? 'text-yellow-400'
                          : 'text-slate-500 hover:text-yellow-400'
                      }`}
                      style={post.isLiked ? {
                        textShadow: glowShadow('0 0 10px rgba(253,224,71,0.8), 0 0 20px rgba(253,224,71,0.6)', glowIntensity),
                        filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.8))'
                      } : {}}
                    >
                      <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} style={post.isLiked ? {
                        filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.8)) drop-shadow(0 0 16px rgba(253,224,71,0.6))'
                      } : {}} />
                      {post.likesCount}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPost(post)
                      }}
                      className="flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {post.repliesCount}
                    </button>
                    {post.lastReply && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProfileHoverCard
                          userId={(post.lastReply.user as any).id || ''}
                          userName={post.lastReply.user.name}
                          userAvatar={post.lastReply.user.avatar}
                        >
                          <Link href={`/profile/${(post.lastReply.user as any).id || ''}`} className="flex items-center gap-2 ml-auto text-xs text-slate-500" onClick={(e) => e.stopPropagation()}>
                            <div className="flex -space-x-2">
                              {post.lastReply.user.avatar ? (
                                <img
                                  src={post.lastReply.user.avatar}
                                  alt={post.lastReply.user.name}
                                  className="w-6 h-6 rounded-full border-2 border-white cursor-pointer"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center text-white text-xs cursor-pointer">
                                  {post.lastReply.user.name[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="hover:text-cyan-400 transition-colors cursor-pointer">Last comment {formatTime(post.lastReply.date)}</span>
                          </Link>
                        </ProfileHoverCard>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Expanded Post Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-[#0f0f1a] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{
              boxShadow: glowShadow('0 0 30px rgba(34,211,238,0.5), 0 0 60px rgba(34,211,238,0.3), 0 20px 40px rgba(14,165,233,0.25)', glowIntensity)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.1)]">
              <h2 className="text-xl font-bold text-white">Post</h2>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[rgba(255,255,255,0.6)]" />
              </button>
            </div>

            {/* Post Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center gap-3 mb-4">
                <ProfileHoverCard
                  userId={selectedPost.user.id}
                  userName={selectedPost.user.name}
                  userAvatar={selectedPost.user.avatar}
                  onChatClick={() => {
                    const currentPath = window.location.pathname
                    if (currentPath === '/dashboard') {
                      window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: selectedPost.user.id } }))
                    } else {
                      router.replace('/dashboard')
                      requestAnimationFrame(() => {
                        window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: selectedPost.user.id } }))
                      })
                    }
                  }}
                >
                  <Link href={`/profile/${selectedPost.user.id}`} className="flex items-center gap-3">
                    {selectedPost.user.avatar ? (
                      <img
                        src={selectedPost.user.avatar}
                        alt={selectedPost.user.name}
                        className="w-12 h-12 rounded-full border-2 cursor-pointer"
                        style={{
                          borderColor: 'rgba(34,211,238,0.5)',
                          boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                        }}
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold border-2 cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                          borderColor: 'rgba(34,211,238,0.5)',
                          boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                        }}
                      >
                        {selectedPost.user.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-white hover:text-cyan-400 transition-colors cursor-pointer">{selectedPost.user.name}</div>
                      <div className="text-sm text-[rgba(255,255,255,0.6)]">{formatTime(selectedPost.createdAt)}</div>
                    </div>
                  </Link>
                </ProfileHoverCard>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedPost.category === 'Wins' ? 'bg-green-500/20 text-green-400' :
                  selectedPost.category === 'dreamjob questions' ? 'bg-amber-500/20 text-amber-400' :
                  selectedPost.category === 'lifedesign questions' ? 'bg-amber-500/20 text-amber-400' :
                  selectedPost.category === 'make money questions' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)]'
                }`}>
                  {getCategoryDisplay(selectedPost.category)}
                </span>
              </div>

              <div className="text-[rgba(255,255,255,0.8)] mb-4 whitespace-pre-wrap">
                {renderContent(selectedPost.content)}
              </div>

              {selectedPost.videoUrl && (
                <div className="mb-4">
                  <video
                    src={selectedPost.videoUrl}
                    controls
                    className="w-full rounded-lg"
                    style={{ maxHeight: '500px' }}
                  />
                </div>
              )}

              {selectedPost.imageUrls.length > 0 && (
                <div className={`mb-6 grid gap-2 ${
                  selectedPost.imageUrls.length === 1 ? 'grid-cols-1' :
                  selectedPost.imageUrls.length === 2 ? 'grid-cols-2' :
                  'grid-cols-2'
                }`}>
                  {selectedPost.imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Post image ${idx + 1}`}
                      className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-6 py-4 border-t border-[rgba(255,255,255,0.1)]">
                <button
                  onClick={() => handleLike(selectedPost.id)}
                  className={`flex items-center gap-2 transition-all ${
                    selectedPost.isLiked
                      ? 'text-yellow-400'
                      : 'text-[rgba(255,255,255,0.6)] hover:text-yellow-400'
                  }`}
                  style={selectedPost.isLiked ? {
                    textShadow: glowShadow('0 0 10px rgba(253,224,71,0.8), 0 0 20px rgba(253,224,71,0.6)', glowIntensity),
                    filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.8))'
                  } : {}}
                >
                  <Heart className={`w-5 h-5 ${selectedPost.isLiked ? 'fill-current' : ''}`} style={selectedPost.isLiked ? {
                    filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.8)) drop-shadow(0 0 16px rgba(253,224,71,0.6))'
                  } : {}} />
                  {selectedPost.likesCount}
                </button>
              </div>

              {/* Replies Section */}
              <div className="border-t border-[rgba(255,255,255,0.1)] pt-6">
                <h4 className="font-semibold text-white mb-4">
                  Replies {replies.length > 0 && `(${replies.length})`}
                </h4>

                {replies.length === 0 ? (
                  <div className="text-center py-8 text-[rgba(255,255,255,0.6)]">
                    No replies yet. Start the discussion!
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {replies.map(reply => (
                      <div key={reply.id} className="space-y-3">
                        <div className="flex items-start gap-3">
                          <ProfileHoverCard
                            userId={reply.user.id}
                            userName={reply.user.name}
                            userAvatar={reply.user.avatar}
                            onChatClick={() => {
                              const currentPath = window.location.pathname
                              if (currentPath === '/dashboard') {
                                window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: reply.user.id } }))
                              } else {
                                router.replace('/dashboard')
                                requestAnimationFrame(() => {
                                  window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: reply.user.id } }))
                                })
                              }
                            }}
                          >
                            <Link href={`/profile/${reply.user.id}`}>
                              {reply.user.avatar ? (
                                <img
                                  src={reply.user.avatar}
                                  alt={reply.user.name}
                                  className="w-8 h-8 rounded-full shrink-0 border-2 cursor-pointer"
                                  style={{
                                    borderColor: 'rgba(34,211,238,0.5)',
                                    boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                                  }}
                                />
                              ) : (
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 border-2 cursor-pointer"
                                  style={{
                                    background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                                    borderColor: 'rgba(34,211,238,0.5)',
                                    boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                                  }}
                                >
                                  {reply.user.name[0]?.toUpperCase()}
                                </div>
                              )}
                            </Link>
                          </ProfileHoverCard>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <ProfileHoverCard
                                userId={reply.user.id}
                                userName={reply.user.name}
                                userAvatar={reply.user.avatar}
                                onChatClick={() => {
                                  window.location.href = `/dashboard?openDM=${reply.user.id}`
                                }}
                              >
                                <Link href={`/profile/${reply.user.id}`}>
                                  <span className="font-semibold text-white hover:text-cyan-400 transition-colors cursor-pointer">{reply.user.name}</span>
                                </Link>
                              </ProfileHoverCard>
                              <span className="text-sm text-[rgba(255,255,255,0.6)]">{formatTime(reply.createdAt)}</span>
                            </div>
                            <p className="text-[rgba(255,255,255,0.8)] mb-2">{reply.content}</p>
                            {reply.imageUrl && (
                              <img
                                src={reply.imageUrl}
                                alt="Reply image"
                                className="w-full max-w-md h-48 object-cover rounded-lg mb-2"
                              />
                            )}
                            <div className="flex items-center gap-4">
                              <button className="text-sm text-[rgba(255,255,255,0.6)] hover:text-cyan-400 transition-colors">
                                Reply
                              </button>
                              <button 
                                onClick={() => handleReplyLike(reply.id)}
                                className="flex items-center gap-1 text-sm text-[rgba(255,255,255,0.6)] hover:text-yellow-400 transition-colors"
                              >
                                <Heart className={`w-4 h-4 ${reply.isLiked ? 'fill-current text-yellow-400' : ''}`} style={reply.isLiked ? {
                                  filter: 'drop-shadow(0 0 6px rgba(253,224,71,0.8)) drop-shadow(0 0 12px rgba(253,224,71,0.6))'
                                } : {}} />
                                {reply.likesCount}
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Nested replies */}
                        {reply.replies && reply.replies.length > 0 && (
                          <div className="ml-11 space-y-3 pl-4 border-l-2 border-[rgba(255,255,255,0.1)]">
                            {reply.replies.map(nestedReply => (
                              <div key={nestedReply.id} className="flex items-start gap-3">
                                <ProfileHoverCard
                                  userId={nestedReply.user.id}
                                  userName={nestedReply.user.name}
                                  userAvatar={nestedReply.user.avatar}
                                  onChatClick={() => {
                                    const currentPath = window.location.pathname
                                    if (currentPath === '/dashboard') {
                                      window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: nestedReply.user.id } }))
                                    } else {
                                      router.replace('/dashboard')
                                      requestAnimationFrame(() => {
                                        window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: nestedReply.user.id } }))
                                      })
                                    }
                                  }}
                                >
                                  <Link href={`/profile/${nestedReply.user.id}`}>
                                    {nestedReply.user.avatar ? (
                                      <img
                                        src={nestedReply.user.avatar}
                                        alt={nestedReply.user.name}
                                        className="w-6 h-6 rounded-full shrink-0 border-2 cursor-pointer"
                                        style={{
                                          borderColor: 'rgba(34,211,238,0.5)',
                                          boxShadow: glowShadow('0 0 10px rgba(34,211,238,0.7), 0 0 20px rgba(34,211,238,0.4)', glowIntensity)
                                        }}
                                      />
                                    ) : (
                                      <div 
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 border-2 cursor-pointer"
                                        style={{
                                          background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                                          borderColor: 'rgba(34,211,238,0.5)',
                                          boxShadow: glowShadow('0 0 10px rgba(34,211,238,0.7), 0 0 20px rgba(34,211,238,0.4)', glowIntensity)
                                        }}
                                      >
                                        {nestedReply.user.name[0]?.toUpperCase()}
                                      </div>
                                    )}
                                  </Link>
                                </ProfileHoverCard>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <ProfileHoverCard
                                      userId={nestedReply.user.id}
                                      userName={nestedReply.user.name}
                                      userAvatar={nestedReply.user.avatar}
                                      onChatClick={() => {
                                        window.location.href = `/dashboard?openDM=${nestedReply.user.id}`
                                      }}
                                    >
                                      <Link href={`/profile/${nestedReply.user.id}`}>
                                        <span className="font-semibold text-white text-sm hover:text-cyan-400 transition-colors cursor-pointer">{nestedReply.user.name}</span>
                                      </Link>
                                    </ProfileHoverCard>
                                    <span className="text-xs text-[rgba(255,255,255,0.6)]">{formatTime(nestedReply.createdAt)}</span>
                                  </div>
                                  <p className="text-[rgba(255,255,255,0.8)] text-sm mb-1">{nestedReply.content}</p>
                                  <button 
                                    onClick={() => handleReplyLike(nestedReply.id)}
                                    className="flex items-center gap-1 text-xs text-[rgba(255,255,255,0.6)] hover:text-yellow-400 transition-colors"
                                  >
                                    <Heart className={`w-3 h-3 ${nestedReply.isLiked ? 'fill-current text-yellow-400' : ''}`} style={nestedReply.isLiked ? {
                                      filter: 'drop-shadow(0 0 4px rgba(253,224,71,0.8)) drop-shadow(0 0 8px rgba(253,224,71,0.6))'
                                    } : {}} />
                                    {nestedReply.likesCount}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Composer */}
                <div className="sticky bottom-0 bg-[#0f0f1a] border-t border-[rgba(255,255,255,0.1)] p-4">
                  <div className="flex items-start gap-3">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full shrink-0 border-2"
                        style={{
                          borderColor: 'rgba(34,211,238,0.5)',
                          boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                        }}
                      />
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 border-2"
                        style={{
                          background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                          borderColor: 'rgba(34,211,238,0.5)',
                          boxShadow: glowShadow('0 0 15px rgba(34,211,238,0.7), 0 0 30px rgba(34,211,238,0.4)', glowIntensity)
                        }}
                      >
                        {currentUser.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 flex items-end gap-2">
                      <textarea
                        value={replyContent}
                        onChange={(e) => {
                          setReplyContent(e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`
                        }}
                        placeholder="Write a reply..."
                        className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-[rgba(255,255,255,0.5)] resize-none"
                        rows={1}
                        maxLength={500}
                        style={{ minHeight: '40px', maxHeight: '100px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleReply(selectedPost.id)
                          }
                        }}
                      />
                      <button
                        onClick={() => handleReply(selectedPost.id)}
                        disabled={!replyContent.trim() || replying}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:bg-[rgba(255,255,255,0.1)] disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                        style={!replying && replyContent.trim() ? {
                          boxShadow: glowShadow('0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.5), 0 8px 30px rgba(34,211,238,0.4)', glowIntensity)
                        } : {}}
                      >
                        {replying ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Post?</h3>
            <p className="text-slate-600 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePost(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowReportModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Report Post</h3>
            <p className="text-slate-600 mb-4">Why are you reporting this?</p>
            <div className="space-y-3 mb-4">
              {['spam', 'harassment', 'inappropriate', 'other'].map(reason => (
                <label key={reason} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-slate-700 capitalize">{reason}</span>
                </label>
              ))}
              {reportReason === 'other' && (
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Please provide details..."
                  className="w-full px-4 py-2 bg-slate-50 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-slate-900 resize-none"
                  rows={3}
                />
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReportModal(null)
                  setReportReason('')
                  setReportDetails('')
                }}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReport(showReportModal)}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

