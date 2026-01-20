'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Users, Plus, Bell, BellOff, Trash2, MoreVertical, Search, UserPlus, X, MessageCircle, LogOut, Settings, Zap, Wifi, WifiOff } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'

// Helper to get main chat ID
const getMainChatId = (chats: GroupChat[]): string | null => {
  const mainChat = chats.find(c => c.name === 'Main Group Chat')
  return mainChat?.id || (chats.length > 0 ? chats[0].id : null)
}
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // WebSocket connection
  const socket = useSocket({ userId: affiliate.id })
  const useWebSocket = socket.isSocketEnabled && socket.connected

  // Get main chat ID
  const mainChatId = chats.length > 0 ? getMainChatId(chats) : null

  // Handle incoming WebSocket messages
  const handleSocketMessage = useCallback((msg: any) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === msg.id)) return prev
      return [...prev, {
        id: msg.id,
        user_id: msg.user_id,
        user_name: msg.user_name,
        user_avatar: msg.user_avatar,
        message: msg.message,
        created_at: msg.created_at
      }]
    })
  }, [])

  // Handle message deletion via WebSocket
  const handleSocketDelete = useCallback((data: { messageId: string }) => {
    setMessages(prev => prev.filter(m => m.id !== data.messageId))
  }, [])

  // Register socket handlers
  useEffect(() => {
    if (useWebSocket) {
      socket.onMessage(handleSocketMessage)
      socket.onMessageDeleted(handleSocketDelete)
    }
  }, [useWebSocket, socket, handleSocketMessage, handleSocketDelete])

  // Update online count from socket
  useEffect(() => {
    if (useWebSocket && socket.onlineCount > 0) {
      setParticipants(socket.onlineCount)
    }
  }, [useWebSocket, socket.onlineCount])

  useEffect(() => {
    // Auto-join Main Group Chat first, then fetch chats
    const initializeChat = async () => {
      try {
        await fetch('/api/group-chat/join-main', { method: 'POST' })
      } catch (error) {
        console.error('Error auto-joining Main Group Chat:', error)
      }
      await fetchChats()
    }
    initializeChat()
  }, [])

  // Auto-select main chat on first load
  useEffect(() => {
    if (mainChatId && !selectedChatId) {
      setSelectedChatId(mainChatId)
    }
  }, [mainChatId])

  // Handle chat selection and message fetching
  useEffect(() => {
    if (selectedChatId) {
      // Clear messages when switching chats
      setMessages([])
      setNewMessage('')
      
      // Join WebSocket room if connected
      if (useWebSocket) {
        socket.joinChat(selectedChatId)
      }
      
      // Fetch initial messages
      fetchMessages()
      
      // Only use polling if WebSocket is not connected
      if (!useWebSocket) {
        const interval = setInterval(fetchMessages, 2000)
        return () => clearInterval(interval)
      }
    } else {
      // Clear messages if no chat is selected
      setMessages([])
      setNewMessage('')
    }
    
    // Cleanup: leave chat room when switching
    return () => {
      if (selectedChatId && useWebSocket) {
        socket.leaveChat(selectedChatId)
      }
    }
  }, [selectedChatId, useWebSocket])

  useEffect(() => {
    if (selectedChatId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, selectedChatId])

  const fetchChats = async (preserveSelection: boolean = false) => {
    try {
      const res = await fetch('/api/group-chat/chats')
      const data = await res.json()
      if (res.ok) {
        const currentSelectedId = selectedChatId
        const fetchedChats = data.chats || []
        
        // If preserving selection, merge with existing chats to keep optimistic updates
        if (preserveSelection && currentSelectedId) {
          setChats(prev => {
            // Check if the selected chat is in the fetched list
            const selectedChatInFetched = fetchedChats.find((c: GroupChat) => c.id === currentSelectedId)
            
            // If not, keep it from previous state (optimistic update)
            if (!selectedChatInFetched) {
              const selectedChatFromPrev = prev.find(c => c.id === currentSelectedId)
              if (selectedChatFromPrev) {
                // Merge: fetched chats + the selected chat from previous state
                return [...fetchedChats, selectedChatFromPrev]
              }
            }
            
            // Otherwise, just use fetched chats
            return fetchedChats
          })
        } else {
          setChats(fetchedChats)
        }
        
        // Only auto-select main chat if no chat is selected and we're not preserving selection
        if (!preserveSelection && !currentSelectedId && fetchedChats.length > 0) {
          const mainId = getMainChatId(fetchedChats)
          if (mainId) {
            setSelectedChatId(mainId)
          }
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

  const handleSendMessage = async (retryCount = 0) => {
    if (!newMessage.trim() || !selectedChatId || isLoading) return
    
    const messageToSend = newMessage
    setNewMessage('')
    
    // Use WebSocket if connected (message will come back via socket event)
    if (false && useWebSocket && selectedChatId) {
      console.log('[Chat] Attempting WebSocket send:', { selectedChatId, messageLength: messageToSend.length, connected: socket.connected })
      const sent = socket.sendMessage(selectedChatId!, messageToSend)
      if (!sent) {
        // Fallback to HTTP if socket send fails
        console.log('[Chat] WebSocket send failed, falling back to HTTP')
      } else {
        console.log('[Chat] WebSocket send succeeded, waiting for message event')
        // Stop typing indicator
        socket.stopTyping(selectedChatId!)
        return // Message will arrive via WebSocket event
      }
    } else {
      console.log('[Chat] WebSocket not available, using HTTP fallback')
    }
    
    // HTTP fallback (or if WebSocket is not available)
    setIsLoading(true)
    const optimisticMessage: GroupChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: affiliate.id,
      user_name: affiliate.avatar_name || affiliate.name,
      user_avatar: affiliate.avatar_url,
      message: messageToSend,
      created_at: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, optimisticMessage])

    try {
      const res = await fetch('/api/group-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChatId,
          message: messageToSend
        })
      })

      if (res.ok) {
        fetchMessages()
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to send message:', errorData, 'Retry count:', retryCount)
        
        // If "Not a participant" error and we haven't retried yet, wait and retry
        if (errorData.error === 'Not a participant' && retryCount < 2) {
          // Wait a bit for participant record to be committed, then retry
          setTimeout(() => {
            setNewMessage(messageToSend)
            handleSendMessage(retryCount + 1)
          }, 1000 * (retryCount + 1)) // Exponential backoff: 1s, 2s
          return
        }
        
        // Revert optimistic update
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
        setNewMessage(messageToSend)
        alert(errorData.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Revert optimistic update
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      setNewMessage(messageToSend)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (useWebSocket && selectedChatId) {
      socket.startTyping(selectedChatId)
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        socket.stopTyping(selectedChatId)
      }, 2000)
    }
  }, [useWebSocket, selectedChatId, socket])

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
        const data = await res.json()
        const newChatId = data.chat?.id
        
        setShowCreateChat(false)
        setNewChatName('')
        setSelectedMembers([])
        setMemberSearchQuery('')
        setShowMemberSearch(false)
        
        // Immediately add the new chat to the list optimistically
        if (newChatId && data.chat) {
          const newChat: GroupChat = {
            id: newChatId,
            name: data.chat.name || newChatName,
            muted: false,
            participantCount: selectedMembers.length + 1, // creator + members
            lastMessage: null
          }
          setChats(prev => {
            // Add new chat to the list (it will appear below main chat)
            // Check if it already exists to avoid duplicates
            if (prev.find(c => c.id === newChatId)) {
              return prev
            }
            return [...prev, newChat]
          })
          // Select the newly created chat
          setSelectedChatId(newChatId)
          
        // Wait a bit for the database to update, then fetch to get the full details
        // Use a longer delay to ensure the participant record is committed
        setTimeout(async () => {
          // Fetch and merge, preserving our optimistic chat
          try {
            const res = await fetch('/api/group-chat/chats')
            const fetchData = await res.json()
            if (res.ok) {
              const fetchedChats = fetchData.chats || []
              setChats(prev => {
                // Check if the new chat is in the fetched results
                const newChatInFetched = fetchedChats.find((c: GroupChat) => c.id === newChatId)
                
                if (newChatInFetched) {
                  // If it's in the fetched results, use those (they have full details)
                  return fetchedChats
                } else {
                  // If not, merge: keep our optimistic chat + fetched chats
                  const existingOptimistic = prev.find(c => c.id === newChatId)
                  if (existingOptimistic) {
                    // Remove duplicates and merge
                    const merged = [...fetchedChats]
                    if (!merged.find(c => c.id === newChatId)) {
                      merged.push(existingOptimistic)
                    }
                    return merged
                  }
                  return fetchedChats
                }
              })
            }
          } catch (error) {
            console.error('Error fetching chats after creation:', error)
            // Don't update on error, keep the optimistic chat
          }
        }, 1500) // Increased delay to 1.5 seconds to ensure participant record is committed
        }
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to create chat')
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

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/group-chat/messages/${messageId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        // Optimistically remove message from UI
        setMessages(messages.filter(msg => msg.id !== messageId))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message')
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
                <div className="w-5 h-5 flex items-center justify-center">
                  {item.id === 'community' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" 
                        stroke="rgba(120,120,120,0.8)" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                        }}
                      />
                      <path d="M7 9h10M7 13h6" 
                        stroke="rgba(120,120,120,0.8)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {item.id === 'classroom' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" 
                        stroke="rgba(120,120,120,0.8)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                      <path d="M6 16V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" 
                        stroke="rgba(120,120,120,0.8)" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                        }}
                      />
                      <path d="M10 6h4M10 10h4M10 14h4" 
                        stroke="rgba(120,120,120,0.8)" 
                        strokeWidth="1" 
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {item.id === 'members' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" 
                        stroke="rgba(120,120,120,0.8)" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                        }}
                      />
                      <circle cx="9" cy="7" r="4" 
                        stroke="rgba(120,120,120,0.8)" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1))'
                        }}
                      />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" 
                        stroke="rgba(120,120,120,0.8)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {item.id === 'admin' && (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                      <circle cx="12" cy="12" r="3" 
                        stroke="rgba(34,211,238,0.9)" 
                        strokeWidth="1.5" 
                        fill="rgba(60,60,60,0.8)"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1)) drop-shadow(0 0 4px rgba(34,211,238,0.6))'
                        }}
                      />
                      <path d="M12 1v6m0 6v6M1 12h6m6 0h6" 
                        stroke="rgba(34,211,238,0.9)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))'
                        }}
                      />
                      <path d="M19.07 4.93l-4.24 4.24m0 5.66l4.24 4.24M4.93 19.07l4.24-4.24m0-5.66L4.93 4.93" 
                        stroke="rgba(34,211,238,0.9)" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        style={{
                          filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))'
                        }}
                      />
                    </svg>
                  )}
                </div>
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
      <div className="flex-1 flex flex-col overflow-hidden h-full w-full min-w-0" style={{ backgroundColor: '#0f0f1a' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{
          background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
          borderBottom: '2px solid rgba(34,211,238,0.3)',
          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.8)'
        }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" 
                  stroke="rgba(34,211,238,0.9)" 
                  strokeWidth="1.5" 
                  fill="rgba(60,60,60,0.8)"
                  style={{
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8)) drop-shadow(inset 0 1px 1px rgba(255,255,255,0.1)) drop-shadow(0 0 6px rgba(34,211,238,0.6))'
                  }}
                />
                <path d="M7 9h10M7 13h6" 
                  stroke="rgba(34,211,238,0.9)" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                  style={{
                    filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))'
                  }}
                />
              </svg>
              <div className="absolute -bottom-0.5 -right-0.5 text-[6px] font-bold leading-none" style={{
                color: '#fde047',
                textShadow: '0 0 3px rgba(253,224,71,0.8), 0 1px 1px rgba(0,0,0,0.9)',
                filter: 'drop-shadow(0 0 2px rgba(253,224,71,0.6))',
                background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 50%, rgba(30,30,30,0.95) 100%)',
                padding: '1px 2px',
                borderRadius: '2px',
                border: '0.5px solid rgba(253,224,71,0.3)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.9)'
              }}>
                ld
              </div>
            </div>
            <h2 className="text-xl font-bold" style={{ 
              color: 'rgba(34,211,238,0.95)',
              textShadow: '0 0 8px rgba(34,211,238,0.6), 0 1px 2px rgba(0,0,0,0.8)'
            }}>Group Chats</h2>
            {selectedChat && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2" style={{ color: 'rgba(34,211,238,0.8)' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ 
                    backgroundColor: 'rgba(34,211,238,0.8)',
                    boxShadow: '0 0 6px rgba(34,211,238,0.6)'
                  }}></div>
                  <span>{participants} online</span>
                </div>
                {/* WebSocket connection indicator */}
                {socket.isSocketEnabled && (
                  <div className={`flex items-center gap-1 text-xs ${socket.connected ? 'text-green-400' : 'text-yellow-400'}`}>
                    {socket.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span>{socket.connected ? 'Real-time' : 'Polling'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Chat List */}
          <div className="w-64 flex flex-col" style={{
            borderRight: '1px solid rgba(34,211,238,0.2)',
            background: 'linear-gradient(135deg, rgba(20,20,25,0.95) 0%, rgba(15,15,20,0.98) 100%)'
          }}>
            <div className="p-4" style={{ borderBottom: '1px solid rgba(34,211,238,0.2)' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'rgba(34,211,238,0.8)' }}>Chats</h3>
                <button
                  onClick={() => setShowCreateChat(!showCreateChat)}
                  className="transition-all"
                  style={{ 
                    color: 'rgba(34,211,238,0.8)',
                    filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.4))'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(34,211,238,1)'
                    e.currentTarget.style.filter = 'drop-shadow(0 0 6px rgba(34,211,238,0.6))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(34,211,238,0.8)'
                    e.currentTarget.style.filter = 'drop-shadow(0 0 4px rgba(34,211,238,0.4))'
                  }}
                  title="Create new chat"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {showCreateChat && (
                <div className="mt-3 space-y-3 p-3 rounded-lg" style={{
                  background: 'linear-gradient(135deg, rgba(60,60,60,0.8) 0%, rgba(40,40,40,0.9) 100%)',
                  border: '1px solid rgba(34,211,238,0.3)',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.8)'
                }}>
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="Chat name..."
                    className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                    style={{
                      background: 'rgba(20,20,25,0.8)',
                      border: '1px solid rgba(34,211,238,0.3)',
                      color: 'rgba(255,255,255,0.9)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(34,211,238,0.6)'
                      e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.5), 0 0 8px rgba(34,211,238,0.3)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(34,211,238,0.3)'
                      e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.5)'
                    }}
                    autoFocus
                  />
                  
                  {/* Member Search */}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="w-4 h-4" style={{ color: 'rgba(34,211,238,0.8)' }} />
                      <span className="text-xs" style={{ color: 'rgba(34,211,238,0.8)' }}>Add Members</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(34,211,238,0.6)' }} />
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Search by name..."
                        className="w-full pl-9 pr-3 py-2 rounded text-sm focus:outline-none"
                        style={{
                          background: 'rgba(20,20,25,0.8)',
                          border: '1px solid rgba(34,211,238,0.3)',
                          color: 'rgba(255,255,255,0.9)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'rgba(34,211,238,0.6)'
                          e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.5), 0 0 8px rgba(34,211,238,0.3)'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(34,211,238,0.3)'
                          e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.5)'
                        }}
                      />
                      {showMemberSearch && memberSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{
                          background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 100%)',
                          border: '1px solid rgba(34,211,238,0.3)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.8), 0 0 8px rgba(34,211,238,0.2)'
                        }}>
                          {memberSearchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => addMember(user)}
                              className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors"
                              style={{
                                color: 'rgba(255,255,255,0.9)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(34,211,238,0.1)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.avatarName}
                                  className="w-8 h-8 rounded-full object-cover border-2"
                                  style={{ borderColor: 'rgba(34,211,238,0.3)' }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2"
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(34,211,238,0.8), rgba(6,182,212,0.8))',
                                    borderColor: 'rgba(34,211,238,0.3)',
                                    boxShadow: '0 0 8px rgba(34,211,238,0.2)'
                                  }}
                                >
                                  {user.avatarName[0]}
                                </div>
                              )}
                              <span className="text-sm">{user.avatarName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Members */}
                  {selectedMembers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs" style={{ color: 'rgba(34,211,238,0.8)' }}>Selected Members:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 px-2 py-1 rounded-full"
                            style={{
                              background: 'linear-gradient(135deg, rgba(60,60,60,0.8) 0%, rgba(40,40,40,0.9) 100%)',
                              border: '1px solid rgba(34,211,238,0.3)',
                              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)'
                            }}
                          >
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.avatarName}
                                className="w-5 h-5 rounded-full object-cover border"
                                style={{ borderColor: 'rgba(34,211,238,0.3)' }}
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold border"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(34,211,238,0.8), rgba(6,182,212,0.8))',
                                  borderColor: 'rgba(34,211,238,0.3)'
                                }}
                              >
                                {member.avatarName[0]}
                              </div>
                            )}
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.9)' }}>{member.avatarName}</span>
                            <button
                              onClick={() => removeMember(member.id)}
                              className="transition-colors"
                              style={{ color: 'rgba(34,211,238,0.6)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ef4444'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'rgba(34,211,238,0.6)'
                              }}
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
                      className="flex-1 px-3 py-1.5 text-sm font-semibold rounded transition-all"
                      style={!newChatName.trim() ? {
                        background: 'rgba(60,60,60,0.5)',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'not-allowed'
                      } : {
                        background: 'linear-gradient(135deg, rgba(34,211,238,0.9), rgba(6,182,212,0.9))',
                        border: '1px solid rgba(34,211,238,0.5)',
                        boxShadow: '0 0 12px rgba(34,211,238,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                        color: '#ffffff',
                        textShadow: '0 0 8px rgba(34,211,238,0.6)'
                      }}
                      onMouseEnter={(e) => {
                        if (newChatName.trim()) {
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(34,211,238,0.7), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (newChatName.trim()) {
                          e.currentTarget.style.boxShadow = '0 0 12px rgba(34,211,238,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                        }
                      }}
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
                      className="px-3 py-1.5 text-sm rounded transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(60,60,60,0.8) 0%, rgba(40,40,40,0.9) 100%)',
                        border: '1px solid rgba(34,211,238,0.3)',
                        color: 'rgba(255,255,255,0.9)',
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(70,70,70,0.8) 0%, rgba(50,50,50,0.9) 100%)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)'
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(60,60,60,0.8) 0%, rgba(40,40,40,0.9) 100%)'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Main Chat First */}
              {mainChatId && chats.find(c => c.id === mainChatId) && (
                (() => {
                  const mainChat = chats.find(c => c.id === mainChatId)!
                  return (
                    <div
                      key={mainChat.id}
                      className={`relative group transition-all ${
                        selectedChatId === mainChat.id ? '' : ''
                      } ${mainChat.muted ? 'opacity-60' : ''}`}
                      style={{
                        borderBottom: '1px solid rgba(34,211,238,0.1)',
                        background: selectedChatId === mainChat.id 
                          ? 'linear-gradient(135deg, rgba(60,60,60,0.4) 0%, rgba(40,40,40,0.5) 100%)'
                          : 'transparent',
                        borderLeft: selectedChatId === mainChat.id ? '3px solid rgba(34,211,238,0.6)' : '3px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedChatId !== mainChat.id) {
                          e.currentTarget.style.background = 'rgba(34,211,238,0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedChatId !== mainChat.id) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <button
                        onClick={() => {
                          console.log('Main chat clicked:', mainChat.id)
                          setSelectedChatId(mainChat.id)
                        }}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2"
                            style={{
                              background: 'linear-gradient(135deg, rgba(34,211,238,0.8), rgba(6,182,212,0.8))',
                              borderColor: 'rgba(34,211,238,0.3)',
                              boxShadow: '0 0 8px rgba(34,211,238,0.2)'
                            }}
                          >
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-sm truncate" style={{ color: 'rgba(255,255,255,0.95)' }}>{mainChat.name}</div>
                              {mainChat.muted && <BellOff className="w-3 h-3 shrink-0" style={{ color: 'rgba(34,211,238,0.6)' }} />}
                            </div>
                            <div className="text-xs truncate" style={{ color: 'rgba(34,211,238,0.7)' }}>
                              {mainChat.lastMessage ? (
                                <>
                                  <span className="font-medium">{mainChat.lastMessage.author}:</span> {mainChat.lastMessage.text}
                                </>
                              ) : (
                                `${mainChat.participantCount} participants`
                              )}
                            </div>
                          </div>
                          {!mainChat.muted && <div className="w-2 h-2 rounded-full shrink-0" style={{ 
                            backgroundColor: 'rgba(34,211,238,0.8)',
                            boxShadow: '0 0 6px rgba(34,211,238,0.6)'
                          }}></div>}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowChatMenu(showChatMenu === mainChat.id ? null : mainChat.id)
                        }}
                        className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'rgba(34,211,238,0.6)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'rgba(34,211,238,0.9)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'rgba(34,211,238,0.6)'
                        }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {showChatMenu === mainChat.id && (
                        <div className="absolute right-0 top-10 z-10 rounded-lg shadow-lg min-w-[150px]"
                          style={{
                            background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 100%)',
                            border: '1px solid rgba(34,211,238,0.3)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.8), 0 0 8px rgba(34,211,238,0.2)'
                          }}>
                          <button
                            onClick={() => {
                              handleMuteChat(mainChat.id, mainChat.muted)
                            }}
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                            style={{ color: 'rgba(255,255,255,0.9)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(34,211,238,0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            {mainChat.muted ? (
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
                        </div>
                      )}
                    </div>
                  )
                })()
              )}
              
              {/* Other Chats Below Main Chat */}
              {chats.filter(c => c.id !== mainChatId).map((chat) => (
                <div
                  key={chat.id}
                  className={`relative group transition-all ${
                    selectedChatId === chat.id ? '' : ''
                  } ${chat.muted ? 'opacity-60' : ''}`}
                  style={{
                    borderBottom: '1px solid rgba(34,211,238,0.1)',
                    background: selectedChatId === chat.id 
                      ? 'linear-gradient(135deg, rgba(60,60,60,0.4) 0%, rgba(40,40,40,0.5) 100%)'
                      : 'transparent',
                    borderLeft: selectedChatId === chat.id ? '3px solid rgba(34,211,238,0.6)' : '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedChatId !== chat.id) {
                      e.currentTarget.style.background = 'rgba(34,211,238,0.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedChatId !== chat.id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('Chat clicked:', chat.id, chat.name)
                      setSelectedChatId(chat.id)
                    }}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2"
                        style={{
                          background: 'linear-gradient(135deg, rgba(34,211,238,0.8), rgba(6,182,212,0.8))',
                          borderColor: 'rgba(34,211,238,0.3)',
                          boxShadow: '0 0 8px rgba(34,211,238,0.2)'
                        }}
                      >
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-sm truncate" style={{ color: 'rgba(255,255,255,0.95)' }}>{chat.name}</div>
                          {chat.muted && <BellOff className="w-3 h-3 shrink-0" style={{ color: 'rgba(34,211,238,0.6)' }} />}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'rgba(34,211,238,0.7)' }}>
                          {chat.lastMessage ? (
                            <>
                              <span className="font-medium">{chat.lastMessage.author}:</span> {chat.lastMessage.text}
                            </>
                          ) : (
                            `${chat.participantCount} participants`
                          )}
                        </div>
                      </div>
                      {!chat.muted && <div className="w-2 h-2 rounded-full shrink-0" style={{ 
                        backgroundColor: 'rgba(34,211,238,0.8)',
                        boxShadow: '0 0 6px rgba(34,211,238,0.6)'
                      }}></div>}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowChatMenu(showChatMenu === chat.id ? null : chat.id)
                    }}
                    className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'rgba(34,211,238,0.6)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgba(34,211,238,0.9)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(34,211,238,0.6)'
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showChatMenu === chat.id && (
                    <div className="absolute right-0 top-10 z-10 rounded-lg shadow-lg min-w-[150px]"
                      style={{
                        background: 'linear-gradient(135deg, rgba(60,60,60,0.95) 0%, rgba(40,40,40,0.98) 100%)',
                        border: '1px solid rgba(34,211,238,0.3)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.8), 0 0 8px rgba(34,211,238,0.2)'
                      }}>
                      <button
                        onClick={() => {
                          handleMuteChat(chat.id, chat.muted)
                        }}
                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                        style={{ color: 'rgba(255,255,255,0.9)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(34,211,238,0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
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
                      {chat.name !== 'Main Group Chat' && (
                        <>
                          <div className="border-t border-[rgba(34,211,238,0.2)] my-1"></div>
                          <button
                            onClick={() => {
                              handleLeaveChat(chat.id)
                            }}
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                            style={{ color: 'rgba(255,255,255,0.9)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(34,211,238,0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <LogOut className="w-4 h-4" />
                            Leave
                          </button>
                          <div className="border-t border-[rgba(34,211,238,0.2)] my-1"></div>
                          <button
                            onClick={() => {
                              handleDeleteChat(chat.id)
                            }}
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                            style={{ color: '#ef4444' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {chats.length === 0 && (
                <div className="p-4 text-center text-sm" style={{ color: 'rgba(34,211,238,0.6)' }}>
                  No chats yet. Create one to get started!
                </div>
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          {selectedChatId ? (
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2" style={{ backgroundColor: '#0f0f1a' }}>
                {messages.length === 0 ? (
                  <div className="text-center text-[rgba(255,255,255,0.6)] py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwnMessage = msg.user_id === affiliate.id
                    const prevMessage = index > 0 ? messages[index - 1] : null
                    const showName = !prevMessage || prevMessage.user_id !== msg.user_id || 
                      differenceInSeconds(new Date(msg.created_at), new Date(prevMessage.created_at)) > 300
                    
                    return (
                      <div key={msg.id} className="flex gap-2 justify-start group">
                        <div className="flex-shrink-0" style={{ width: '32px' }}>
                          {msg.user_avatar ? (
                            <img
                              src={msg.user_avatar}
                              alt={msg.user_name}
                              className="w-8 h-8 rounded-full object-cover border-2"
                              style={{
                                borderColor: 'rgba(34,211,238,0.3)',
                                boxShadow: '0 0 8px rgba(34,211,238,0.2)'
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2"
                              style={{
                                background: 'linear-gradient(135deg, rgba(34,211,238,0.8), rgba(6,182,212,0.8))',
                                borderColor: 'rgba(34,211,238,0.3)',
                                boxShadow: '0 0 8px rgba(34,211,238,0.2)'
                              }}
                            >
                              {msg.user_name[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start max-w-[75%]">
                          {showName && (
                            <div className="text-xs mb-1 px-2 flex items-center gap-2" style={{ color: 'rgba(34,211,238,0.8)' }}>
                              <span>{msg.user_name}</span>
                              {msg.user_id !== affiliate.id && (
                                <a
                                  href={`/messages?user=${msg.user_id}`}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    window.location.href = `/dashboard?openDM=${msg.user_id}`
                                  }}
                                  className="p-0.5 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors"
                                  title={`Message ${msg.user_name}`}
                                >
                                  <MessageCircle className="w-3 h-3 text-cyan-400" />
                                </a>
                              )}
                            </div>
                          )}
                          <div className="relative group/message w-full">
                            <div 
                              className="rounded-2xl rounded-bl-sm px-4 py-2 relative"
                              style={{
                                background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(6,182,212,0.2))',
                                border: '1px solid rgba(34,211,238,0.4)',
                                boxShadow: `
                                  0 2px 8px rgba(0,0,0,0.3),
                                  inset 0 1px 0 rgba(255,255,255,0.1),
                                  0 0 12px rgba(34,211,238,0.4),
                                  0 0 20px rgba(34,211,238,0.2)
                                `,
                                color: 'rgba(255,255,255,0.95)',
                                maxWidth: '100%',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                overflow: 'hidden',
                                textShadow: '0 0 4px rgba(34,211,238,0.3)'
                              }}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words pr-6" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>{msg.message}</p>
                              <div 
                                className="absolute bottom-1 right-1 text-[8px] font-bold leading-none"
                                style={{
                                  color: '#fde047',
                                  textShadow: '0 0 4px rgba(253,224,71,0.6), 0 1px 2px rgba(0,0,0,0.8)',
                                  opacity: 0.7
                                }}
                              >
                                ld
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 px-2">
                            <div 
                              className="text-[10px] text-left"
                              style={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                              {(() => {
                                const secondsAgo = differenceInSeconds(new Date(), new Date(msg.created_at))
                                if (secondsAgo < 10) return 'just now'
                                if (secondsAgo < 60) return `${secondsAgo}s`
                                if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m`
                                return formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })
                              })()}
                            </div>
                            {isOwnMessage && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-[10px] hover:underline transition-opacity"
                                style={{ color: '#ef4444' }}
                              >
                                delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-4 py-3 border-t-2 border-slate-700 bg-slate-800 shrink-0">
                {/* Typing indicator */}
                {socket.typingUsers.size > 0 && (
                  <div className="px-4 py-1 text-xs text-slate-400 italic">
                    {Array.from(socket.typingUsers.values()).join(', ')} {socket.typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </div>
                )}
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
                        handleSendMessage(0)
                      }
                    }}
                    placeholder="Type a message..."
                    rows={2}
                    className="flex-1 px-4 py-2 bg-slate-900 border-2 border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleSendMessage(0)}
                    disabled={!newMessage.trim() || isLoading}
                    className="px-6 py-2 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                    style={{
                      background: !newMessage.trim() || isLoading 
                        ? 'rgb(71, 85, 105)' 
                        : 'linear-gradient(135deg, rgba(34,211,238,0.9), rgba(6,182,212,0.9))',
                      border: !newMessage.trim() || isLoading ? 'none' : '1px solid rgba(34,211,238,0.5)',
                      boxShadow: !newMessage.trim() || isLoading ? 'none' : '0 0 12px rgba(34,211,238,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                      textShadow: !newMessage.trim() || isLoading ? 'none' : '0 0 8px rgba(34,211,238,0.6)'
                    }}
                    onMouseEnter={(e) => {
                      if (!(!newMessage.trim() || isLoading)) {
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(34,211,238,0.7), inset 0 1px 0 rgba(255,255,255,0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(!newMessage.trim() || isLoading)) {
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(34,211,238,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                      }
                    }}
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

