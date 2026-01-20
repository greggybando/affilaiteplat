require('dotenv').config()
const { createServer } = require('http')
const { Server } = require('socket.io')
const { createClient } = require('@supabase/supabase-js')

const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://affiliate-platform-three.vercel.app'

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Create HTTP server
const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'ok', 
      connections: io.engine.clientsCount,
      userSockets: userSockets.size
    }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WebSocket server running')
})

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: [
      FRONTEND_URL,
      'http://localhost:3000',
      /\.vercel\.app$/
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Performance optimizations for 10k users
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024 // Only compress messages > 1KB
  }
})

// Track online users per chat room
const roomUsers = new Map() // chatId -> Set of userIds

// Track user sockets for direct notifications
const userSockets = new Map() // odId -> Set of socket.id

// Helper to get or create user socket set
function getUserSockets(userId) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set())
  }
  return userSockets.get(userId)
}

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    const userId = socket.handshake.auth.userId
    
    if (!userId) {
      return next(new Error('Authentication required'))
    }
    
    // Verify user exists in database
    const { data: user, error } = await supabase
      .from('affiliates')
      .select('id, name, avatar_url')
      .eq('id', userId)
      .single()
    
    if (error || !user) {
      return next(new Error('Invalid user'))
    }
    
    socket.userId = userId
    socket.userName = user.name
    socket.userAvatar = user.avatar_url
    next()
  } catch (err) {
    next(new Error('Authentication failed'))
  }
})

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId} (${socket.userName})`)
  
  // Track this socket for the user (for direct notifications)
  getUserSockets(socket.userId).add(socket.id)
  
  // Auto-join user's personal notification room
  socket.join(`user:${socket.userId}`)
  
  // Join a chat room
  socket.on('join_chat', async (chatId) => {
    // Leave previous chat rooms (except socket.id room and user notification room)
    const rooms = Array.from(socket.rooms)
    rooms.forEach(room => {
      if (room !== socket.id && room !== `user:${socket.userId}` && room.startsWith('chat:')) {
        socket.leave(room)
        // Update room users
        const roomId = room.replace('chat:', '')
        if (roomUsers.has(roomId)) {
          roomUsers.get(roomId).delete(socket.userId)
        }
      }
    })
    
    // Join new room with prefix
    const roomName = `chat:${chatId}`
    socket.join(roomName)
    
    // Track user in room
    if (!roomUsers.has(chatId)) {
      roomUsers.set(chatId, new Set())
    }
    roomUsers.get(chatId).add(socket.userId)
    
    // Notify room of new user
    io.to(roomName).emit('user_joined', {
      chatId,
      userId: socket.userId,
      userName: socket.userName,
      onlineCount: roomUsers.get(chatId).size
    })
    
    console.log(`User ${socket.userName} joined chat ${chatId}`)
  })
  
  // Leave a chat room
  socket.on('leave_chat', (chatId) => {
    const roomName = `chat:${chatId}`
    socket.leave(roomName)
    
    if (roomUsers.has(chatId)) {
      roomUsers.get(chatId).delete(socket.userId)
      
      io.to(roomName).emit('user_left', {
        chatId,
        userId: socket.userId,
        userName: socket.userName,
        onlineCount: roomUsers.get(chatId).size
      })
    }
  })
  
  // Send a message (group chat or DM)
  socket.on('send_message', async (data) => {
    const { chatId, message, replyToId } = data
    
    if (!chatId || !message?.trim()) {
      socket.emit('error', { message: 'Invalid message data' })
      return
    }
    
    try {
      // Save message to database
      const { data: newMessage, error } = await supabase
        .from('group_chat_messages')
        .insert({
          group_chat_id: chatId,
          affiliate_id: socket.userId,
          message: message.trim()
        })
        .select(`
          id,
          group_chat_id,
          affiliate_id,
          message,
          created_at,
          affiliates!group_chat_messages_affiliate_id_fkey (
            id,
            name,
            avatar_name,
            avatar_url
          )
        `)
        .single()
      
      if (error) {
        console.error('Error saving message:', error)
        socket.emit('error', { message: 'Failed to save message' })
        return
      }
      
      // Format message for clients
      const formattedMessage = {
        id: newMessage.id,
        chat_id: newMessage.group_chat_id,
        user_id: newMessage.affiliate_id,
        message: newMessage.message,
        created_at: newMessage.created_at,
        user_name: newMessage.affiliates?.avatar_name || newMessage.affiliates?.name || socket.userName,
        user_avatar: newMessage.affiliates?.avatar_url || socket.userAvatar
      }
      
      // Broadcast to all users in the chat room
      io.to(`chat:${chatId}`).emit('new_message', formattedMessage)
      
      // Update chat's last activity
      await supabase
        .from('group_chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId)
      
      // Get chat members who aren't in the room to send notifications
      const { data: chatMembers } = await supabase
        .from('group_chat_members')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', socket.userId)
      
      if (chatMembers) {
        const onlineInRoom = roomUsers.get(chatId) || new Set()
        for (const member of chatMembers) {
          // Only notify if they're not currently in this chat room
          if (!onlineInRoom.has(member.user_id)) {
            io.to(`user:${member.user_id}`).emit('chat_notification', {
              chatId,
              senderName: socket.userName,
              messagePreview: message.trim().substring(0, 50)
            })
          }
        }
      }
        
    } catch (err) {
      console.error('Error in send_message:', err)
      socket.emit('error', { message: 'Server error' })
    }
  })
  
  // Typing indicator
  socket.on('typing_start', (chatId) => {
    socket.to(`chat:${chatId}`).emit('user_typing', {
      userId: socket.userId,
      userName: socket.userName
    })
  })
  
  socket.on('typing_stop', (chatId) => {
    socket.to(`chat:${chatId}`).emit('user_stopped_typing', {
      userId: socket.userId
    })
  })
  
  // Delete message (for admins/message owners)
  socket.on('delete_message', async (data) => {
    const { chatId, messageId } = data
    
    try {
      // Verify ownership or admin status
      const { data: message } = await supabase
        .from('group_chat_messages')
        .select('user_id')
        .eq('id', messageId)
        .single()
      
      const { data: user } = await supabase
        .from('affiliates')
        .select('role')
        .eq('id', socket.userId)
        .single()
      
      if (message?.user_id !== socket.userId && user?.role !== 'admin') {
        socket.emit('error', { message: 'Unauthorized to delete this message' })
        return
      }
      
      // Delete the message
      await supabase
        .from('group_chat_messages')
        .delete()
        .eq('id', messageId)
      
      // Notify all users in the room
      io.to(`chat:${chatId}`).emit('message_deleted', { messageId })
      
    } catch (err) {
      console.error('Error deleting message:', err)
      socket.emit('error', { message: 'Failed to delete message' })
    }
  })
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`)
    
    // Remove this socket from user's socket set
    const sockets = userSockets.get(socket.userId)
    if (sockets) {
      sockets.delete(socket.id)
      if (sockets.size === 0) {
        userSockets.delete(socket.userId)
      }
    }
    
    // Remove user from all chat rooms
    roomUsers.forEach((users, chatId) => {
      if (users.has(socket.userId)) {
        users.delete(socket.userId)
        io.to(`chat:${chatId}`).emit('user_left', {
          chatId,
          userId: socket.userId,
          userName: socket.userName,
          onlineCount: users.size
        })
      }
    })
  })
})

// =====================================================
// NOTIFICATION BROADCASTING (called from API routes)
// =====================================================

// Function to send notification to a specific user
function sendNotificationToUser(userId, notification) {
  io.to(`user:${userId}`).emit('notification', notification)
}

// HTTP endpoint for API routes to push notifications (non-DM)
httpServer.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/notify') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { userId, notification } = JSON.parse(body)
        if (userId && notification) {
          sendNotificationToUser(userId, notification)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
    return
  }
  
  // Broadcast notification to all users (non-DM)
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { notification } = JSON.parse(body)
        io.emit('notification', notification)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
    return
  }
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
  console.log(`Accepting connections from: ${FRONTEND_URL}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  io.close(() => {
    console.log('Socket.io server closed')
    process.exit(0)
  })
})
