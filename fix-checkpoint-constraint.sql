-- Fix checkpoint constraint to allow both section-level AND video-level checkpoints
-- Current constraint: Only one checkpoint per section_id (wrong)
-- New constraint: Only one checkpoint per (section_id, video_id) combination
--   This allows: one section-level (video_id=NULL) + multiple video-level (each video can have one)

-- Step 1: Drop the existing constraint
ALTER TABLE checkpoints DROP CONSTRAINT IF EXISTS checkpoints_section_id_key;

-- Step 2: Add the correct composite unique constraint
-- This ensures:
-- - Only ONE section-level checkpoint per section (where video_id IS NULL)
-- - Only ONE checkpoint per video (where video_id IS NOT NULL)
ALTER TABLE checkpoints ADD CONSTRAINT checkpoints_section_video_unique 
  UNIQUE NULLS NOT DISTINCT (section_id, video_id);

-- Note: NULLS NOT DISTINCT treats NULL values as equal for uniqueness
-- So (section_id='abc', video_id=NULL) can only appear once

