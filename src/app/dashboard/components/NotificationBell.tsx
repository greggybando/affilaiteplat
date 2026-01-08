'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Wifi, WifiOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'

interface Notification {
  id: string
  type: 'like' | 'reply' | 'mention' | 'reply_to_comment'
  read: boolean
  createdAt: string
  actor: {
    id: string
    name: string
    avatar: string | null
  }
  post: {
    id: string
    title: string
  } | null
  reply: {
    id: string
    content: string
  } | null
}

interface NotificationBellProps {
  currentUserId: string
}

export function NotificationBell({ currentUserId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  // WebSocket connection for real-time notifications
  const socket = useSocket({ userId: currentUserId, enabled: true })
  const useWebSocket = socket.isSocketEnabled && socket.connected

  // Register notification handler
  useEffect(() => {
    if (socket.connected) {
      socket.onNotification((notification) => {
        // Add new notification to the top
        setNotifications(prev => [notification as unknown as Notification, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      
      // Also handle chat notifications as unread indicators
      socket.onChatNotification((data) => {
        // You could show a toast here or update a chat badge
        console.log('New chat message:', data.senderName, data.messagePreview)
      })
    }
  }, [socket.connected])

  useEffect(() => {
    fetchNotifications()
    
    // Only poll if WebSocket is not connected
    if (!useWebSocket) {
      // Poll for new notifications every 60 seconds (reduced from 30)
      const interval = setInterval(fetchNotifications, 60000)
      return () => clearInterval(interval)
    }
  }, [useWebSocket])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/community/notifications?limit=50')
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/community/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })
      
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ))
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/community/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })
      
      setNotifications(notifications.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    setIsOpen(false)
    
    if (notification.post) {
      router.push(`/dashboard?post=${notification.post.id}`)
    }
  }

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor.name
    const postTitle = notification.post?.title || 'post'
    
    switch (notification.type) {
      case 'like':
        return `${actorName} liked your post "${postTitle.substring(0, 30)}${postTitle.length > 30 ? '...' : ''}"`
      case 'reply':
        const replyPreview = notification.reply?.content.substring(0, 50) || ''
        return `${actorName} replied: "${replyPreview}${replyPreview.length >= 50 ? '...' : ''}"`
      case 'mention':
        return `${actorName} mentioned you in "${postTitle.substring(0, 30)}${postTitle.length > 30 ? '...' : ''}"`
      case 'reply_to_comment':
        return `${actorName} replied to your comment`
      default:
        return 'New notification'
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return dateString
    }
  }

  return (
    <div className="relative" ref={dropdownRef} style={{ zIndex: 999999 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-xl transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-[rgba(255,255,255,0.8)]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed w-80 bg-[rgba(26,26,46,0.95)] backdrop-blur-[20px] rounded-xl shadow-2xl border border-[rgba(255,255,255,0.2)] max-h-96 flex flex-col" style={{ right: '6rem', top: '4rem', zIndex: 999999, backdropFilter: 'blur(20px)', boxShadow: '0 0 40px rgba(6,182,212,0.3), 0 8px 32px rgba(0,0,0,0.8)' }}>
          {/* Header */}
          <div className="p-3 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between bg-gradient-to-r from-[rgba(24,24,27,0.92)] to-[rgba(12,74,110,0.85)]">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Notifications</h3>
              {/* Real-time indicator */}
              <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                useWebSocket ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {useWebSocket ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                <span>{useWebSocket ? 'Live' : 'Polling'}</span>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto bg-slate-900/60">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                You're all caught up!
              </div>
            ) : (
              <div className="divide-y divide-[rgba(255,255,255,0.1)]">
                {notifications.map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left hover:bg-[rgba(255,255,255,0.05)] transition-colors ${
                      !notification.read ? 'bg-cyan-500/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {notification.actor.avatar ? (
                        <img
                          src={notification.actor.avatar}
                          alt={notification.actor.name}
                          className="w-8 h-8 rounded-full shrink-0 border border-cyan-500/50"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 border border-cyan-500/50">
                          {notification.actor.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          {getNotificationText(notification)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-cyan-500 rounded-full shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
