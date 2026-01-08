-- Group Chat Migration
-- Create group chat tables

CREATE TABLE IF NOT EXISTS group_chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(affiliate_id)
);

CREATE TABLE IF NOT EXISTS group_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_chat_participants_affiliate ON group_chat_participants(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_affiliate ON group_chat_messages(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_created_at ON group_chat_messages(created_at DESC);





