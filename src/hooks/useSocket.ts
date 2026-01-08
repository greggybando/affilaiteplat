'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  userId: string
  enabled?: boolean
}

interface ChatMessage {
  id: string
  chat_id: string
  user_id: string
  message: string
  reply_to_id?: string
  created_at: string
  user_name: string
  user_avatar?: string
}

interface Notification {
  id: string
  type: 'like' | 'reply' | 'mention' | 'reply_to_comment' | 'chat'
  read: boolean
  createdAt: string
  actor: {
    id: string
    name: string
    avatar: string | null
  }
  post?: {
    id: string
    title: string
  } | null
  reply?: {
    id: string
    content: string
  } | null
  chatId?: string
  messagePreview?: string
}

interface ChatNotification {
  chatId: string
  senderName: string
  messagePreview: string
}

interface SocketState {
  connected: boolean
  error: string | null
  onlineCount: number
  typingUsers: Map<string, string> // userId -> userName
}

export function useSocket({ userId, enabled = true }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<SocketState>({
    connected: false,
    error: null,
    onlineCount: 0,
    typingUsers: new Map()
  })
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  
  // Message handlers stored in refs to avoid stale closures
  const messageHandlerRef = useRef<((msg: ChatMessage) => void) | null>(null)
  const deleteHandlerRef = useRef<((data: { messageId: string }) => void) | null>(null)
  const notificationHandlerRef = useRef<((notification: Notification) => void) | null>(null)
  const chatNotificationHandlerRef = useRef<((data: ChatNotification) => void) | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!enabled || !userId) return

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL
    
    // Fallback to polling if no WebSocket URL configured
    if (!wsUrl) {
      console.log('[Socket] No WEBSOCKET_URL configured, using polling fallback')
      return
    }

    console.log('[Socket] Connecting to:', wsUrl)

    const socket = io(wsUrl, {
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Socket] Connected')
      setState(prev => ({ ...prev, connected: true, error: null }))
      
      // Rejoin current chat if we had one
      if (currentChatId) {
        socket.emit('join_chat', currentChatId)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      setState(prev => ({ ...prev, connected: false }))
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message)
      setState(prev => ({ ...prev, error: err.message, connected: false }))
    })

    // Chat events
    socket.on('user_joined', (data) => {
      setState(prev => ({ ...prev, onlineCount: data.onlineCount }))
    })

    socket.on('user_left', (data) => {
      setState(prev => ({ ...prev, onlineCount: data.onlineCount }))
    })

    socket.on('new_message', (message: ChatMessage) => {
      if (messageHandlerRef.current) {
        messageHandlerRef.current(message)
      }
    })

    socket.on('message_deleted', (data: { messageId: string }) => {
      if (deleteHandlerRef.current) {
        deleteHandlerRef.current(data)
      }
    })

    socket.on('user_typing', (data: { userId: string; userName: string }) => {
      setState(prev => {
        const newTyping = new Map(prev.typingUsers)
        newTyping.set(data.userId, data.userName)
        return { ...prev, typingUsers: newTyping }
      })
    })

    socket.on('user_stopped_typing', (data: { userId: string }) => {
      setState(prev => {
        const newTyping = new Map(prev.typingUsers)
        newTyping.delete(data.userId)
        return { ...prev, typingUsers: newTyping }
      })
    })

    // Notification events
    socket.on('notification', (notification: Notification) => {
      console.log('[Socket] Received notification:', notification)
      if (notificationHandlerRef.current) {
        notificationHandlerRef.current(notification)
      }
    })

    // Chat notification (when not in the chat room)
    socket.on('chat_notification', (data: ChatNotification) => {
      console.log('[Socket] Received chat notification:', data)
      if (chatNotificationHandlerRef.current) {
        chatNotificationHandlerRef.current(data)
      }
    })

    socket.on('error', (data: { message: string }) => {
      console.error('[Socket] Server error:', data.message)
      setState(prev => ({ ...prev, error: data.message }))
    })

    return () => {
      console.log('[Socket] Cleaning up')
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId, enabled])

  // Join a chat room
  const joinChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_chat', chatId)
      setCurrentChatId(chatId)
    }
  }, [])

  // Leave a chat room
  const leaveChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_chat', chatId)
      if (currentChatId === chatId) {
        setCurrentChatId(null)
      }
    }
  }, [currentChatId])

  // Send a message
  const sendMessage = useCallback((chatId: string, message: string, replyToId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { chatId, message, replyToId })
      return true
    }
    return false
  }, [])

  // Delete a message
  const deleteMessage = useCallback((chatId: string, messageId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('delete_message', { chatId, messageId })
    }
  }, [])

  // Typing indicators
  const startTyping = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', chatId)
    }
  }, [])

  const stopTyping = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_stop', chatId)
    }
  }, [])

  // Register message handler
  const onMessage = useCallback((handler: (msg: ChatMessage) => void) => {
    messageHandlerRef.current = handler
  }, [])

  // Register delete handler
  const onMessageDeleted = useCallback((handler: (data: { messageId: string }) => void) => {
    deleteHandlerRef.current = handler
  }, [])

  // Register notification handler
  const onNotification = useCallback((handler: (notification: Notification) => void) => {
    notificationHandlerRef.current = handler
  }, [])

  // Register chat notification handler (for unread message badges)
  const onChatNotification = useCallback((handler: (data: ChatNotification) => void) => {
    chatNotificationHandlerRef.current = handler
  }, [])

  return {
    ...state,
    isSocketEnabled: !!process.env.NEXT_PUBLIC_WEBSOCKET_URL,
    joinChat,
    leaveChat,
    sendMessage,
    deleteMessage,
    startTyping,
    stopTyping,
    onMessage,
    onMessageDeleted,
    onNotification,
    onChatNotification
  }
}
