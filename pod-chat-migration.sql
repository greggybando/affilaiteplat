-- Pod Chat Migration
-- Create pod_messages table for pod group chat

CREATE TABLE IF NOT EXISTS pod_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pod_messages_pod_id ON pod_messages(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_messages_created_at ON pod_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pod_messages_pod_created ON pod_messages(pod_id, created_at DESC);

-- RLS policies (if using RLS)
-- ALTER TABLE pod_messages ENABLE ROW LEVEL SECURITY;




