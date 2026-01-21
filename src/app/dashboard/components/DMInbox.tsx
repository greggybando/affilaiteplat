'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { ArrowLeft, MessageCircle, Search, Send, X, Paperclip, Smile, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { ProfileHoverCard } from '@/app/components/ProfileHoverCard'
import { formatDistanceToNow } from 'date-fns'
import { createPortal } from 'react-dom'

interface Conversation {
  id: string
  participant: {
    id: string
    name: string
    avatar_url: string | null
    last_active_at?: string | null
  }
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface UserSearchResult {
  id: string
  name: string
  avatar_url: string | null
}

export function DMInbox({ currentUserId, forceOpen, initialUserId, onOpenComplete, onClose }: { currentUserId: string; forceOpen?: boolean; initialUserId?: string; onOpenComplete?: () => void; onClose?: () => void }) {
  // Single source of truth: null = closed, 'inbox' = inbox list, userId = conversation with that user
  const [openUserId, setOpenUserId] = useState<string | 'inbox' | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [participantLastActive, setParticipantLastActive] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 })
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [attachedImageUrls, setAttachedImageUrls] = useState<string[]>([])
  const [gifSearchQuery, setGifSearchQuery] = useState('')
  const [gifResults, setGifResults] = useState<any[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Derived state - no separate tracking needed
  const isOpen = openUserId !== null
  const selectedConversation = openUserId && openUserId !== 'inbox' 
    ? conversations.find(c => c.participant.id === openUserId) || null
    : null

  // Handle initialUserId prop - idempotent: setting same value does nothing
  useEffect(() => {
    if (initialUserId && initialUserId !== currentUserId && openUserId !== initialUserId) {
      // Fetch conversations first to check if one exists
      fetch('/api/messages/inbox')
        .then(res => res.json())
        .then(data => {
          const allConversations = (data.conversations || []).map((c: any) => ({
            id: c.conversation_id || c.id,
            participant: {
              id: c.other_user?.id || c.participant?.id,
              name: c.other_user?.name || c.participant?.name || 'Unknown',
              avatar_url: c.other_user?.avatar || c.participant?.avatar_url || null
            },
            last_message: c.last_message || null,
            last_message_at: c.updated_at || c.last_message_at || null,
            unread_count: c.unread_count || 0
          })).filter((c: Conversation) => c.participant && c.participant.id)
          
          setConversations(allConversations)
          
          // Check if conversation exists, otherwise fetch user to create temp conversation
          const existingConv = allConversations.find((c: Conversation) => c.participant.id === initialUserId)
          if (existingConv) {
            setOpenUserId(initialUserId)
          } else {
            // Fetch user details to create temp conversation entry
            fetch(`/api/affiliates/${initialUserId}`)
              .then(res => res.json())
              .then(userData => {
                if (userData.id) {
                  const newConversation: Conversation = {
                    id: 'new-' + userData.id,
                    participant: {
                      id: userData.id,
                      name: userData.avatar_name || userData.name,
                      avatar_url: userData.avatar_url
                    },
                    last_message: null,
                    last_message_at: null,
                    unread_count: 0
                  }
                  // Add temp conversation to list so it can be found by derived state
                  setConversations(prev => [...prev, newConversation])
                  setOpenUserId(initialUserId)
                }
              })
              .catch(err => console.error('[DMInbox] Failed to fetch user:', err))
          }
        })
        .catch(err => console.error('[DMInbox] Failed to fetch conversations:', err))
    }
  }, [initialUserId, currentUserId, openUserId])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return
    
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      // Don't close if clicking the trigger button or its children
      if (buttonRef.current && (buttonRef.current === target || buttonRef.current.contains(target))) {
        return
      }
      // Don't close if clicking inside the dropdown
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return
      }
      // Close - single state update
      setOpenUserId(null)
      if (onClose) {
        onClose()
      }
    }
    // Use a delay to avoid immediate closure when opening
    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
    }, 150)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [isOpen, onClose])

  // Fetch conversations when inbox list is shown
  useEffect(() => {
    if (openUserId === 'inbox') {
      fetchConversations()
    }
  }, [openUserId])

  // External control to force open/close
  useEffect(() => {
    if (forceOpen !== undefined) {
      setOpenUserId(forceOpen ? (openUserId || 'inbox') : null)
    }
  }, [forceOpen, openUserId])

  // Fetch messages and last active time when conversation selected
  useEffect(() => {
    if (openUserId && openUserId !== 'inbox') {
      fetchMessages(openUserId)
      fetchParticipantLastActive(openUserId)
      // Poll for last active updates every 30 seconds
      const interval = setInterval(() => {
        fetchParticipantLastActive(openUserId)
      }, 30000)
      return () => clearInterval(interval)
    } else {
      setParticipantLastActive(null)
    }
  }, [openUserId])
  
  async function fetchParticipantLastActive(userId: string) {
    try {
      const res = await fetch(`/api/profile/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setParticipantLastActive(data.lastActiveAt || null)
      }
    } catch (e) {
      console.error('Failed to fetch participant last active:', e)
    }
  }
  
  function getDateSession(date: Date): string {
    const now = new Date()
    // Normalize to midnight in local timezone
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    // Calculate difference in days (can be negative if message is in future, but should be 0 for today)
    const diffTime = today.getTime() - messageDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays >= 0 && diffDays < 7) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return days[messageDate.getDay()]
    }
    return messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }
  
  // Memoize grouped messages to prevent recalculation on every render
  // Create a stable key from message IDs and timestamps
  const messagesKey = useMemo(() => 
    messages.map(m => `${m.id}-${m.created_at}`).join('|'),
    [messages]
  )
  
  const groupedMessages = useMemo(() => {
    if (messages.length === 0) return []
    
    const groups: { session: string; messages: typeof messages }[] = []
    let currentSession = ''
    
    // Always sort messages by created_at to ensure proper grouping
    // This handles cases where API returns messages out of order
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    sortedMessages.forEach((msg) => {
      const messageDate = new Date(msg.created_at)
      const session = getDateSession(messageDate)
      
      if (session !== currentSession) {
        currentSession = session
        groups.push({ session, messages: [] })
      }
      
      groups[groups.length - 1].messages.push(msg)
    })
    
    return groups
  }, [messagesKey])

  // Poll for unread count
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [messages])

  async function fetchUnreadCount() {
    try {
      const res = await fetch('/api/messages/unread-count')
      if (res.ok) {
        const data = await res.json()
        setUnreadTotal(data.count || 0)
      }
    } catch (e) {
      console.error('Failed to fetch unread count:', e)
    }
  }

  async function fetchConversations() {
    setLoading(true)
    try {
      const res = await fetch('/api/messages/inbox')
      if (res.ok) {
        const data = await res.json()
        // Map API response (uses other_user) to component format (uses participant)
        const mappedConversations = (data.conversations || []).map((c: any) => ({
          id: c.conversation_id || c.id,
          participant: {
            id: c.other_user?.id || c.participant?.id,
            name: c.other_user?.name || c.participant?.name || 'Unknown',
            avatar_url: c.other_user?.avatar || c.participant?.avatar_url || null
          },
          last_message: c.last_message || null,
          last_message_at: c.updated_at || c.last_message_at || null,
          unread_count: c.unread_count || 0
        })).filter((c: Conversation) => c.participant && c.participant.id)
        setConversations(mappedConversations)
      }
    } catch (e) {
      console.error('Failed to fetch conversations:', e)
    }
    setLoading(false)
  }

  async function fetchMessages(partnerId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/messages/${partnerId}`)
      if (res.ok) {
        const data = await res.json()
        // Ensure messages are sorted by created_at
        const sortedMessages = (data.messages || []).sort((a: Message, b: Message) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setMessages(sortedMessages)
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e)
    }
    setLoading(false)
  }

  const handleFileUpload = async (files: File[]) => {
    const uploadedUrls: string[] = []
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum 10MB per file.`)
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
        if (data.url) {
          uploadedUrls.push(data.url)
        }
      } catch (error) {
        console.error('Error uploading file:', error)
        alert(`Failed to upload ${file.name}`)
      }
    }
    
    return uploadedUrls
  }

  async function sendMessage() {
    if ((!newMessage.trim() && attachedImageUrls.length === 0) || !openUserId || openUserId === 'inbox') return

    // Use already uploaded image URLs
    const uploadedUrls: string[] = [...attachedImageUrls]

    // Build content with attachments
    let content = newMessage.trim()
    if (uploadedUrls.length > 0) {
      const imageTags = uploadedUrls.map(url => `<img src="${url}" alt="Attachment" style="max-width: 300px; border-radius: 8px; margin: 4px 0;" />`).join('')
      content = content ? `${content}\n${imageTags}` : imageTags
    }

    if (!content) return

    const tempId = 'temp-' + Date.now()
    setNewMessage('')
    setAttachedImageUrls([])

    // Ensure optimistic timestamp is always newer than existing messages
    // This guarantees the message appears at the bottom after sorting
    const now = Date.now()
    const latestExistingTime = messages.length > 0 
      ? Math.max(...messages.map(m => new Date(m.created_at).getTime()))
      : 0
    const optimisticTimestamp = new Date(Math.max(now, latestExistingTime + 1000)).toISOString()

    // Optimistic update - add message with timestamp guaranteed to be newest
    const tempMessage: Message = {
      id: tempId,
      sender_id: currentUserId,
      content,
      created_at: optimisticTimestamp
    }
    setMessages(prev => {
      // Add to end and sort ascending (oldest first) - newest will be at bottom
      const updated = [...prev, tempMessage]
      return updated.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })
    
    // Scroll to bottom after adding optimistic message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)

    try {
      const res = await fetch(`/api/messages/${openUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (res.ok) {
        const data = await res.json()
        // Replace temp message with real message from server
        if (data.message) {
          setMessages(prev => {
            // Find the temp message to replace
            const tempIndex = prev.findIndex(msg => msg.id === tempId)
            if (tempIndex === -1) {
              // Temp message not found, add real message and sort
              const updated = [...prev, {
                id: data.message.id,
                sender_id: data.message.sender_id,
                content: data.message.content,
                created_at: data.message.created_at
              }]
              return updated.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            }
            
            // Replace temp message with real one using server timestamp
            const updated = [...prev]
            updated[tempIndex] = {
              id: data.message.id,
              sender_id: data.message.sender_id,
              content: data.message.content,
              created_at: data.message.created_at // Use real server timestamp
            }
            
            // Sort to ensure proper order
            return updated.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          })
        } else {
          // Fallback: refetch after a delay if response doesn't include message
          setTimeout(() => {
            fetchMessages(openUserId)
          }, 1000)
        }
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
      }
    } catch (e) {
      console.error('Failed to send message:', e)
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
    }
  }

  const searchGifs = async (query: string) => {
    setGifLoading(true)
    try {
      // Using Giphy API (free tier)
      const apiKey = 'dc6zaTOxFJmzC' // Giphy public beta key
      const endpoint = query === 'trending' 
        ? `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20&rating=g`
      
      console.log('Fetching GIFs from:', endpoint)
      const res = await fetch(endpoint)
      if (!res.ok) {
        throw new Error(`Giphy API error: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      console.log('GIF API response:', data)
      if (data.data && Array.isArray(data.data)) {
        setGifResults(data.data)
      } else {
        console.error('Unexpected GIF API response format:', data)
        setGifResults([])
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error)
      setGifResults([])
    } finally {
      setGifLoading(false)
    }
  }

  async function searchUsers(query: string) {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/messages/search-users?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.users || [])
      }
    } catch (e) {
      console.error('Failed to search users:', e)
    }
    setIsSearching(false)
  }

  function startConversationWithUser(user: UserSearchResult) {
    // Create a temporary conversation object and add to list
    const newConversation: Conversation = {
      id: 'new-' + user.id,
      participant: {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url
      },
      last_message: null,
      last_message_at: null,
      unread_count: 0
    }
    setConversations(prev => [...prev, newConversation])
    setOpenUserId(user.id)
    setSearchQuery('')
    setSearchResults([])
  }

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" style={{ zIndex: 999999 }}>
      {/* Trigger Button - matches NotificationBell pattern */}
      <button
        ref={buttonRef}
        onMouseDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          
          // If initialUserId is set and valid, open that conversation (idempotent)
          if (initialUserId && initialUserId !== currentUserId) {
            setOpenUserId(initialUserId)
          } else {
            // Toggle: if open, close; if closed, open inbox list
            setOpenUserId(prev => prev === null ? 'inbox' : null)
          }
        }}
        className="relative p-2 bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.16)] rounded-xl border border-[rgba(255,255,255,0.18)] transition-colors"
        title="Messages"
      >
        <MessageCircle className="w-5 h-5 text-white" />
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div ref={dropdownRef} className="fixed w-96 bg-[rgba(26,26,46,0.95)] backdrop-blur-[20px] rounded-xl border border-[rgba(255,255,255,0.2)] overflow-hidden" style={{ right: '1rem', top: '4rem', backdropFilter: 'blur(20px)', boxShadow: '0 0 40px rgba(6,182,212,0.3), 0 8px 32px rgba(0,0,0,0.8)', zIndex: 999999 }}>
          {/* Header */}
          <div className="p-3 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]">
            {selectedConversation ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <button onClick={() => setOpenUserId('inbox')} className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded text-white" title="Back">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  {selectedConversation.participant.avatar_url ? (
                    <img 
                      src={selectedConversation.participant.avatar_url} 
                      alt={selectedConversation.participant.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-cyan-500/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium border-2 border-cyan-500/50">
                      {selectedConversation.participant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-white">{selectedConversation.participant.name}</div>
                    {participantLastActive && (
                      <div className="text-xs text-[rgba(255,255,255,0.5)] truncate">
                        {(() => {
                          const lastActive = new Date(participantLastActive)
                          const now = new Date()
                          const diffMs = now.getTime() - lastActive.getTime()
                          const diffMins = Math.floor(diffMs / 60000)
                          
                          if (diffMins < 5) {
                            return 'Active now'
                          } else if (diffMins < 60) {
                            return `Active ${diffMins}m ago`
                          } else {
                            return `Active ${formatDistanceToNow(lastActive, { addSuffix: true })}`
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">Messages</span>
                  <button onClick={() => {
                    setOpenUserId(null)
                    if (onClose) {
                      onClose()
                    }
                  }} className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded text-white" title="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.5)]" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              </>
            )}
          </div>

          {/* Content */}
          {selectedConversation ? (
            // Message View - iPhone Style
            <div className="flex flex-col h-96">
              <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1" style={{ background: '#000000' }}>
                {groupedMessages.length === 0 ? (
                  <div className="text-center py-8 text-[rgba(255,255,255,0.5)] text-sm">No messages yet</div>
                ) : (
                  groupedMessages.map((group, groupIndex) => (
                      <div key={`${group.session}-${groupIndex}`}>
                        {/* Date Session Header */}
                        <div className="flex items-center justify-center my-4">
                          <div className="text-[11px] text-[rgba(255,255,255,0.5)] px-3 py-1 rounded-full bg-[rgba(255,255,255,0.1)]">
                            {group.session}
                          </div>
                        </div>
                        
                        {/* Messages in this session */}
                        {group.messages.map((msg, index) => {
                          const isOwnMessage = msg.sender_id === currentUserId
                          const prevMessage = index > 0 ? group.messages[index - 1] : null
                          const isLastMessage = index === group.messages.length - 1
                          // Show timestamp if: no previous message, different sender, >5 min apart, OR it's the last message in the group
                          const showTimestamp = !prevMessage || 
                            prevMessage.sender_id !== msg.sender_id ||
                            new Date(msg.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000 || // 5 minutes
                            isLastMessage // Always show timestamp for the last message
                          
                          const messageTime = new Date(msg.created_at)
                          const timeStr = messageTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                          
                          return (
                            <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${showTimestamp ? 'mt-3' : 'mt-1'}`}>
                              <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                {showTimestamp && (
                                  <div className="text-[10px] text-[rgba(255,255,255,0.4)] px-2 mb-1">
                                    {timeStr}
                                  </div>
                                )}
                                <div
                                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                    isOwnMessage
                                      ? 'rounded-br-sm bg-[#007AFF] text-white'
                                      : 'rounded-bl-sm bg-[#E5E5EA] text-black'
                                  }`}
                                  style={{
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word'
                                  }}
                                >
                                  {(() => {
                                    // Check if content contains HTML (like images)
                                    if (msg.content.includes('<img')) {
                                      // Extract text and images separately
                                      const parts = msg.content.split(/(<img[^>]*>)/g)
                                      return (
                                        <>
                                          {parts.map((part, idx) => {
                                            if (part.startsWith('<img')) {
                                              // Extract src from img tag
                                              const srcMatch = part.match(/src=["']([^"']+)["']/)
                                              const altMatch = part.match(/alt=["']([^"']*)["']/)
                                              if (srcMatch) {
                                                return (
                                                  <img
                                                    key={idx}
                                                    src={srcMatch[1]}
                                                    alt={altMatch ? altMatch[1] : 'Attachment'}
                                                    style={{
                                                      maxWidth: '200px',
                                                      borderRadius: '8px',
                                                      margin: '4px 0',
                                                      display: 'block'
                                                    }}
                                                  />
                                                )
                                              }
                                              return null
                                            }
                                            // Regular text content
                                            return part.trim() ? (
                                              <span key={idx} className="whitespace-pre-wrap">{part}</span>
                                            ) : null
                                          })}
                                        </>
                                      )
                                    }
                                    // Plain text
                                    return <span className="whitespace-pre-wrap">{msg.content}</span>
                                  })()}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.1)] flex gap-2 items-center" style={{ background: '#000000' }}>
                {/* Attachment Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files
                    if (files && files.length > 0) {
                      console.log('Files selected:', files.length)
                      const fileArray = Array.from(files)
                      // Upload files immediately
                      const urls = await handleFileUpload(fileArray)
                      console.log('Uploaded URLs:', urls)
                      setAttachedImageUrls(prev => [...prev, ...urls])
                      // Reset input
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }
                  }}
                  className="hidden"
                  id="dm-file-input"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Attachment button clicked')
                    fileInputRef.current?.click()
                  }}
                  className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-70 cursor-pointer"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Show attached images preview */}
                {attachedImageUrls.length > 0 && (
                  <div className="flex gap-2 items-center">
                    {attachedImageUrls.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt="Attachment" className="w-10 h-10 rounded-lg object-cover" />
                        <button
                          onClick={() => setAttachedImageUrls(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Emoji Button */}
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Emoji button clicked, current state:', showEmojiPicker)
                    if (!showEmojiPicker && emojiButtonRef.current) {
                      const rect = emojiButtonRef.current.getBoundingClientRect()
                      setEmojiPickerPosition({
                        top: rect.top - 200,
                        left: Math.max(10, Math.min(rect.left, window.innerWidth - 300))
                      })
                    }
                    setShowEmojiPicker(!showEmojiPicker)
                  }}
                  className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-70 cursor-pointer"
                  style={{ color: showEmojiPicker ? 'rgba(34,211,238,1)' : 'rgba(255,255,255,0.6)' }}
                  title="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* GIF Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('GIF button clicked, current state:', showGifPicker)
                    setShowGifPicker(!showGifPicker)
                    if (!showGifPicker) {
                      // Load trending GIFs
                      searchGifs('trending')
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-70 text-xs font-medium cursor-pointer"
                  style={{ color: showGifPicker ? 'rgba(34,211,238,1)' : 'rgba(255,255,255,0.6)' }}
                  title="GIF"
                >
                  GIF
                </button>

                {/* Message Input */}
                <div className="flex-1 rounded-full overflow-hidden" style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder={selectedConversation ? `Message ${selectedConversation.participant.name}` : 'iMessage'}
                    className="w-full px-4 py-2.5 text-sm text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none"
                    style={{ background: 'transparent' }}
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() && attachedImageUrls.length === 0}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                  style={{
                    background: (newMessage.trim() || attachedImageUrls.length > 0) ? '#007AFF' : 'rgba(255,255,255,0.1)',
                    color: '#FFFFFF'
                  }}
                  title="Send"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* GIF Picker */}
              {showGifPicker && typeof document !== 'undefined' && createPortal(
                <>
                  {/* Backdrop - only closes GIF picker, not the messaging panel */}
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowGifPicker(false)
                    }}
                  />
                  {/* GIF Picker */}
                  <div
                    className="fixed bg-[rgba(26,26,46,0.95)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 z-[9999] shadow-2xl"
                    style={{
                      bottom: '80px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '90%',
                      maxWidth: '400px',
                      maxHeight: '400px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search Input */}
                    <input
                      type="text"
                      value={gifSearchQuery}
                      onChange={(e) => {
                        const query = e.target.value
                        setGifSearchQuery(query)
                        if (query.trim()) {
                          searchGifs(query)
                        } else {
                          searchGifs('trending')
                        }
                      }}
                      placeholder="Search GIFs..."
                      className="w-full px-3 py-2 mb-3 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-[#22d3ee]"
                    />
                    
                    {/* GIF Grid */}
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2">
                      {gifLoading ? (
                        <div className="col-span-2 text-center text-[rgba(255,255,255,0.6)] py-8">Loading GIFs...</div>
                      ) : gifResults.length === 0 ? (
                        <div className="col-span-2 text-center text-[rgba(255,255,255,0.6)] py-8">No GIFs found</div>
                      ) : (
                        gifResults.map((gif: any) => {
                          const gifUrl = gif.images?.fixed_height?.url || gif.images?.original?.url || gif.url || gif.images?.downsized?.url
                          const previewUrl = gif.images?.fixed_height_small?.url || gif.images?.fixed_height?.url || gif.images?.downsized_small?.url || gifUrl
                          if (!gifUrl) {
                            console.log('No GIF URL found for:', gif)
                            return null
                          }
                          return (
                            <button
                              key={gif.id || Math.random()}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('GIF selected:', gifUrl)
                                setAttachedImageUrls(prev => [...prev, gifUrl])
                                setShowGifPicker(false)
                                setGifSearchQuery('')
                              }}
                              className="relative w-full aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity bg-[rgba(255,255,255,0.1)] cursor-pointer"
                            >
                              <img
                                src={previewUrl}
                                alt={gif.title || 'GIF'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('Failed to load GIF preview:', previewUrl)
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </>,
                document.body
              )}

              {/* Emoji Picker */}
              {showEmojiPicker && typeof document !== 'undefined' && createPortal(
                <>
                  {/* Backdrop - only closes emoji picker, not the messaging panel */}
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowEmojiPicker(false)
                    }}
                  />
                  {/* Emoji Picker */}
                  <div
                    className="emoji-picker-scroll fixed bg-[rgba(26,26,46,0.95)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.1)] rounded-xl p-1.5 z-[9999] shadow-2xl"
                    style={{
                      bottom: '80px',
                      left: `${emojiPickerPosition.left}px`,
                      maxWidth: '280px',
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-8 gap-1">
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
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setNewMessage(prev => prev + emoji)
                            setShowEmojiPicker(false)
                          }}
                          className="text-base hover:scale-125 transition-transform p-0.5 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>
          ) : (
            // Conversation List or Search Results
            <div className="max-h-96 overflow-y-auto">
              {searchQuery && searchResults.length > 0 ? (
                // Search Results
                <div>
                  <div className="px-3 py-2 text-xs text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.05)]">Search Results</div>
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => startConversationWithUser(user)}
                      className="w-full p-3 flex items-center gap-3 hover:bg-[rgba(255,255,255,0.1)] border-b border-[rgba(255,255,255,0.1)] text-left transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium shadow-lg" style={{ boxShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
                        {user.avatar_url ? (
                          <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" alt={user.name} />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-white">{user.name}</span>
                        <p className="text-xs text-[rgba(255,255,255,0.5)]">Start a conversation</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">No users found</div>
              ) : loading || isSearching ? (
                <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-[rgba(255,255,255,0.6)]">No messages yet. Search for users above to start a conversation!</div>
              ) : (
                // Existing Conversations
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setOpenUserId(conv.participant.id)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-[rgba(255,255,255,0.1)] border-b border-[rgba(255,255,255,0.1)] text-left transition-colors"
                  >
                    <ProfileHoverCard
                      userId={conv.participant.id}
                      userName={conv.participant.name}
                      userAvatar={conv.participant.avatar_url}
                      onChatClick={() => setOpenUserId(conv.participant.id)}
                    >
                      <Link href={`/profile/${conv.participant.id}`} onClick={(e) => e.stopPropagation()} className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium shadow-lg cursor-pointer" style={{ boxShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
                        {conv.participant.avatar_url ? (
                          <img src={conv.participant.avatar_url} className="w-full h-full rounded-full object-cover" alt={conv.participant.name} />
                        ) : (
                          conv.participant.name.charAt(0).toUpperCase()
                        )}
                      </Link>
                    </ProfileHoverCard>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <ProfileHoverCard
                          userId={conv.participant.id}
                          userName={conv.participant.name}
                          userAvatar={conv.participant.avatar_url}
                          onChatClick={() => setOpenUserId(conv.participant.id)}
                        >
                          <Link href={`/profile/${conv.participant.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-white hover:text-cyan-400 transition-colors cursor-pointer truncate">{conv.participant.name}</Link>
                        </ProfileHoverCard>
                        {conv.last_message_at && (
                          <span className="text-xs text-[rgba(255,255,255,0.5)]">{formatTime(conv.last_message_at)}</span>
                        )}
                      </div>
                      <p className="text-sm text-[rgba(255,255,255,0.6)] truncate">{conv.last_message || 'No messages'}</p>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs rounded-full flex items-center justify-center shadow-lg">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

