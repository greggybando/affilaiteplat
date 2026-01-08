-- Multiple Group Chats Migration (Safe Version)
-- Support for creating multiple group chats with member management
-- This version avoids DROP operations that Supabase flags as destructive

-- Step 1: Create group_chats table
CREATE TABLE IF NOT EXISTS group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Add columns to existing tables (without foreign keys first)
ALTER TABLE group_chat_participants 
  ADD COLUMN IF NOT EXISTS group_chat_id UUID,
  ADD COLUMN IF NOT EXISTS muted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE group_chat_messages 
  ADD COLUMN IF NOT EXISTS group_chat_id UUID;

-- Step 3: Create a default "Main Group Chat" for existing data
INSERT INTO group_chats (name, created_by, created_at)
SELECT 'Main Group Chat', id, NOW()
FROM affiliates
WHERE NOT EXISTS (SELECT 1 FROM group_chats WHERE name = 'Main Group Chat')
LIMIT 1;

-- Step 4: Update existing participants to belong to main chat
UPDATE group_chat_participants
SET group_chat_id = (SELECT id FROM group_chats WHERE name = 'Main Group Chat' LIMIT 1)
WHERE group_chat_id IS NULL;

-- Step 5: Update existing messages to belong to main chat
UPDATE group_chat_messages
SET group_chat_id = (SELECT id FROM group_chats WHERE name = 'Main Group Chat' LIMIT 1)
WHERE group_chat_id IS NULL;

-- Step 6: Add foreign key constraints (after data is populated)
-- Note: You may need to run these separately if Supabase still flags them
ALTER TABLE group_chat_participants
ADD CONSTRAINT group_chat_participants_group_chat_id_fkey 
FOREIGN KEY (group_chat_id) REFERENCES group_chats(id) ON DELETE CASCADE;

ALTER TABLE group_chat_messages
ADD CONSTRAINT group_chat_messages_group_chat_id_fkey 
FOREIGN KEY (group_chat_id) REFERENCES group_chats(id) ON DELETE CASCADE;

-- Step 7: Create unique index (the old index on affiliate_id alone won't conflict)
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_chat_participants_unique 
ON group_chat_participants(affiliate_id, group_chat_id);

-- Step 8: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_group_chat_participants_chat ON group_chat_participants(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_chat ON group_chat_messages(group_chat_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_chat_created ON group_chat_messages(group_chat_id, created_at DESC);






