-- Group Chat Mute Migration
-- Adds mute functionality for group chat

-- Add group_chat_muted field if it doesn't exist
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS group_chat_muted BOOLEAN DEFAULT false;

-- Create index for faster muted user lookups
CREATE INDEX IF NOT EXISTS idx_affiliates_group_chat_muted ON affiliates(group_chat_muted) WHERE group_chat_muted = true;

