import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type InboxItem = {
  conversation_id: string
  other_user: { id: string; name: string; avatar: string | null }
  last_message: string
  updated_at: string
  unread_count: number
}

type MessageItem = {
  id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['dm', 'unread'],
    queryFn: async () => {
      const res = await fetch('/api/messages/unread-count')
      if (!res.ok) throw new Error('Failed to fetch unread count')
      const data = await res.json()
      return data.count as number
    },
    refetchInterval: 30000
  })
}

export function useInbox(enabled: boolean) {
  return useQuery({
    queryKey: ['dm', 'inbox'],
    enabled,
    refetchInterval: enabled ? 10000 : false,
    queryFn: async (): Promise<InboxItem[]> => {
      const res = await fetch('/api/messages/inbox')
      if (!res.ok) throw new Error('Failed to fetch inbox')
      const data = await res.json()
      return data.conversations || []
    }
  })
}

export function useConversation(otherUserId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['dm', 'conversation', otherUserId],
    enabled: !!otherUserId && enabled,
    refetchInterval: enabled ? 3000 : false,
    queryFn: async (): Promise<{ conversationId: string; messages: MessageItem[] }> => {
      const res = await fetch(`/api/messages/${otherUserId}`)
      if (!res.ok) throw new Error('Failed to fetch conversation')
      const data = await res.json()
      return {
        conversationId: data.conversationId,
        messages: data.messages || []
      }
    }
  })
}

export function useSendMessage(otherUserId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      if (!otherUserId) throw new Error('No recipient')
      const res = await fetch(`/api/messages/${otherUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to send message')
      }
      return res.json()
    },
    onSuccess: (_data, _vars, _ctx) => {
      if (!otherUserId) return
      qc.invalidateQueries({ queryKey: ['dm', 'conversation', otherUserId] })
      qc.invalidateQueries({ queryKey: ['dm', 'inbox'] })
      qc.invalidateQueries({ queryKey: ['dm', 'unread'] })
    }
  })
}


