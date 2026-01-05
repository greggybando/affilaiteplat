'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Settings, X, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read: boolean
  created_at: string
}

interface NotificationsDropdownProps {
  currentUserId: string
}

export function NotificationsDropdown({ currentUserId }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState({
    dm_enabled: true,
    mention_enabled: true,
    reply_enabled: true,
    like_enabled: true,
    follow_enabled: true,
    system_enabled: true,
    email_notifications: false
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifications()
    fetchPreferences()
    const interval = setInterval(fetchNotifications, 10000) // Poll every 10 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=20')
      const data = await res.json()
      if (res.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences')
      const data = await res.json()
      if (res.ok && data.preferences) {
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] })
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })
      fetchNotifications()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const updatePreference = async (key: string, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value }
    setPreferences(newPrefs)
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs)
      })
    } catch (error) {
      console.error('Error updating preferences:', error)
      // Revert on error
      setPreferences(preferences)
    }
  }

  const unreadNotifications = notifications.filter(n => !n.read)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-700 rounded transition-colors"
        title="Notifications"
      >
        <Bell className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border-2 border-slate-400 rounded-lg shadow-2xl z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3 flex items-center justify-between border-b-2 border-slate-800">
            <h3 className="font-bold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:text-amber-300 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-white hover:text-amber-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-b border-slate-300 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-800">Notification Settings</h4>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-600 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <ToggleOption
                  label="Direct Messages"
                  enabled={preferences.dm_enabled}
                  onChange={(val) => updatePreference('dm_enabled', val)}
                />
                <ToggleOption
                  label="Mentions"
                  enabled={preferences.mention_enabled}
                  onChange={(val) => updatePreference('mention_enabled', val)}
                />
                <ToggleOption
                  label="Replies"
                  enabled={preferences.reply_enabled}
                  onChange={(val) => updatePreference('reply_enabled', val)}
                />
                <ToggleOption
                  label="Likes"
                  enabled={preferences.like_enabled}
                  onChange={(val) => updatePreference('like_enabled', val)}
                />
                <ToggleOption
                  label="Follows"
                  enabled={preferences.follow_enabled}
                  onChange={(val) => updatePreference('follow_enabled', val)}
                />
                <ToggleOption
                  label="System"
                  enabled={preferences.system_enabled}
                  onChange={(val) => updatePreference('system_enabled', val)}
                />
                <div className="pt-2 border-t border-slate-300">
                  <ToggleOption
                    label="Email Notifications"
                    enabled={preferences.email_notifications}
                    onChange={(val) => updatePreference('email_notifications', val)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-600 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                    !notification.read ? 'bg-amber-50' : ''
                  }`}
                >
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      onClick={() => {
                        if (!notification.read) markAsRead(notification.id)
                        setIsOpen(false)
                      }}
                      className="block"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{notification.title}</div>
                          {notification.message && (
                            <div className="text-sm text-slate-600 mt-1">{notification.message}</div>
                          )}
                          <div className="text-xs text-slate-500 mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-2" />
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">{notification.title}</div>
                        {notification.message && (
                          <div className="text-sm text-slate-600 mt-1">{notification.message}</div>
                        )}
                        <div className="text-xs text-slate-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-amber-500 hover:text-amber-600 shrink-0"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleOption({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (val: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-amber-500' : 'bg-slate-300'
        }`}
      >
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}




