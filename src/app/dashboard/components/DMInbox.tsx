'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MessageCircle, Send, X } from 'lucide-react'

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

export function DMInbox({ currentUserId, forceOpen }: { currentUserId: string; forceOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - matches NotificationBell pattern */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        title="Messages"
      >
        <MessageCircle className="w-5 h-5 text-slate-600" />
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
          {/* Header */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            {selectedConversation ? (
              <>
                <button onClick={() => setSelectedConversation(null)} className="p-1 hover:bg-slate-200 rounded" title="Back">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="font-medium truncate">{selectedConversation.participant.name}</span>
                <div className="w-6" />
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-800">Messages</span>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-200 rounded" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Content */}
          {selectedConversation ? (
            // Message View
            <div className="flex flex-col h-96">
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] p-2 rounded-lg text-sm ${
                      msg.sender_id === currentUserId
                        ? 'ml-auto bg-cyan-500 text-white'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-2 border-t border-slate-200 flex gap-2">
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
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50"
                  title="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            // Conversation List
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No messages yet</div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 border-b border-slate-100 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium">
                      {conv.participant.avatar_url ? (
                        <img src={conv.participant.avatar_url} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        conv.participant.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-800 truncate">{conv.participant.name}</span>
                        {conv.last_message_at && (
                          <span className="text-xs text-slate-400">{formatTime(conv.last_message_at)}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{conv.last_message || 'No messages'}</p>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-cyan-500 text-white text-xs rounded-full flex items-center justify-center">
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

