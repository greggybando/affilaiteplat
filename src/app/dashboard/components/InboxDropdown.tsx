'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Search, Loader2, X, Inbox } from 'lucide-react'
import { useInbox, useUnreadCount } from '@/hooks/useDM'

type Conversation = {
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

interface InboxDropdownProps {
  currentUserId: string
  onOpenDM: (partnerId: string, partnerName?: string, partnerAvatar?: string | null) => void
}

export function InboxDropdown({ currentUserId, onOpenDM }: InboxDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { data: unreadCount } = useUnreadCount()
  const { data: inboxConversations, refetch, isLoading } = useInbox(isOpen)
  const conversations = useMemo(() => inboxConversations || [], [inboxConversations])

  const unreadTotal = useMemo(
    () => inboxConversations?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0,
    [inboxConversations]
  )

  // Close on outside click
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handler)
    }
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Refetch when opened
  useEffect(() => {
    if (isOpen) {
      refetch()
    }
  }, [isOpen, refetch])

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations as any
    const q = searchQuery.toLowerCase()
    return conversations.filter((c: any) =>
      c.other_user.name.toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q)
    )
  }, [conversations, searchQuery])

  const handleOpen = (conv: Conversation) => {
    const partnerId = conv.other_user.id
    const partnerName = conv.other_user.name
    const partnerAvatar = conv.other_user.avatar || null
    onOpenDM(partnerId, partnerName, partnerAvatar)
    setIsOpen(false)
    // Refresh list after a short delay to clear unread badges
    setTimeout(() => {
      refetch()
    }, 500)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="relative p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-xl transition-colors"
        title="Inbox"
      >
        <MessageCircle className="w-5 h-5 text-[rgba(255,255,255,0.85)]" />
        {(unreadCount || unreadTotal) > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {(unreadCount || unreadTotal) > 9 ? '9+' : (unreadCount || unreadTotal)}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[360px] bg-[rgba(15,23,42,0.95)] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl z-50 backdrop-blur-xl overflow-hidden"
          style={{
            boxShadow: '0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(34,211,238,0.15)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)] bg-gradient-to-r from-[rgba(24,24,27,0.92)] to-[rgba(12,74,110,0.85)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-slate-900 font-bold text-sm shadow-lg">
                <Inbox className="w-4 h-4" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Inbox</div>
                <div className="text-[11px] text-slate-300">{unreadTotal} unread</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members or messages..."
                className="w-full pl-9 pr-10 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations */}
          <div className="max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-300 text-sm">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading inbox...
              </div>
            ) : (
              <>
                {filteredConversations.length === 0 ? (
                  <div className="py-10 px-4 text-center text-slate-400 text-sm">
                    No conversations yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[rgba(255,255,255,0.06)]">
                    {filteredConversations.map((conv: any) => (
                      <button
                        key={conv.conversation_id}
                        onClick={() => handleOpen(conv)}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                      >
                        {conv.other_user.avatar ? (
                          <img
                            src={conv.other_user.avatar}
                            alt={conv.other_user.name}
                            className="w-9 h-9 rounded-full object-cover border border-[rgba(255,255,255,0.12)]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-slate-900 font-semibold border border-[rgba(255,255,255,0.12)]">
                            {conv.other_user.name[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white truncate">{conv.other_user.name}</span>
                            <span className="text-[11px] text-slate-400">
                              {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </div>
                          <div className="text-[12px] text-slate-300 truncate">{conv.last_message}</div>
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="w-6 h-6 bg-amber-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
