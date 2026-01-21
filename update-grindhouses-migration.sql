-- Update grindhouses table to add new fields for forum integration
-- Run this after the initial grindhouses-migration.sql

-- Add new columns
ALTER TABLE grindhouses 
  ADD COLUMN IF NOT EXISTS forum_post_id UUID REFERENCES community_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration TEXT,
  ADD COLUMN IF NOT EXISTS vibe_focus TEXT,
  ADD COLUMN IF NOT EXISTS preferred_people INTEGER;

-- Create index on forum_post_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_grindhouses_forum_post_id ON grindhouses(forum_post_id);

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'grindhouses'
ORDER BY ordinal_position;

