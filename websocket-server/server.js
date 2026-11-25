require('dotenv').config()
const { createServer } = require('http')
const { Server } = require('socket.io')
const { createClient } = require('@supabase/supabase-js')
const jwt = require('jsonwebtoken')
const { randomUUID } = require('crypto')

const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://millionairelifedesign.com'
const JWT_SECRET = process.env.JWT_SECRET
const REDIS_URL = process.env.REDIS_URL

if (!JWT_SECRET) {
  console.warn('[WS] JWT_SECRET missing — socket auth will reject connections')
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        connections: io.engine.clientsCount,
        redis: Boolean(REDIS_URL),
      })
    )
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WebSocket server running')
})

const io = new Server(httpServer, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000', /\.vercel\.app$/],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  perMessageDeflate: { threshold: 1024 },
})

/** @type {import('ioredis').default | null} */
let redis = null

async function setupRedis() {
  if (!REDIS_URL) {
    console.log('[WS] No REDIS_URL — single-node mode (in-memory rooms)')
    return
  }
  try {
    const { createAdapter } = require('@socket.io/redis-adapter')
    const Redis = require('ioredis')
    const pubClient = new Redis(REDIS_URL)
    const subClient = pubClient.duplicate()
    redis = pubClient
    io.adapter(createAdapter(pubClient, subClient))
    console.log('[WS] Redis adapter enabled')
  } catch (err) {
    console.error('[WS] Redis setup failed, continuing single-node:', err.message)
  }
}

// Local fallback presence (used when Redis unavailable)
const localRoomUsers = new Map() // roomKey -> Set userId

function presenceKey(roomKey) {
  return `presence:${roomKey}`
}

async function addPresence(roomKey, userId) {
  if (redis) {
    await redis.sadd(presenceKey(roomKey), userId)
    return redis.scard(presenceKey(roomKey))
  }
  if (!localRoomUsers.has(roomKey)) localRoomUsers.set(roomKey, new Set())
  localRoomUsers.get(roomKey).add(userId)
  return localRoomUsers.get(roomKey).size
}

async function removePresence(roomKey, userId) {
  if (redis) {
    await redis.srem(presenceKey(roomKey), userId)
    return redis.scard(presenceKey(roomKey))
  }
  const set = localRoomUsers.get(roomKey)
  if (!set) return 0
  set.delete(userId)
  return set.size
}

async function getPresenceCount(roomKey) {
  if (redis) return redis.scard(presenceKey(roomKey))
  return localRoomUsers.get(roomKey)?.size || 0
}

function verifyAuthToken(token) {
  if (!JWT_SECRET || !token) return null
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    const payload = verifyAuthToken(token)
    if (!payload?.affiliateId) {
      return next(new Error('Authentication required'))
    }

    const { data: user, error } = await supabase
      .from('affiliates')
      .select('id, name, avatar_name, avatar_url, group_chat_muted, role, banned, status')
      .eq('id', payload.affiliateId)
      .single()

    if (error || !user || user.banned || user.status === 'banned') {
      return next(new Error('Invalid user'))
    }

    socket.userId = user.id
    socket.userName = user.avatar_name || user.name
    socket.userAvatar = user.avatar_url
    socket.groupChatMuted = Boolean(user.group_chat_muted)
    socket.role = user.role
    next()
  } catch (err) {
    next(new Error('Authentication failed'))
  }
})

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`)
  socket.join(`user:${socket.userId}`)

  socket.on('join_chat', async (chatId) => {
    if (!chatId) return
    for (const room of socket.rooms) {
      if (room.startsWith('chat:') && room !== `chat:${chatId}`) {
        const oldId = room.slice(5)
        socket.leave(room)
        const count = await removePresence(`chat:${oldId}`, socket.userId)
        io.to(room).emit('user_left', {
          chatId: oldId,
          userId: socket.userId,
          userName: socket.userName,
          onlineCount: count,
        })
      }
    }

    const roomName = `chat:${chatId}`
    socket.join(roomName)
    const onlineCount = await addPresence(`chat:${chatId}`, socket.userId)
    io.to(roomName).emit('user_joined', {
      chatId,
      userId: socket.userId,
      userName: socket.userName,
      onlineCount,
    })
  })

  socket.on('leave_chat', async (chatId) => {
    if (!chatId) return
    const roomName = `chat:${chatId}`
    socket.leave(roomName)
    const onlineCount = await removePresence(`chat:${chatId}`, socket.userId)
    io.to(roomName).emit('user_left', {
      chatId,
      userId: socket.userId,
      userName: socket.userName,
      onlineCount,
    })
  })

  socket.on('join_dm', async (conversationId) => {
    if (!conversationId) return
    socket.join(`dm:${conversationId}`)
  })

  socket.on('leave_dm', async (conversationId) => {
    if (!conversationId) return
    socket.leave(`dm:${conversationId}`)
  })

  socket.on('join_pod', async (podId) => {
    if (!podId) return
    socket.join(`pod:${podId}`)
    const onlineCount = await addPresence(`pod:${podId}`, socket.userId)
    io.to(`pod:${podId}`).emit('pod_user_joined', {
      podId,
      userId: socket.userId,
      onlineCount,
    })
  })

  socket.on('leave_pod', async (podId) => {
    if (!podId) return
    socket.leave(`pod:${podId}`)
    const onlineCount = await removePresence(`pod:${podId}`, socket.userId)
    io.to(`pod:${podId}`).emit('pod_user_left', {
      podId,
      userId: socket.userId,
      onlineCount,
    })
  })

  /**
   * HOT PATH: broadcast first, persist async.
   * Client sends clientMessageId for optimistic reconcile.
   */
  socket.on('send_message', async (data) => {
    const { chatId, message, replyToId, clientMessageId } = data || {}
    const text = typeof message === 'string' ? message.trim() : ''
    const clientId = clientMessageId || randomUUID()

    if (!chatId || !text) {
      socket.emit('error', { message: 'Invalid message data' })
      return
    }
    if (socket.groupChatMuted) {
      socket.emit('error', { message: 'You are muted and cannot send messages' })
      return
    }

    const createdAt = new Date().toISOString()
    const provisional = {
      id: clientId,
      client_message_id: clientId,
      chat_id: chatId,
      user_id: socket.userId,
      message: text,
      reply_to_id: replyToId || null,
      created_at: createdAt,
      user_name: socket.userName,
      user_avatar: socket.userAvatar,
      pending: true,
    }

    // 1) Fan-out immediately
    io.to(`chat:${chatId}`).emit('new_message', provisional)

    // 2) Persist in background
    try {
      const { data: newMessage, error } = await supabase
        .from('group_chat_messages')
        .insert({
          group_chat_id: chatId,
          affiliate_id: socket.userId,
          message: text,
        })
        .select('id, group_chat_id, affiliate_id, message, created_at')
        .single()

      if (error || !newMessage) {
        console.error('[WS] persist failed', error)
        io.to(`chat:${chatId}`).emit('message_failed', {
          client_message_id: clientId,
          error: 'Failed to save message',
        })
        return
      }

      const confirmed = {
        id: newMessage.id,
        client_message_id: clientId,
        chat_id: newMessage.group_chat_id,
        user_id: newMessage.affiliate_id,
        message: newMessage.message,
        created_at: newMessage.created_at,
        user_name: socket.userName,
        user_avatar: socket.userAvatar,
        pending: false,
      }

      io.to(`chat:${chatId}`).emit('message_ack', confirmed)

      // Non-blocking side effects
      supabase
        .from('group_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId)
        .then(() => {})

      supabase
        .from('group_chat_participants')
        .select('affiliate_id')
        .eq('group_chat_id', chatId)
        .neq('affiliate_id', socket.userId)
        .then(async ({ data: chatMembers }) => {
          if (!chatMembers) return
          const onlineCount = await getPresenceCount(`chat:${chatId}`)
          // Notify users not currently counted in room presence via their user room
          for (const member of chatMembers) {
            io.to(`user:${member.affiliate_id}`).emit('chat_notification', {
              chatId,
              senderName: socket.userName,
              messagePreview: text.substring(0, 50),
            })
          }
          void onlineCount
        })
    } catch (err) {
      console.error('[WS] send_message error', err)
      io.to(`chat:${chatId}`).emit('message_failed', {
        client_message_id: clientId,
        error: 'Server error',
      })
    }
  })

  socket.on('send_dm', async (data) => {
    const { conversationId, content, clientMessageId } = data || {}
    const text = typeof content === 'string' ? content.trim() : ''
    const clientId = clientMessageId || randomUUID()
    if (!conversationId || !text) {
      socket.emit('error', { message: 'Invalid DM data' })
      return
    }

    // Authorize membership
    const { data: conv } = await supabase
      .from('dm_conversations')
      .select('id, participant_1, participant_2')
      .eq('id', conversationId)
      .single()

    if (
      !conv ||
      (conv.participant_1 !== socket.userId && conv.participant_2 !== socket.userId)
    ) {
      socket.emit('error', { message: 'Unauthorized DM' })
      return
    }

    const createdAt = new Date().toISOString()
    const provisional = {
      id: clientId,
      client_message_id: clientId,
      conversation_id: conversationId,
      sender_id: socket.userId,
      content: text,
      created_at: createdAt,
      user_name: socket.userName,
      user_avatar: socket.userAvatar,
      pending: true,
      type: 'dm',
    }

    io.to(`dm:${conversationId}`).emit('new_dm', provisional)
    // Also ping partner user room for inbox badge
    const otherId =
      conv.participant_1 === socket.userId ? conv.participant_2 : conv.participant_1
    io.to(`user:${otherId}`).emit('dm_notification', {
      conversationId,
      senderName: socket.userName,
      messagePreview: text.substring(0, 50),
    })

    try {
      const { data: row, error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: socket.userId,
          content: text,
        })
        .select('id, conversation_id, sender_id, content, created_at')
        .single()

      if (error || !row) {
        io.to(`dm:${conversationId}`).emit('dm_failed', {
          client_message_id: clientId,
          error: 'Failed to save DM',
        })
        return
      }

      await supabase
        .from('dm_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      const confirmed = {
        ...provisional,
        id: row.id,
        created_at: row.created_at,
        pending: false,
      }
      io.to(`dm:${conversationId}`).emit('dm_ack', confirmed)
    } catch (err) {
      console.error('[WS] send_dm error', err)
      io.to(`dm:${conversationId}`).emit('dm_failed', {
        client_message_id: clientId,
        error: 'Server error',
      })
    }
  })

  socket.on('send_pod', async (data) => {
    const { podId, message, clientMessageId } = data || {}
    const text = typeof message === 'string' ? message.trim() : ''
    const clientId = clientMessageId || randomUUID()
    if (!podId || !text || text.length > 500) {
      socket.emit('error', { message: 'Invalid pod message' })
      return
    }

    const { data: membership } = await supabase
      .from('pod_members')
      .select('id')
      .eq('pod_id', podId)
      .eq('affiliate_id', socket.userId)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!membership) {
      socket.emit('error', { message: 'Not a pod member' })
      return
    }

    const createdAt = new Date().toISOString()
    const provisional = {
      id: clientId,
      client_message_id: clientId,
      pod_id: podId,
      affiliate_id: socket.userId,
      message: text,
      created_at: createdAt,
      avatarName: socket.userName,
      avatarUrl: socket.userAvatar,
      pending: true,
      type: 'pod',
    }

    io.to(`pod:${podId}`).emit('new_pod_message', provisional)

    try {
      const { data: row, error } = await supabase
        .from('pod_messages')
        .insert({
          pod_id: podId,
          affiliate_id: socket.userId,
          message: text,
        })
        .select('id, pod_id, affiliate_id, message, created_at')
        .single()

      if (error || !row) {
        io.to(`pod:${podId}`).emit('pod_message_failed', {
          client_message_id: clientId,
          error: 'Failed to save',
        })
        return
      }

      io.to(`pod:${podId}`).emit('pod_message_ack', {
        ...provisional,
        id: row.id,
        created_at: row.created_at,
        pending: false,
      })
    } catch (err) {
      console.error('[WS] send_pod error', err)
      io.to(`pod:${podId}`).emit('pod_message_failed', {
        client_message_id: clientId,
        error: 'Server error',
      })
    }
  })

  socket.on('typing_start', (chatId) => {
    if (!chatId) return
    socket.to(`chat:${chatId}`).emit('user_typing', {
      userId: socket.userId,
      userName: socket.userName,
    })
  })

  socket.on('typing_stop', (chatId) => {
    if (!chatId) return
    socket.to(`chat:${chatId}`).emit('user_stopped_typing', {
      userId: socket.userId,
    })
  })

  socket.on('delete_message', async (data) => {
    const { chatId, messageId } = data || {}
    if (!chatId || !messageId) return
    try {
      const { data: message } = await supabase
        .from('group_chat_messages')
        .select('affiliate_id')
        .eq('id', messageId)
        .single()

      if (message?.affiliate_id !== socket.userId && socket.role !== 'admin') {
        socket.emit('error', { message: 'Unauthorized to delete this message' })
        return
      }

      await supabase.from('group_chat_messages').delete().eq('id', messageId)
      io.to(`chat:${chatId}`).emit('message_deleted', { messageId })
    } catch (err) {
      console.error('[WS] delete_message error', err)
      socket.emit('error', { message: 'Failed to delete message' })
    }
  })

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.userId}`)
    for (const room of socket.rooms) {
      if (room.startsWith('chat:')) {
        const chatId = room.slice(5)
        const onlineCount = await removePresence(`chat:${chatId}`, socket.userId)
        io.to(room).emit('user_left', {
          chatId,
          userId: socket.userId,
          userName: socket.userName,
          onlineCount,
        })
      }
      if (room.startsWith('pod:')) {
        const podId = room.slice(4)
        const onlineCount = await removePresence(`pod:${podId}`, socket.userId)
        io.to(room).emit('pod_user_left', {
          podId,
          userId: socket.userId,
          onlineCount,
        })
      }
    }
  })
})

function sendNotificationToUser(userId, notification) {
  io.to(`user:${userId}`).emit('notification', notification)
}

httpServer.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/notify') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { userId, notification } = JSON.parse(body)
        if (userId && notification) sendNotificationToUser(userId, notification)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
    return
  }

  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { notification } = JSON.parse(body)
        io.emit('notification', notification)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
  }
})

setupRedis().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`)
    console.log(`Accepting connections from: ${FRONTEND_URL}`)
  })
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  io.close(() => process.exit(0))
})
