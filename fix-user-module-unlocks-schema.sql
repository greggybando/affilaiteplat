-- ============================================
-- FIX user_module_unlocks TABLE SCHEMA
-- ============================================
-- This migration ensures user_module_unlocks uses UUID for module_id
-- (matching the new dynamic course system)

-- Step 1: Drop the old table if it exists with wrong schema
-- (Only if it has INTEGER module_id)
DO $$
BEGIN
  -- Check if table exists with INTEGER module_id
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_module_unlocks' 
      AND column_name = 'module_id' 
      AND data_type = 'integer'
  ) THEN
    -- Drop old table
    DROP TABLE IF EXISTS user_module_unlocks CASCADE;
    RAISE NOTICE 'Dropped old user_module_unlocks table with INTEGER module_id';
  END IF;
END $$;

-- Step 2: Create the correct table with UUID module_id
CREATE TABLE IF NOT EXISTS user_module_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_by UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Add comment
COMMENT ON TABLE user_module_unlocks IS 'Admin can grant access to specific sections/modules for specific users';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_module_unlocks_user_id ON user_module_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_unlocks_module_id ON user_module_unlocks(module_id);

-- Verify the schema
SELECT 
  'VERIFICATION' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_module_unlocks'
  AND column_name IN ('user_id', 'module_id')
ORDER BY column_name;

