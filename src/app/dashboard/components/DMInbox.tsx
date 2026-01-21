'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MessageCircle, Search, Send, X } from 'lucide-react'
import Link from 'next/link'
import { ProfileHoverCard } from '@/app/components/ProfileHoverCard'

interface Conversation {
  id: string
  participant: {
    id: string
    name: string
    avatar_url: string | null
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

export function DMInbox({ currentUserId, forceOpen, initialUserId }: { currentUserId: string; forceOpen?: boolean; initialUserId?: string }) {
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Handle initial user ID to open conversation with
  useEffect(() => {
    if (initialUserId && initialUserId !== currentUserId) {
      setIsOpen(true)
      // Fetch user info and start conversation
      fetch(`/api/messages/search-users?q=`)
        .then(res => res.json())
        .then(data => {
          const users = data.users || []
          // Try to find existing conversation first
          const existingConv = conversations.find(c => c.participant.id === initialUserId)
          if (existingConv) {
            setSelectedConversation(existingConv)
          } else {
            // Fetch user details
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
                  setSelectedConversation(newConversation)
                }
              })
              .catch(err => console.error('Failed to fetch user:', err))
          }
        })
        .catch(err => console.error('Failed to fetch user:', err))
    }
  }, [initialUserId])

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

  // Fetch messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.participant.id)
    }
  }, [selectedConversation])

  // Poll for unread count
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        setConversations(data.conversations || [])
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
        setMessages(data.messages || [])
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e)
    }
    setLoading(false)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return

    const content = newMessage.trim()
    setNewMessage('')

    // Optimistic update
    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await fetch(`/api/messages/${selectedConversation.participant.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (res.ok) {
        // Refresh messages to get real ID
        fetchMessages(selectedConversation.participant.id)
      }
    } catch (e) {
      console.error('Failed to send message:', e)
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
              <div className="flex items-center justify-between">
                <button onClick={() => setSelectedConversation(null)} className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded text-white" title="Back">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="font-medium truncate text-white">{selectedConversation.participant.name}</span>
                <div className="w-6" />
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
            // Message View
            <div className="flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[rgba(15,15,26,0.6)]">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] p-2 rounded-lg text-sm ${
                      msg.sender_id === currentUserId
                        ? 'ml-auto bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg'
                        : 'bg-[rgba(255,255,255,0.1)] text-white border border-[rgba(255,255,255,0.1)]'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-2 border-t border-[rgba(255,255,255,0.1)] flex gap-2 bg-[rgba(255,255,255,0.05)]">
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
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-sm bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 shadow-lg"
                  title="Send"
                >
                  <Send className="w-4 h-4" />
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

