'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Search, Wifi, WifiOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useSocket } from '@/hooks/useSocket'

interface Conversation {
  partnerId: string
  partner: {
    id: string
    name: string
    avatar: string | null
  }
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  messages: any[]
}

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  read: boolean
  created_at: string
  sender?: {
    id: string
    avatar_name: string | null
    avatar_url: string | null
  }
  recipient?: {
    id: string
    avatar_name: string | null
    avatar_url: string | null
  }
}

interface DMModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
}

export function DMModal({ isOpen, onClose, currentUserId, currentUserName, currentUserAvatar }: DMModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // WebSocket connection
  const socket = useSocket({ userId: currentUserId, enabled: isOpen })
  const useWebSocket = socket.isSocketEnabled && socket.connected

  // Register message handlers when socket is ready
  useEffect(() => {
    if (socket.connected && selectedConversation) {
      socket.onMessage((msg) => {
        // Check if this message is for the current DM conversation
        const isRelevant = (msg.user_id === selectedConversation.partnerId) || 
                          (msg.user_id === currentUserId)
        if (isRelevant) {
          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.some(m => m.id === msg.id || (m.id.startsWith('temp-') && m.message === msg.message))
            if (exists) {
              return prev.map(m => 
                m.id.startsWith('temp-') && m.message === msg.message ? {
                  id: msg.id,
                  sender_id: msg.user_id,
                  recipient_id: msg.user_id === currentUserId ? selectedConversation.partnerId : currentUserId,
                  message: msg.message,
                  read: true,
                  created_at: msg.created_at
                } : m
              )
            }
            return [...prev, {
              id: msg.id,
              sender_id: msg.user_id,
              recipient_id: msg.user_id === currentUserId ? selectedConversation.partnerId : currentUserId,
              message: msg.message,
              read: true,
              created_at: msg.created_at
            }]
          })
        }
      })
    }
  }, [socket.connected, selectedConversation, currentUserId])

  useEffect(() => {
    if (isOpen) {
      fetchConversations()
    }
  }, [isOpen])

  // Join DM room when conversation is selected
  useEffect(() => {
    if (selectedConversation && socket.connected) {
      // Use a deterministic room ID for DMs (smaller ID first)
      const roomId = [currentUserId, selectedConversation.partnerId].sort().join('-')
      socket.joinChat(`dm:${roomId}`)
      fetchMessages(selectedConversation.partnerId)
    }
    
    return () => {
      if (selectedConversation && socket.connected) {
        const roomId = [currentUserId, selectedConversation.partnerId].sort().join('-')
        socket.leaveChat(`dm:${roomId}`)
      }
    }
  }, [selectedConversation, socket.connected, currentUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messages')
      const data = await res.json()
      if (res.ok) {
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  const fetchMessages = async (userId: string) => {
    try {
      const res = await fetch(`/api/messages/${userId}`)
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedConversation || !socket.connected) return
    
    const roomId = [currentUserId, selectedConversation.partnerId].sort().join('-')
    socket.startTyping(`dm:${roomId}`)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConversation) {
        const roomId = [currentUserId, selectedConversation.partnerId].sort().join('-')
        socket.stopTyping(`dm:${roomId}`)
      }
    }, 2000)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    const messageText = newMessage.trim()
    setNewMessage('')
    setIsLoading(true)
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (socket.connected && selectedConversation) {
      const roomId = [currentUserId, selectedConversation.partnerId].sort().join('-')
      socket.stopTyping(`dm:${roomId}`)
    }

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      recipient_id: selectedConversation.partnerId,
      message: messageText,
      read: false,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await fetch(`/api/messages/${selectedConversation.partnerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      })

      if (res.ok) {
        // WebSocket will handle the real message update if connected
        if (!useWebSocket) {
          fetchMessages(selectedConversation.partnerId)
        }
        fetchConversations()
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
        setNewMessage(messageText)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
      setNewMessage(messageText)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.partner.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get typing users (for DM it would just be the partner)
  const partnerTyping = selectedConversation && socket.typingUsers.has(selectedConversation.partnerId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 flex items-center justify-between border-b-2 border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Direct Messages</h2>
            {/* Connection status */}
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              useWebSocket ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
            }`}>
              {useWebSocket ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{useWebSocket ? 'Real-time' : 'Polling'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-amber-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Conversations List */}
          <div className="w-80 border-r border-slate-300 flex flex-col">
            <div className="p-4 border-b border-slate-300">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-slate-400 rounded bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-slate-600 text-sm">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.partnerId}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 border-b border-slate-200 hover:bg-slate-100 transition-colors text-left ${
                      selectedConversation?.partnerId === conv.partnerId ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {conv.partner.avatar ? (
                        <img
                          src={conv.partner.avatar}
                          alt={conv.partner.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                          {conv.partner.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-slate-800 truncate">{conv.partner.name}</div>
                          {conv.unreadCount > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 truncate">{conv.lastMessage}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Messages Header */}
                <div className="px-6 py-4 border-b border-slate-300 bg-slate-50">
                  <div className="flex items-center gap-3">
                    {selectedConversation.partner.avatar ? (
                      <img
                        src={selectedConversation.partner.avatar}
                        alt={selectedConversation.partner.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                        {selectedConversation.partner.name[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-800">{selectedConversation.partner.name}</div>
                      <div className="text-xs text-slate-600">
                        {partnerTyping ? 'Typing...' : 'Active now'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId
                    const sender = isOwn 
                      ? { name: currentUserName, avatar: currentUserAvatar }
                      : { name: selectedConversation.partner.name, avatar: selectedConversation.partner.avatar }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isOwn && (
                          sender.avatar ? (
                            <img
                              src={sender.avatar}
                              alt={sender.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                              {sender.name[0]}
                            </div>
                          )
                        )}
                        <div className={`max-w-[70%] ${isOwn ? 'order-2' : ''}`}>
                          <div className={`rounded-lg px-4 py-2 ${
                            isOwn
                              ? 'bg-amber-500 text-white'
                              : 'bg-white border-2 border-slate-300 text-slate-800'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          </div>
                          <div className={`text-xs text-slate-500 mt-1 ${isOwn ? 'text-right' : ''}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                {partnerTyping && (
                  <div className="px-6 py-2 text-sm text-slate-500 bg-slate-50 border-t border-slate-200">
                    <span className="italic">{selectedConversation.partner.name} is typing...</span>
                  </div>
                )}

                {/* Message Input */}
                <div className="px-6 py-4 border-t border-slate-300 bg-white">
                  <div className="flex gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        handleTyping()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Type a message..."
                      rows={2}
                      className="flex-1 px-4 py-2 border-2 border-slate-400 rounded-lg bg-white text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isLoading}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
