'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Send, Search } from 'lucide-react'

interface DMModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
  initialPartnerId?: string | null
  initialPartnerName?: string | null
  initialPartnerAvatar?: string | null
}

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface Conversation {
  conversation_id: string
  other_user: {
    id: string
    name: string
    avatar: string | null
  }
  last_message: string
  updated_at: string
  unread_count: number
}

export function DMModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  initialPartnerId,
  initialPartnerName,
  initialPartnerAvatar
}: DMModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch inbox
  useEffect(() => {
    if (!isOpen) return
    fetchInbox()
    const interval = setInterval(fetchInbox, 10000)
    return () => clearInterval(interval)
  }, [isOpen])

  // Fetch messages when user selected
  useEffect(() => {
    if (!isOpen || !selectedUserId) return
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [isOpen, selectedUserId])

  // Auto-select initial partner
  useEffect(() => {
    if (isOpen && initialPartnerId) {
      setSelectedUserId(initialPartnerId)
    }
  }, [isOpen, initialPartnerId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchInbox() {
    try {
      const res = await fetch('/api/messages/inbox')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error('Failed to fetch inbox:', err)
    }
  }

  async function fetchMessages() {
    if (!selectedUserId) return
    try {
      const res = await fetch(`/api/messages/${selectedUserId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }

  async function handleSend() {
    if (!selectedUserId || !newMessage.trim() || sending) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    try {
      const res = await fetch(`/api/messages/${selectedUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (res.ok) {
        fetchMessages()
        fetchInbox()
      } else {
        setNewMessage(content) // restore on error
      }
    } catch (err) {
      console.error('Failed to send:', err)
      setNewMessage(content)
    } finally {
      setSending(false)
    }
  }

  const selectedPartner = selectedUserId
    ? conversations.find(c => c.other_user.id === selectedUserId)?.other_user || 
      { id: selectedUserId, name: initialPartnerName || 'User', avatar: initialPartnerAvatar || null }
    : null

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">Direct Messages</h2>
          <button onClick={onClose} className="text-white hover:text-slate-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversations List */}
          <div className="w-72 border-r border-slate-700 flex flex-col bg-slate-900/50">
            <div className="p-3 border-b border-slate-700">
              <div className="text-sm font-semibold text-white mb-2">Conversations</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">No conversations yet</div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.conversation_id}
                    onClick={() => setSelectedUserId(conv.other_user.id)}
                    className={`w-full p-3 flex items-center gap-3 text-left hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 ${
                      selectedUserId === conv.other_user.id ? 'bg-cyan-600/20' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-semibold">
                      {conv.other_user.avatar ? (
                        <img src={conv.other_user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        conv.other_user.name[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{conv.other_user.name}</div>
                      <div className="text-xs text-slate-400 truncate">{conv.last_message}</div>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-cyan-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col bg-slate-800">
            {selectedUserId && selectedPartner ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50">
                  <div className="font-semibold text-white">{selectedPartner.name}</div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwn ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-white'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                  <div className="flex gap-3">
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sending}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
