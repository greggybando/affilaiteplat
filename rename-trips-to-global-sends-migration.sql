-- Rename trips table to global_sends and add new fields
-- Run this to migrate from trips to global_sends

-- Rename table
ALTER TABLE IF EXISTS trips RENAME TO global_sends;

-- Add new columns if they don't exist
ALTER TABLE global_sends 
  ADD COLUMN IF NOT EXISTS forum_post_id UUID REFERENCES community_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_people INTEGER,
  ADD COLUMN IF NOT EXISTS vibe_purpose TEXT,
  ADD COLUMN IF NOT EXISTS budget_range TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_global_sends_forum_post_id ON global_sends(forum_post_id);

-- Update existing index names if they reference trips
DO $$
BEGIN
  -- Rename indexes if they exist
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trips_user_id') THEN
    ALTER INDEX idx_trips_user_id RENAME TO idx_global_sends_user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_trips_start_date') THEN
    ALTER INDEX idx_trips_start_date RENAME TO idx_global_sends_start_date;
  END IF;
END $$;

-- Verify table was renamed and columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'global_sends'
ORDER BY ordinal_position;

