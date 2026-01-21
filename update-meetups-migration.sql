-- Update meetups table to add new fields for forum integration
-- Run this after the initial meetups-migration.sql

-- Add new columns
ALTER TABLE meetups 
  ADD COLUMN IF NOT EXISTS forum_post_id UUID REFERENCES community_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS max_attendees INTEGER;

-- Create index on forum_post_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_meetups_forum_post_id ON meetups(forum_post_id);
CREATE INDEX IF NOT EXISTS idx_meetups_date_time ON meetups(date_time);

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'meetups'
ORDER BY ordinal_position;

