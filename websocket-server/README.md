# WebSocket Server for Real-Time Chat

This is a Socket.io server designed to handle real-time chat for 10,000+ concurrent users.

## Deploy to Railway

1. **Create new project on Railway**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select this repo and set the root directory to `websocket-server`

2. **Set environment variables on Railway:**
   ```
   PORT=3001
   FRONTEND_URL=https://affiliate-platform-three.vercel.app
   SUPABASE_URL=<your_supabase_url>
   SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
   ```

3. **Get the Railway URL**
   - After deploy, Railway will give you a URL like: `https://your-app.railway.app`
   - Copy this URL

4. **Update Vercel environment variable:**
   ```
   NEXT_PUBLIC_WEBSOCKET_URL=https://your-app.railway.app
   ```

## Local Development

```bash
cd websocket-server
npm install
npm run dev
```

Then set `NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001` in your Next.js app.

## Architecture

- **Vercel**: Next.js frontend + REST API (auth, data persistence)
- **Railway**: Socket.io WebSocket server (real-time messaging)
- **Supabase**: Database (messages stored here)

Messages are saved to Supabase and broadcast via WebSocket in real-time.

## Scaling

Railway auto-scales. For 10k users:
- Estimated: ~$20-50/month on Railway
- Compare to: $500+/month for Vercel WebSockets at this scale


