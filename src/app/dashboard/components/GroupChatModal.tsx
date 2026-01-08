'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Users, LogOut, MessageCircle, Plus, Bell, BellOff, Trash2, MoreVertical, Search, UserPlus, Wifi, WifiOff } from 'lucide-react'
import { formatDistanceToNow, differenceInSeconds } from 'date-fns'
import { useSocket } from '@/hooks/useSocket'

interface GroupChatMessage {
  id: string
  user_id: string
  user_name: string
  user_avatar: string | null
  message: string
  created_at: string
}

interface GroupChat {
  id: string
  name: string
  muted: boolean
  participantCount: number
  lastMessage: {
    text: string
    author: string
    time: string
  } | null
}

interface User {
  id: string
  name: string
  avatarName: string
  avatarUrl: string | null
}

interface GroupChatModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
}

export function GroupChatModal({ isOpen, onClose, currentUserId, currentUserName, currentUserAvatar }: GroupChatModalProps) {
  const [chats, setChats] = useState<GroupChat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<GroupChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [participants, setParticipants] = useState<number>(0)
  const [showCreateChat, setShowCreateChat] = useState(false)
  const [newChatName, setNewChatName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<User[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState<User[]>([])
  const [showMemberSearch, setShowMemberSearch] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // WebSocket connection
  const socket = useSocket({ userId: currentUserId, enabled: isOpen })
  const useWebSocket = socket.isSocketEnabled && socket.connected

  // Register message handlers when socket is ready
  useEffect(() => {
    if (socket.connected) {
      socket.onMessage((msg) => {
        // Only add if it's for the current chat
        if (msg.chat_id === selectedChatId) {
          setMessages(prev => {
            // Avoid duplicates (in case of optimistic update)
            const exists = prev.some(m => m.id === msg.id || (m.id.startsWith('temp-') && m.message === msg.message))
            if (exists) {
              // Replace temp message with real one
              return prev.map(m => 
                m.id.startsWith('temp-') && m.message === msg.message ? {
                  ...msg,
                  user_avatar: msg.user_avatar || null
                } : m
              )
            }
            return [...prev, {
              ...msg,
              user_avatar: msg.user_avatar || null
            }]
          })
        }
      })
      
      socket.onMessageDeleted(({ messageId }) => {
        setMessages(prev => prev.filter(m => m.id !== messageId))
      })
    }
  }, [socket.connected, selectedChatId])

  useEffect(() => {
    if (isOpen) {
      fetchChats()
    }
  }, [isOpen])

  // Join/leave chat room via WebSocket
  useEffect(() => {
    if (selectedChatId && socket.connected) {
      socket.joinChat(selectedChatId)
      fetchMessages() // Fetch initial messages
    }
    
    return () => {
      if (selectedChatId && socket.connected) {
        socket.leaveChat(selectedChatId)
      }
    }
  }, [selectedChatId, socket.connected])

  useEffect(() => {
    if (selectedChatId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, selectedChatId])

  // Update online count from socket
  useEffect(() => {
    if (socket.onlineCount > 0) {
      setParticipants(socket.onlineCount)
    }
  }, [socket.onlineCount])

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/group-chat/chats')
      const data = await res.json()
      if (res.ok) {
        setChats(data.chats || [])
        // Auto-select first chat if none selected
        if (!selectedChatId && data.chats && data.chats.length > 0) {
          setSelectedChatId(data.chats[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    }
  }

  const fetchMessages = async () => {
    if (!selectedChatId) return
    try {
      const res = await fetch(`/api/group-chat/messages?chatId=${selectedChatId}`)
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
        setParticipants(data.participants || 0)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  useEffect(() => {
    if (memberSearchQuery.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      searchTimeoutRef.current = setTimeout(() => {
        searchMembers()
      }, 300)
    } else {
      setMemberSearchResults([])
      setShowMemberSearch(false)
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [memberSearchQuery])

  const searchMembers = async () => {
    try {
      const res = await fetch(`/api/pods/search?q=${encodeURIComponent(memberSearchQuery)}`)
      const data = await res.json()
      const affiliates = data.affiliates || []
      // Filter out already selected members and current user
      const filtered = affiliates.filter(
        (aff: User) => !selectedMembers.some((m) => m.id === aff.id) && aff.id !== currentUserId
      )
      setMemberSearchResults(filtered)
      setShowMemberSearch(filtered.length > 0)
    } catch (error) {
      console.error('Error searching members:', error)
      setMemberSearchResults([])
      setShowMemberSearch(false)
    }
  }

  const addMember = (user: User) => {
    if (!selectedMembers.some(m => m.id === user.id)) {
      setSelectedMembers([...selectedMembers, user])
    }
    setMemberSearchQuery('')
    setShowMemberSearch(false)
  }

  const removeMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId))
  }

  const handleCreateChat = async () => {
    if (!newChatName.trim()) return

    try {
      const memberIds = selectedMembers.map(m => m.id)
      const res = await fetch('/api/group-chat/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChatName.trim(), memberIds })
      })

      if (res.ok) {
        setNewChatName('')
        setSelectedMembers([])
        setMemberSearchQuery('')
        setShowCreateChat(false)
        fetchChats()
      }
    } catch (error) {
      console.error('Error creating chat:', error)
    }
  }

  const handleMuteChat = async (chatId: string, muted: boolean) => {
    try {
      const res = await fetch(`/api/group-chat/chats/${chatId}/mute`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: !muted })
      })

      if (res.ok) {
        fetchChats()
        setShowChatMenu(null)
      }
    } catch (error) {
      console.error('Error muting chat:', error)
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId)
    if (chat?.name === 'Main Group Chat') {
      alert('Cannot delete the Main Group Chat')
      setShowChatMenu(null)
      return
    }

    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) return

    try {
      const res = await fetch(`/api/group-chat/chats/${chatId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        if (selectedChatId === chatId) {
          setSelectedChatId(null)
          setMessages([])
        }
        fetchChats()
        setShowChatMenu(null)
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  const handleLeaveChat = async (chatId: string) => {
    if (!confirm('Are you sure you want to leave this chat?')) return

    try {
      const res = await fetch(`/api/group-chat/chats/${chatId}/leave`, {
        method: 'POST'
      })

      if (res.ok) {
        if (selectedChatId === chatId) {
          setSelectedChatId(null)
          setMessages([])
        }
        fetchChats()
        setShowChatMenu(null)
      }
    } catch (error) {
      console.error('Error leaving chat:', error)
    }
  }

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedChatId || !socket.connected) return
    
    socket.startTyping(selectedChatId)
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedChatId) {
        socket.stopTyping(selectedChatId)
      }
    }, 2000)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId) return

    const messageText = newMessage.trim()
    setNewMessage('')
    setIsLoading(true)
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (socket.connected) {
      socket.stopTyping(selectedChatId)
    }

    // Try WebSocket first
    if (useWebSocket) {
      const sent = socket.sendMessage(selectedChatId, messageText)
      if (sent) {
        // Optimistic update
        const tempMessage: GroupChatMessage = {
          id: `temp-${Date.now()}`,
          user_id: currentUserId,
          user_name: currentUserName,
          user_avatar: currentUserAvatar,
          message: messageText,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, tempMessage])
        setIsLoading(false)
        return
      }
    }

    // Fallback to HTTP
    const tempMessage: GroupChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: currentUserId,
      user_name: currentUserName,
      user_avatar: currentUserAvatar,
      message: messageText,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMessage])

    try {
      const res = await fetch('/api/group-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, chatId: selectedChatId })
      })

      if (res.ok) {
        fetchMessages()
        fetchChats() // Update last message
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
        setNewMessage(messageText)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      setNewMessage(messageText)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedChat = chats.find(c => c.id === selectedChatId)

  // Get typing users (excluding self)
  const typingUserNames = Array.from(socket.typingUsers.values()).filter(name => name !== currentUserName)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col border-2 border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center justify-between border-b-2 border-slate-600">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Group Chats</h2>
            {selectedChat && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{participants} online</span>
              </div>
            )}
            {/* Connection status */}
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              useWebSocket ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
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
          {/* Left Sidebar - Chat List */}
          <div className="w-64 border-r border-slate-700 bg-slate-900/50 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Chats</h3>
                <button
                  onClick={() => setShowCreateChat(!showCreateChat)}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                  title="Create new chat"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {showCreateChat && (
                <div className="mt-3 space-y-3 p-3 bg-slate-800 rounded-lg border border-slate-600">
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="Chat name..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                  
                  {/* Member Search */}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-400">Add Members</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Search by name..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {showMemberSearch && memberSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {memberSearchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => addMember(user)}
                              className="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-3"
                            >
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.avatarName}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-semibold">
                                  {user.avatarName[0]}
                                </div>
                              )}
                              <span className="text-white text-sm">{user.avatarName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Members */}
                  {selectedMembers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-400">Selected Members:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 px-2 py-1 bg-slate-700 rounded-full"
                          >
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.avatarName}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-semibold">
                                {member.avatarName[0]}
                              </div>
                            )}
                            <span className="text-white text-xs">{member.avatarName}</span>
                            <button
                              onClick={() => removeMember(member.id)}
                              className="text-slate-400 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCreateChat}
                      disabled={!newChatName.trim()}
                      className="flex-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold rounded transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateChat(false)
                        setNewChatName('')
                        setSelectedMembers([])
                        setMemberSearchQuery('')
                        setShowMemberSearch(false)
                      }}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`relative group border-b border-slate-700 hover:bg-slate-800/50 transition-colors ${
                    selectedChatId === chat.id ? 'bg-slate-800' : ''
                  } ${chat.muted ? 'opacity-60' : ''}`}
                >
                  <button
                    onClick={() => setSelectedChatId(chat.id)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 border-2 border-amber-400/30">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-white text-sm truncate">{chat.name}</div>
                          {chat.muted && <BellOff className="w-3 h-3 text-slate-500 shrink-0" />}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {chat.lastMessage ? (
                            <>
                              <span className="font-medium">{chat.lastMessage.author}:</span> {chat.lastMessage.text}
                            </>
                          ) : (
                            `${chat.participantCount} participants`
                          )}
                        </div>
                      </div>
                      {!chat.muted && <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowChatMenu(showChatMenu === chat.id ? null : chat.id)
                    }}
                    className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showChatMenu === chat.id && (
                    <div className="absolute right-0 top-10 z-10 bg-slate-800 border border-slate-600 rounded-lg shadow-lg min-w-[150px]">
                      <button
                        onClick={() => handleMuteChat(chat.id, chat.muted)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                      >
                        {chat.muted ? (
                          <>
                            <Bell className="w-4 h-4" />
                            Unmute
                          </>
                        ) : (
                          <>
                            <BellOff className="w-4 h-4" />
                            Mute
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleLeaveChat(chat.id)}
                        className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Leave
                      </button>
                      {chat.name !== 'Main Group Chat' && (
                        <button
                          onClick={() => handleDeleteChat(chat.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {chats.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-sm">
                  No chats yet. Create one to get started!
                </div>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          {selectedChatId ? (
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3 justify-start">
                      {msg.user_avatar ? (
                        <img
                          src={msg.user_avatar}
                          alt={msg.user_name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border-2 border-amber-500/30"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 border-2 border-amber-500/30">
                          {msg.user_name[0]}
                        </div>
                      )}
                      <div className="max-w-[75%]">
                        <div className="text-xs text-amber-400 mb-1 font-semibold">{msg.user_name}</div>
                        <div className="rounded-lg px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200">
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {(() => {
                            const secondsAgo = differenceInSeconds(new Date(), new Date(msg.created_at))
                            if (secondsAgo < 10) return 'just now'
                            if (secondsAgo < 60) return `${secondsAgo} seconds ago`
                            return formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })
                          })()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator */}
              {typingUserNames.length > 0 && (
                <div className="px-4 py-2 text-sm text-slate-400 bg-slate-900/50 border-t border-slate-700">
                  <span className="italic">
                    {typingUserNames.length === 1 
                      ? `${typingUserNames[0]} is typing...`
                      : `${typingUserNames.slice(0, 2).join(', ')}${typingUserNames.length > 2 ? ` and ${typingUserNames.length - 2} others` : ''} are typing...`
                    }
                  </span>
                </div>
              )}

              {/* Message Input */}
              <div className="px-4 py-3 border-t-2 border-slate-700 bg-slate-800">
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
                    className="flex-1 px-4 py-2 bg-slate-900 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isLoading}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Select a Chat</h3>
                <p className="text-slate-400">
                  Choose a chat from the sidebar or create a new one to start messaging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
