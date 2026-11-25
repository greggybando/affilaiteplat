'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  userId: string
  enabled?: boolean
}

export interface ChatMessage {
  id: string
  chat_id: string
  user_id: string
  message: string
  reply_to_id?: string
  created_at: string
  user_name: string
  user_avatar?: string
  client_message_id?: string
  pending?: boolean
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

export interface DmMessage {
  id: string
  client_message_id?: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  user_name?: string
  user_avatar?: string
  pending?: boolean
  type?: 'dm'
}

export interface PodMessage {
  id: string
  client_message_id?: string
  pod_id: string
  affiliate_id: string
  message: string
  created_at: string
  avatarName?: string
  avatarUrl?: string | null
  pending?: boolean
  type?: 'pod'
}

interface SocketState {
  connected: boolean
  error: string | null
  onlineCount: number
  typingUsers: Map<string, string>
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return (
    localStorage.getItem('affiliate_token') ||
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('affiliate_token='))
      ?.split('=')[1] ||
    null
  )
}

function newClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useSocket({ userId, enabled = true }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<SocketState>({
    connected: false,
    error: null,
    onlineCount: 0,
    typingUsers: new Map(),
  })
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const currentChatIdRef = useRef<string | null>(null)

  const messageHandlerRef = useRef<((msg: ChatMessage) => void) | null>(null)
  const ackHandlerRef = useRef<((msg: ChatMessage) => void) | null>(null)
  const failHandlerRef = useRef<((data: { client_message_id: string }) => void) | null>(null)
  const deleteHandlerRef = useRef<((data: { messageId: string }) => void) | null>(null)
  const notificationHandlerRef = useRef<((notification: Notification) => void) | null>(null)
  const chatNotificationHandlerRef = useRef<((data: ChatNotification) => void) | null>(null)
  const dmHandlerRef = useRef<((msg: DmMessage) => void) | null>(null)
  const dmAckHandlerRef = useRef<((msg: DmMessage) => void) | null>(null)
  const podHandlerRef = useRef<((msg: PodMessage) => void) | null>(null)
  const podAckHandlerRef = useRef<((msg: PodMessage) => void) | null>(null)

  useEffect(() => {
    currentChatIdRef.current = currentChatId
  }, [currentChatId])

  useEffect(() => {
    if (!enabled || !userId) return

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL
    if (!wsUrl) {
      console.log('[Socket] No WEBSOCKET_URL configured')
      return
    }

    const token = getAuthToken()
    if (!token) {
      console.warn('[Socket] No auth token — cannot connect')
      setState((prev) => ({ ...prev, error: 'Missing auth token', connected: false }))
      return
    }

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 8000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setState((prev) => ({ ...prev, connected: true, error: null }))
      if (currentChatIdRef.current) {
        socket.emit('join_chat', currentChatIdRef.current)
      }
    })

    socket.on('disconnect', () => {
      setState((prev) => ({ ...prev, connected: false }))
    })

    socket.on('connect_error', (err) => {
      setState((prev) => ({ ...prev, error: err.message, connected: false }))
    })

    socket.on('user_joined', (data) => {
      setState((prev) => ({ ...prev, onlineCount: data.onlineCount }))
    })

    socket.on('user_left', (data) => {
      setState((prev) => ({ ...prev, onlineCount: data.onlineCount }))
    })

    socket.on('new_message', (message: ChatMessage) => {
      messageHandlerRef.current?.(message)
    })

    socket.on('message_ack', (message: ChatMessage) => {
      ackHandlerRef.current?.(message)
    })

    socket.on('message_failed', (data: { client_message_id: string }) => {
      failHandlerRef.current?.(data)
    })

    socket.on('message_deleted', (data: { messageId: string }) => {
      deleteHandlerRef.current?.(data)
    })

    socket.on('user_typing', (data: { userId: string; userName: string }) => {
      setState((prev) => {
        const next = new Map(prev.typingUsers)
        next.set(data.userId, data.userName)
        return { ...prev, typingUsers: next }
      })
    })

    socket.on('user_stopped_typing', (data: { userId: string }) => {
      setState((prev) => {
        const next = new Map(prev.typingUsers)
        next.delete(data.userId)
        return { ...prev, typingUsers: next }
      })
    })

    socket.on('notification', (notification: Notification) => {
      notificationHandlerRef.current?.(notification)
    })

    socket.on('chat_notification', (data: ChatNotification) => {
      chatNotificationHandlerRef.current?.(data)
    })

    socket.on('new_dm', (msg: DmMessage) => dmHandlerRef.current?.(msg))
    socket.on('dm_ack', (msg: DmMessage) => dmAckHandlerRef.current?.(msg))
    socket.on('new_pod_message', (msg: PodMessage) => podHandlerRef.current?.(msg))
    socket.on('pod_message_ack', (msg: PodMessage) => podAckHandlerRef.current?.(msg))

    socket.on('error', (data: { message: string }) => {
      setState((prev) => ({ ...prev, error: data.message }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId, enabled])

  const joinChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_chat', chatId)
      setCurrentChatId(chatId)
    }
  }, [])

  const leaveChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_chat', chatId)
      setCurrentChatId((prev) => (prev === chatId ? null : prev))
    }
  }, [])

  const joinDm = useCallback((conversationId: string) => {
    socketRef.current?.connected && socketRef.current.emit('join_dm', conversationId)
  }, [])

  const leaveDm = useCallback((conversationId: string) => {
    socketRef.current?.connected && socketRef.current.emit('leave_dm', conversationId)
  }, [])

  const joinPod = useCallback((podId: string) => {
    socketRef.current?.connected && socketRef.current.emit('join_pod', podId)
  }, [])

  const leavePod = useCallback((podId: string) => {
    socketRef.current?.connected && socketRef.current.emit('leave_pod', podId)
  }, [])

  const sendMessage = useCallback(
    (chatId: string, message: string, replyToId?: string, clientMessageId?: string) => {
      if (!socketRef.current?.connected) return null
      const id = clientMessageId || newClientId()
      socketRef.current.emit('send_message', {
        chatId,
        message,
        replyToId,
        clientMessageId: id,
      })
      return id
    },
    []
  )

  const sendDm = useCallback((conversationId: string, content: string, clientMessageId?: string) => {
    if (!socketRef.current?.connected) return null
    const id = clientMessageId || newClientId()
    socketRef.current.emit('send_dm', { conversationId, content, clientMessageId: id })
    return id
  }, [])

  const sendPod = useCallback((podId: string, message: string, clientMessageId?: string) => {
    if (!socketRef.current?.connected) return null
    const id = clientMessageId || newClientId()
    socketRef.current.emit('send_pod', { podId, message, clientMessageId: id })
    return id
  }, [])

  const deleteMessage = useCallback((chatId: string, messageId: string) => {
    socketRef.current?.connected &&
      socketRef.current.emit('delete_message', { chatId, messageId })
  }, [])

  const startTyping = useCallback((chatId: string) => {
    socketRef.current?.connected && socketRef.current.emit('typing_start', chatId)
  }, [])

  const stopTyping = useCallback((chatId: string) => {
    socketRef.current?.connected && socketRef.current.emit('typing_stop', chatId)
  }, [])

  const onMessage = useCallback((handler: (msg: ChatMessage) => void) => {
    messageHandlerRef.current = handler
  }, [])

  const onMessageAck = useCallback((handler: (msg: ChatMessage) => void) => {
    ackHandlerRef.current = handler
  }, [])

  const onMessageFailed = useCallback(
    (handler: (data: { client_message_id: string }) => void) => {
      failHandlerRef.current = handler
    },
    []
  )

  const onMessageDeleted = useCallback((handler: (data: { messageId: string }) => void) => {
    deleteHandlerRef.current = handler
  }, [])

  const onNotification = useCallback((handler: (notification: Notification) => void) => {
    notificationHandlerRef.current = handler
  }, [])

  const onChatNotification = useCallback((handler: (data: ChatNotification) => void) => {
    chatNotificationHandlerRef.current = handler
  }, [])

  const onDm = useCallback((handler: (msg: DmMessage) => void) => {
    dmHandlerRef.current = handler
  }, [])

  const onDmAck = useCallback((handler: (msg: DmMessage) => void) => {
    dmAckHandlerRef.current = handler
  }, [])

  const onPodMessage = useCallback((handler: (msg: PodMessage) => void) => {
    podHandlerRef.current = handler
  }, [])

  const onPodAck = useCallback((handler: (msg: PodMessage) => void) => {
    podAckHandlerRef.current = handler
  }, [])

  return {
    ...state,
    isSocketEnabled: !!process.env.NEXT_PUBLIC_WEBSOCKET_URL,
    joinChat,
    leaveChat,
    joinDm,
    leaveDm,
    joinPod,
    leavePod,
    sendMessage,
    sendDm,
    sendPod,
    deleteMessage,
    startTyping,
    stopTyping,
    onMessage,
    onMessageAck,
    onMessageFailed,
    onMessageDeleted,
    onNotification,
    onChatNotification,
    onDm,
    onDmAck,
    onPodMessage,
    onPodAck,
    newClientId,
  }
}
