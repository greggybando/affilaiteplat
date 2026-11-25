'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, User } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'

type Message = {
  id: string
  message: string
  createdAt: string
  affiliateId: string
  avatarName: string
  avatarUrl: string | null
  client_message_id?: string
}

interface PodChatProps {
  podId: string
  currentAffiliateId: string
}

export function PodChat({ podId, currentAffiliateId }: PodChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const socket = useSocket({ userId: currentAffiliateId, enabled: true })
  const useWs = socket.isSocketEnabled && socket.connected

  useEffect(() => {
    fetchMessages()
  }, [podId])

  // Live path when socket connected; poll only as fallback
  useEffect(() => {
    if (useWs) {
      socket.joinPod(podId)
      return () => {
        socket.leavePod(podId)
      }
    }
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [podId, useWs, socket])

  useEffect(() => {
    if (!useWs) return

    socket.onPodMessage((msg) => {
      if (msg.pod_id !== podId) return
      setMessages((prev) => {
        const clientId = msg.client_message_id
        const row: Message = {
          id: msg.id,
          message: msg.message,
          createdAt: msg.created_at,
          affiliateId: msg.affiliate_id,
          avatarName: msg.avatarName || 'Unknown',
          avatarUrl: msg.avatarUrl || null,
          client_message_id: clientId,
        }
        if (clientId) {
          const idx = prev.findIndex(
            (m) => m.id === clientId || m.client_message_id === clientId || m.id === msg.id
          )
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = row
            return next
          }
        }
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, row]
      })
    })

    socket.onPodAck((msg) => {
      if (msg.pod_id !== podId) return
      setMessages((prev) => {
        const clientId = msg.client_message_id
        const row: Message = {
          id: msg.id,
          message: msg.message,
          createdAt: msg.created_at,
          affiliateId: msg.affiliate_id,
          avatarName: msg.avatarName || 'Unknown',
          avatarUrl: msg.avatarUrl || null,
          client_message_id: clientId,
        }
        const idx = prev.findIndex(
          (m) => m.id === clientId || m.client_message_id === clientId || m.id === msg.id
        )
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = row
          return next
        }
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, row]
      })
    })
  }, [useWs, podId, socket])

  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100
      if (isNearBottom || messages.length === 0) {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [messages])

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/pods/${podId}/messages`)
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || newMessage.length > 500 || sending) return

    const text = newMessage.trim()
    setSending(true)

    if (useWs) {
      const clientId = socket.newClientId()
      setMessages((prev) => [
        ...prev,
        {
          id: clientId,
          message: text,
          createdAt: new Date().toISOString(),
          affiliateId: currentAffiliateId,
          avatarName: 'You',
          avatarUrl: null,
          client_message_id: clientId,
        },
      ])
      setNewMessage('')
      const sent = socket.sendPod(podId, text, clientId)
      setSending(false)
      if (sent) return
      setMessages((prev) => prev.filter((m) => m.id !== clientId))
    }

    try {
      const res = await fetch(`/api/pods/${podId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(errorData.details || errorData.error || 'Failed to send message')
        return
      }

      const data = await res.json()
      if (data.message) {
        setMessages((prev) => [...prev, data.message])
        setNewMessage('')
      } else {
        alert(data.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  function formatTimestamp(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-full min-h-[320px] rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-white/80">
        Pod chat {useWs ? '· live' : '· polling'}
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-sm text-white/40">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-white/40">No messages yet</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${
                msg.affiliateId === currentAffiliateId ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.affiliateId !== currentAffiliateId && (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  {msg.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-white/50" />
                  )}
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  msg.affiliateId === currentAffiliateId
                    ? 'bg-cyan-600/80 text-white'
                    : 'bg-white/10 text-white/90'
                }`}
              >
                {msg.affiliateId !== currentAffiliateId && (
                  <div className="text-[10px] text-white/50 mb-0.5">{msg.avatarName}</div>
                )}
                <div>{msg.message}</div>
                <div className="text-[10px] opacity-60 mt-1">{formatTimestamp(msg.createdAt)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value.slice(0, 500))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Message the pod…"
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/40"
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
          className="rounded-xl px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
