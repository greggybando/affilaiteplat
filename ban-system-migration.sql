-- Ban System Migration
-- Adds ban functionality to affiliates table

-- Add banned fields if they don't exist
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES affiliates(id),
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Create index for faster banned user lookups
CREATE INDEX IF NOT EXISTS idx_affiliates_banned ON affiliates(banned) WHERE banned = true;

-- Update status enum to include 'banned' if using status field
-- Note: If status is a VARCHAR, this will work. If it's an enum, you may need to alter the enum type.
-- For now, we'll use the banned boolean field which is cleaner.

