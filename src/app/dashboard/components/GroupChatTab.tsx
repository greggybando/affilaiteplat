'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Users, Plus, Bell, BellOff, Trash2, MoreVertical, Search, UserPlus, X, MessageCircle, LogOut, Settings, Zap } from 'lucide-react'
import { formatDistanceToNow, differenceInSeconds } from 'date-fns'
import Link from 'next/link'

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

interface GroupChatTabProps {
  affiliate: {
    id: string
    name: string
    avatar_name: string | null
    avatar_url: string | null
  }
  setIsDMModalOpen?: (open: boolean) => void
  glowIntensity?: number
}

export function GroupChatTab({ affiliate, setIsDMModalOpen, glowIntensity = 50 }: GroupChatTabProps) {
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

  useEffect(() => {
    fetchChats()
  }, [])

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 2000)
      return () => clearInterval(interval)
    }
  }, [selectedChatId])

  useEffect(() => {
    if (selectedChatId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, selectedChatId])

  const fetchChats = async () => {
    try {
      const res = await fetch('/api/group-chat/chats')
      const data = await res.json()
      if (res.ok) {
        setChats(data.chats || [])
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId || isLoading) return
    
    setIsLoading(true)
    const optimisticMessage: GroupChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: affiliate.id,
      user_name: affiliate.avatar_name || affiliate.name,
      user_avatar: affiliate.avatar_url,
      message: newMessage,
      created_at: new Date().toISOString()
    }
    
    setMessages([...messages, optimisticMessage])
    setNewMessage('')

    try {
      const res = await fetch('/api/group-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChatId,
          message: newMessage
        })
      })

      if (res.ok) {
        fetchMessages()
      } else {
        setMessages(messages)
        setNewMessage(newMessage)
        alert('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(messages)
      setNewMessage(newMessage)
      alert('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateChat = async () => {
    if (!newChatName.trim() || selectedMembers.length === 0) return

    try {
      const res = await fetch('/api/group-chat/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChatName,
          memberIds: selectedMembers.map(m => m.id)
        })
      })

      if (res.ok) {
        setShowCreateChat(false)
        setNewChatName('')
        setSelectedMembers([])
        setMemberSearchQuery('')
        fetchChats()
      } else {
        alert('Failed to create chat')
      }
    } catch (error) {
      console.error('Error creating chat:', error)
      alert('Failed to create chat')
    }
  }

  const handleMuteChat = async (chatId: string, currentlyMuted: boolean) => {
    try {
      const res = await fetch(`/api/group-chat/chats/${chatId}/mute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: !currentlyMuted })
      })

      if (res.ok) {
        fetchChats()
        setShowChatMenu(null)
      }
    } catch (error) {
      console.error('Error muting chat:', error)
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
        }
        fetchChats()
        setShowChatMenu(null)
      }
    } catch (error) {
      console.error('Error leaving chat:', error)
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    if (!confirm('Are you sure you want to delete this chat? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/group-chat/chats/${chatId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        if (selectedChatId === chatId) {
          setSelectedChatId(null)
        }
        fetchChats()
        setShowChatMenu(null)
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  useEffect(() => {
    if (memberSearchQuery.trim()) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/pods/search?q=${encodeURIComponent(memberSearchQuery)}`)
          const data = await res.json()
          const affiliates = data.affiliates || []
          const filtered = affiliates.filter(
            (aff: User) => !selectedMembers.some((m) => m.id === aff.id) && aff.id !== affiliate.id
          )
          setMemberSearchResults(filtered)
          setShowMemberSearch(filtered.length > 0)
        } catch (error) {
          console.error('Error searching members:', error)
        }
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

  const addMember = (user: User) => {
    if (!selectedMembers.find(m => m.id === user.id)) {
      setSelectedMembers([...selectedMembers, user])
    }
    setMemberSearchQuery('')
    setShowMemberSearch(false)
  }

  const removeMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId))
  }

  const selectedChat = chats.find(c => c.id === selectedChatId)

  return (
    <div className="flex h-full bg-slate-50 w-full">
      {/* Sidebar */}
      <div className="w-[250px] text-white flex flex-col shrink-0" style={{ width: '250px', flexShrink: 0, background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)' }}>
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <div className="font-bold text-sm">LifeDesign</div>
              <div className="text-[10px] text-slate-400">2,847 members</div>
            </div>
          </div>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="text-[10px] text-[rgba(255,255,255,0.6)] mb-3 font-semibold uppercase tracking-wider px-2">Navigation</div>
          {[
            { id: 'community', icon: '💬', label: 'Community' },
            { id: 'classroom', icon: '📚', label: 'Classroom' },
            { id: 'members', icon: '👥', label: 'Members' },
            ...((affiliate as any).role === 'admin' || (affiliate as any).role === 'moderator' 
              ? [{ id: 'admin', icon: '⚙️', label: 'Admin', href: '/community/admin' }]
              : []
            ),
          ].map(item => {
            const hasHref = !!(item as any).href
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'community' || item.id === 'classroom') {
                    window.location.href = '/dashboard'
                  } else if (hasHref) {
                    window.location.href = (item as any).href
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all ${
                  false // groupchat is always active here
                    ? 'text-white'
                    : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}

          <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 text-left transition-all text-white"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                border: '1px solid rgba(34,211,238,0.3)'
              }}
            >
              <span className="text-base">💬</span>
              <span className="font-medium">Group Chat</span>
              <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
          </div>

          <div className="mt-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] rounded-2xl p-4 border border-[rgba(255,255,255,0.1)]" style={{ backdropFilter: 'blur(10px)' }}>
            <div className="text-xs font-semibold mb-2 text-white">Your Progress</div>
            <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full mb-2 overflow-hidden">
              <div 
                className="h-full rounded-full"
                style={{
                  width: '42%',
                  background: 'linear-gradient(135deg, #22d3ee, #06b6d4)'
                }}
              />
            </div>
            <div className="text-[11px] text-[rgba(255,255,255,0.6)]">15 of 36 lessons completed</div>
          </div>
        </div>

        <div className="p-4 border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px]" style={{ backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center gap-3 mb-3">
            {affiliate.avatar_url ? (
              <img 
                src={affiliate.avatar_url} 
                alt={affiliate.avatar_name || affiliate.name} 
                className="w-10 h-10 rounded-full border-2"
                style={{
                  borderColor: 'rgba(34,211,238,0.5)'
                }}
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2"
                style={{
                  background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                  borderColor: 'rgba(34,211,238,0.5)',
                  borderWidth: '2px',
                  borderStyle: 'solid'
                }}
              >
                <span className="text-white">{(affiliate.avatar_name || affiliate.name).substring(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-white">{affiliate.avatar_name || affiliate.name}</div>
              <div className="text-[10px] text-[rgba(255,255,255,0.6)]">Member</div>
            </div>
          </div>
          <div className="flex gap-2">
            {setIsDMModalOpen && (
              <button
                onClick={() => setIsDMModalOpen(true)}
                className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 text-white"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Messages
              </button>
            )}
            <Link
              href="/settings"
              className="px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] rounded-xl transition-colors flex items-center justify-center"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-white" />
            </Link>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/login'
              }}
              className="px-3 py-2 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] rounded-xl transition-colors flex items-center justify-center"
              title="Log out"
            >
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 h-full w-full min-w-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center justify-between border-b-2 border-slate-600 shrink-0">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Group Chats</h2>
            {selectedChat && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{participants} online</span>
              </div>
            )}
          </div>
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
                          </>) : (
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

              {/* Message Input */}
              <div className="px-4 py-3 border-t-2 border-slate-700 bg-slate-800 shrink-0">
                <div className="flex gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
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

