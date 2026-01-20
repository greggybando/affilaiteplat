'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { ArrowLeft, MessageCircle, Search, Send, X } from 'lucide-react'
import Link from 'next/link'
import { ProfileHoverCard } from '@/app/components/ProfileHoverCard'
import { formatDistanceToNow } from 'date-fns'

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

export function DMInbox({ currentUserId, forceOpen, initialUserId, onOpenComplete }: { currentUserId: string; forceOpen?: boolean; initialUserId?: string; onOpenComplete?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [participantLastActive, setParticipantLastActive] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Handle initial user ID to open conversation with
  useEffect(() => {
    if (initialUserId && initialUserId !== currentUserId) {
      console.log('[DMInbox] Opening with initialUserId:', initialUserId)
      setIsOpen(true)
      // First fetch conversations to check if one exists
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
          
          // Try to find existing conversation first
          const existingConv = allConversations.find((c: Conversation) => c.participant && c.participant.id === initialUserId)
          if (existingConv) {
            console.log('[DMInbox] Found existing conversation:', existingConv)
            setConversations(allConversations)
            setSelectedConversation(existingConv)
          } else {
            // Fetch user details and create new conversation
            console.log('[DMInbox] Creating new conversation for user:', initialUserId)
            fetch(`/api/affiliates/${initialUserId}`)
              .then(res => res.json())
              .then(userData => {
                if (userData.id) {
                  setConversations(allConversations)
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
                  console.log('[DMInbox] Setting new conversation:', newConversation)
                  setSelectedConversation(newConversation)
                }
              })
              .catch(err => console.error('[DMInbox] Failed to fetch user:', err))
          }
        })
        .catch(err => console.error('[DMInbox] Failed to fetch conversations:', err))
    }
  }, [initialUserId, currentUserId])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedConversation(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch conversations when dropdown opens
  useEffect(() => {
    if (isOpen && !selectedConversation) {
      fetchConversations()
    }
  }, [isOpen, selectedConversation])

  // External control to force open/close
  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen)
      if (!forceOpen) {
        setSelectedConversation(null)
      }
    }
  }, [forceOpen])

  // Fetch messages and last active time when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.participant.id)
      fetchParticipantLastActive(selectedConversation.participant.id)
      // Poll for last active updates every 30 seconds
      const interval = setInterval(() => {
        if (selectedConversation) {
          fetchParticipantLastActive(selectedConversation.participant.id)
        }
      }, 30000)
      return () => clearInterval(interval)
    } else {
      setParticipantLastActive(null)
    }
  }, [selectedConversation])
  
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return days[date.getDay()]
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
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

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return

    const content = newMessage.trim()
    const tempId = 'temp-' + Date.now()
    const optimisticTimestamp = new Date().toISOString()
    setNewMessage('')

    // Optimistic update - add message with current timestamp (will be newest)
    const tempMessage: Message = {
      id: tempId,
      sender_id: currentUserId,
      content,
      created_at: optimisticTimestamp
    }
    setMessages(prev => {
      // Add to end and sort - newest messages will be at the bottom
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
      const res = await fetch(`/api/messages/${selectedConversation.participant.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (res.ok) {
        const data = await res.json()
        // Replace temp message with real message - preserve optimistic timestamp to maintain session grouping
        if (data.message) {
          setMessages(prev => {
            // Find the temp message to preserve its position
            const tempIndex = prev.findIndex(msg => msg.id === tempId)
            if (tempIndex === -1) return prev // Temp message not found, return unchanged
            
            // Replace temp message with real one, keeping optimistic timestamp
            const updated = [...prev]
            updated[tempIndex] = {
              id: data.message.id,
              sender_id: data.message.sender_id,
              content: data.message.content,
              // Keep optimistic timestamp to preserve session grouping
              created_at: optimisticTimestamp
            }
            
            // Sort to ensure proper order for timestamp comparisons
            // This is safe because we're preserving the optimistic timestamp
            return updated.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          })
        } else {
          // Fallback: refetch after a delay if response doesn't include message
          setTimeout(() => {
            fetchMessages(selectedConversation.participant.id)
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
    // Create a temporary conversation object
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
    setSelectedConversation(newConversation)
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
    <div className="relative" ref={dropdownRef} style={{ zIndex: 999999 }}>
      {/* Trigger Button - matches NotificationBell pattern */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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
        <div className="fixed w-96 bg-[rgba(26,26,46,0.95)] backdrop-blur-[20px] rounded-xl border border-[rgba(255,255,255,0.2)] overflow-hidden" style={{ right: '1rem', top: '4rem', backdropFilter: 'blur(20px)', boxShadow: '0 0 40px rgba(6,182,212,0.3), 0 8px 32px rgba(0,0,0,0.8)', zIndex: 999999 }}>
          {/* Header */}
          <div className="p-3 border-b border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]">
            {selectedConversation ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedConversation(null)} className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded text-white" title="Back">
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
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded text-white" title="Close">
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
                          const showTimestamp = !prevMessage || 
                            prevMessage.sender_id !== msg.sender_id ||
                            new Date(msg.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000 // 5 minutes
                          
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
                                  {msg.content}
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
              <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.1)] flex gap-2" style={{ background: '#000000' }}>
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
                    placeholder="iMessage"
                    className="w-full px-4 py-2.5 text-sm text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none"
                    style={{ background: 'transparent' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                  style={{
                    background: newMessage.trim() ? '#007AFF' : 'rgba(255,255,255,0.1)',
                    color: '#FFFFFF'
                  }}
                  title="Send"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
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
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-[rgba(255,255,255,0.1)] border-b border-[rgba(255,255,255,0.1)] text-left transition-colors"
                  >
                    <ProfileHoverCard
                      userId={conv.participant.id}
                      userName={conv.participant.name}
                      userAvatar={conv.participant.avatar_url}
                      onChatClick={() => setSelectedConversation(conv)}
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
                          onChatClick={() => setSelectedConversation(conv)}
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

