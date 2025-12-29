'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, User } from 'lucide-react'

type Message = {
  id: string
  message: string
  createdAt: string
  affiliateId: string
  avatarName: string
  avatarUrl: string | null
}

interface PodChatProps {
  podId: string
  currentAffiliateId: string
}

export function PodChat({ podId, currentAffiliateId }: PodChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchMessages, 5000)
    
    return () => clearInterval(interval)
  }, [podId])

  useEffect(() => {
    // Only scroll to bottom if user is near the bottom (within 100px)
    // This prevents interrupting users who are reading older messages
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      
      if (isNearBottom || messages.length === 0) {
        scrollToBottom()
      }
    }
  }, [messages])

  function scrollToBottom() {
    // Only scroll within the chat container, not the entire page
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/pods/${podId}/messages`)
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || newMessage.length > 500 || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/pods/${podId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Send message error response:', errorData)
        const errorMsg = errorData.details || errorData.error || 'Failed to send message'
        alert(errorMsg)
        return
      }

      const data = await res.json()
      if (data.message) {
        setMessages([...messages, data.message])
        setNewMessage('')
        // Scroll to bottom after sending (only within chat container)
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
          }
        }, 100)
        // Refresh to get latest messages
        setTimeout(fetchMessages, 500)
      } else {
        alert(data.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  function formatTimestamp(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) {
      const hours = date.getHours()
      const mins = date.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const hour12 = hours % 12 || 12
      return `Today ${hour12}:${mins.toString().padStart(2, '0')} ${ampm}`
    }
    if (diffDays === 1) {
      const hours = date.getHours()
      const mins = date.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const hour12 = hours % 12 || 12
      return `Yesterday ${hour12}:${mins.toString().padStart(2, '0')} ${ampm}`
    }
    if (diffDays < 7) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const hours = date.getHours()
      const mins = date.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const hour12 = hours % 12 || 12
      return `${days[date.getDay()]} ${hour12}:${mins.toString().padStart(2, '0')} ${ampm}`
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg mt-4 overflow-hidden flex flex-col" style={{ maxHeight: '600px' }}>
      <div className="px-4 pt-4 pb-2 border-b border-gray-700">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <span>💬</span>
          POD CHAT
        </h3>
      </div>

      {/* Messages - seamless with input */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {loading ? (
          <div className="text-center text-gray-400 py-4">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3">
              {msg.avatarUrl ? (
                <img
                  src={msg.avatarUrl}
                  alt={msg.avatarName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-white font-medium text-sm">{msg.avatarName}</span>
                  <span className="text-gray-400 text-xs">:</span>
                  <span className="text-white text-sm break-words">{msg.message}</span>
                </div>
                <p className="text-gray-500 text-xs">{formatTimestamp(msg.createdAt)}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - seamless at bottom */}
      <div className="px-4 pb-4 pt-3 border-t border-gray-700 bg-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setNewMessage(e.target.value)
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Type message..."
            maxLength={500}
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending || newMessage.length > 500}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
        {newMessage.length > 0 && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            {newMessage.length}/500
          </p>
        )}
      </div>
    </div>
  )
}

