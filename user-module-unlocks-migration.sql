-- Migration: Create user_module_unlocks table for direct module unlock tracking
-- This provides a simple, direct way to track which modules a user has unlocked
-- without relying on complex UUID-to-module-ID mapping

-- Create the table
CREATE TABLE IF NOT EXISTS user_module_unlocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  course_type VARCHAR(50) NOT NULL, -- 'dreamjob', 'mindset', etc.
  module_id INTEGER NOT NULL, -- The numeric module ID (1, 2, 3, etc.)
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate unlocks
  UNIQUE(user_id, course_type, module_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_module_unlocks_user 
  ON user_module_unlocks(user_id);

CREATE INDEX IF NOT EXISTS idx_user_module_unlocks_course 
  ON user_module_unlocks(user_id, course_type);

-- Enable RLS
ALTER TABLE user_module_unlocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own unlocks
CREATE POLICY "Users can view own module unlocks"
  ON user_module_unlocks
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Service role can do anything (for API)
CREATE POLICY "Service role full access to module unlocks"
  ON user_module_unlocks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON user_module_unlocks TO service_role;
GRANT SELECT ON user_module_unlocks TO authenticated;


