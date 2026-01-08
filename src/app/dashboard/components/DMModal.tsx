'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Send, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useConversation, useInbox, useSendMessage } from '@/hooks/useDM'

interface DMModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
  initialPartnerId?: string | null
  initialPartnerName?: string | null
  initialPartnerAvatar?: string | null
}

export function DMModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  initialPartnerId,
  initialPartnerName,
  initialPartnerAvatar
}: DMModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: inbox, isLoading: inboxLoading } = useInbox(isOpen)
  const { data: conversationData, isLoading: convoLoading } = useConversation(selectedUserId, isOpen)
  const sendMessage = useSendMessage(selectedUserId)

  // Set default selected user when opening
  useEffect(() => {
    if (!isOpen) return
    if (initialPartnerId) {
      setSelectedUserId(initialPartnerId)
      return
    }
    if (inbox && inbox.length > 0) {
      setSelectedUserId(inbox[0].other_user.id)
    }
  }, [isOpen, inbox, initialPartnerId])

  // Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationData?.messages])

  const messages = useMemo(
    () => conversationData?.messages || [],
    [conversationData]
  )

  const filteredConversations = useMemo(() => {
    const list = inbox || []
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter((c: any) =>
      c.other_user.name.toLowerCase().includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    )
  }, [inbox, searchQuery])

  const selectedPartner = useMemo(() => {
    if (selectedUserId) {
      const fromInbox = inbox?.find((c: any) => c.other_user.id === selectedUserId)
      if (fromInbox) return fromInbox.other_user
      return {
        id: selectedUserId,
        name: initialPartnerName || 'New chat',
        avatar: initialPartnerAvatar || null
      }
    }
    return null
  }, [selectedUserId, inbox, initialPartnerName, initialPartnerAvatar])

  const handleSend = async () => {
    if (!selectedUserId || !newMessage.trim()) return
    setSendError(null)
    const content = newMessage.trim()
    setNewMessage('')
    try {
      await sendMessage.mutateAsync(content)
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send')
      setNewMessage(content) // restore text for retry
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 flex items-center justify-between border-b-2 border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Direct Messages</h2>
            <div className="text-xs text-slate-200">Polling every 3s</div>
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
              {inboxLoading ? (
                <div className="p-4 text-center text-slate-600 text-sm">Loading...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-slate-600 text-sm">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </div>
              ) : (
                filteredConversations.map((conv: any) => (
                  <button
                    key={conv.conversation_id}
                    onClick={() => setSelectedUserId(conv.other_user.id)}
                    className={`w-full p-4 border-b border-slate-200 hover:bg-slate-100 transition-colors text-left ${
                      selectedUserId === conv.other_user.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {conv.other_user.avatar ? (
                        <img
                          src={conv.other_user.avatar}
                          alt={conv.other_user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                          {conv.other_user.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-slate-800 truncate">{conv.other_user.name}</div>
                          {conv.unread_count > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 truncate">{conv.last_message}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {conv.updated_at ? formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true }) : ''}
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
            {selectedUserId && selectedPartner ? (
              <>
                {/* Messages Header */}
                <div className="px-6 py-4 border-b border-slate-300 bg-slate-50">
                  <div className="flex items-center gap-3">
                    {selectedPartner.avatar ? (
                      <img
                        src={selectedPartner.avatar}
                        alt={selectedPartner.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold">
                        {selectedPartner.name[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-800">{selectedPartner.name}</div>
                      <div className="text-xs text-slate-600">Updates every 3s</div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {convoLoading ? (
                    <div className="text-slate-600 text-sm">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-slate-500 text-sm">No messages yet.</div>
                  ) : (
                    messages.map((msg: any) => {
                      const isOwn = msg.sender_id === currentUserId
                      const sender = isOwn
                        ? { name: currentUserName, avatar: currentUserAvatar }
                        : { name: selectedPartner.name, avatar: selectedPartner.avatar }
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
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className={`text-xs text-slate-500 mt-1 ${isOwn ? 'text-right' : ''}`}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error */}
                {sendError && (
                  <div className="px-6 py-2 text-sm text-red-600 bg-red-50 border-t border-red-200">
                    {sendError}
                  </div>
                )}

                {/* Message Input */}
                <div className="px-6 py-4 border-t border-slate-300 bg-white">
                  <div className="flex gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder="Type a message..."
                      rows={2}
                      className="flex-1 px-4 py-2 border-2 border-slate-400 rounded-lg bg-white text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sendMessage.isPending}
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

