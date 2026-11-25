# WebSocket server (realtime chat)

Socket.io server for group chat, DMs, and pods.

## Architecture

- **Hot path:** broadcast on socket first → persist to Supabase async → `message_ack`
- **Auth:** JWT (`affiliate_token` / `JWT_SECRET`) required on connect
- **Scale:** set `REDIS_URL` for `@socket.io/redis-adapter` + shared presence

## Env

```
PORT=3001
FRONTEND_URL=https://www.millionairelifedesign.com
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...                 # same as Next.js app
REDIS_URL=redis://...          # optional but required for multi-instance
```

## Railway

1. Deploy this folder as a service
2. Add env vars above (include `JWT_SECRET` + ideally Redis)
3. Set Next.js `NEXT_PUBLIC_WEBSOCKET_URL` to the Railway URL

## Local

```bash
cd websocket-server
npm install
npm run dev
```

Set `NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001` in the Next app.
