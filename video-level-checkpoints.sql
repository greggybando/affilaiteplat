-- =====================================================
-- VIDEO-LEVEL CHECKPOINTS MIGRATION
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. Add video_id column to checkpoints table (nullable)
-- If video_id is NULL = section-level checkpoint (current behavior)
-- If video_id is set = video-level checkpoint (new feature)
ALTER TABLE checkpoints
ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES course_videos(id) ON DELETE CASCADE;

-- 2. Add index for faster video checkpoint lookups
CREATE INDEX IF NOT EXISTS idx_checkpoints_video_id ON checkpoints(video_id);

-- 3. Create user_video_unlocks table to track which videos are unlocked
CREATE TABLE IF NOT EXISTS user_video_unlocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    course_type TEXT NOT NULL,
    section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES course_videos(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

-- 4. Add indexes for user_video_unlocks
CREATE INDEX IF NOT EXISTS idx_user_video_unlocks_user_id ON user_video_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_video_unlocks_section_id ON user_video_unlocks(section_id);
CREATE INDEX IF NOT EXISTS idx_user_video_unlocks_video_id ON user_video_unlocks(video_id);

-- 5. Enable RLS on user_video_unlocks
ALTER TABLE user_video_unlocks ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for user_video_unlocks
DROP POLICY IF EXISTS "Users can view their own video unlocks" ON user_video_unlocks;
CREATE POLICY "Users can view their own video unlocks"
ON user_video_unlocks FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage video unlocks" ON user_video_unlocks;
CREATE POLICY "Service role can manage video unlocks"
ON user_video_unlocks FOR ALL
USING (true)
WITH CHECK (true);

-- 7. Grant permissions
GRANT SELECT ON user_video_unlocks TO authenticated;
GRANT ALL ON user_video_unlocks TO service_role;

-- =====================================================
-- VERIFICATION QUERIES (run these to verify migration)
-- =====================================================

-- Check if video_id column exists
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'checkpoints' AND column_name = 'video_id';

-- Check if user_video_unlocks table exists
-- SELECT * FROM user_video_unlocks LIMIT 1;

-- =====================================================
-- NOTES
-- =====================================================
-- After running this migration:
-- 1. Existing checkpoints will have video_id = NULL (section-level)
-- 2. You can now create checkpoints with video_id set (video-level)
-- 3. Video-level checkpoints gate the NEXT video in the section
-- 4. Section-level checkpoints still gate the NEXT section (unchanged)

