-- ============================================
-- UNIFIED CHECKPOINT & LOCK SYSTEM MIGRATION
-- ============================================
-- Updates existing checkpoint tables to work with new course_modules structure
-- Works for ALL course types: foundational, skillbank, and affiliate

-- STEP 1: Add module_id column to checkpoints (nullable initially)
ALTER TABLE checkpoints
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE;

-- STEP 2: Add index for module_id
CREATE INDEX IF NOT EXISTS idx_checkpoints_module_id ON checkpoints(module_id);

-- STEP 3: Migrate data from section_id to module_id
-- This maps old course_sections to new course_modules based on matching titles/order
-- Note: This is a best-effort migration. Admin should verify and fix any mismatches.
UPDATE checkpoints c
SET module_id = (
  SELECT cm.id
  FROM course_modules cm
  JOIN course_sections cs ON cs.id = c.section_id
  WHERE cm.title = cs.title
  LIMIT 1
)
WHERE c.module_id IS NULL
AND EXISTS (
  SELECT 1 FROM course_sections cs WHERE cs.id = c.section_id
);

-- STEP 4: Rename ai_review_prompt to ai_grading_prompt if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkpoints' AND column_name = 'ai_review_prompt'
  ) THEN
    ALTER TABLE checkpoints RENAME COLUMN ai_review_prompt TO ai_grading_prompt;
  END IF;
END $$;

-- STEP 5: Add ai_grading_prompt if it doesn't exist
ALTER TABLE checkpoints
ADD COLUMN IF NOT EXISTS ai_grading_prompt TEXT;

-- STEP 6: Update checkpoints table structure to match requirements
-- Make module_id NOT NULL after migration (but allow NULL for now to handle edge cases)
-- Note: We'll keep section_id for backward compatibility during transition

-- STEP 7: Update user_checkpoints table
-- Remove ai_status column (we use status field instead)
ALTER TABLE user_checkpoints
DROP COLUMN IF EXISTS ai_status;

-- Rename ai_reason to ai_review_notes if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_checkpoints' AND column_name = 'ai_reason'
  ) THEN
    ALTER TABLE user_checkpoints RENAME COLUMN ai_reason TO ai_review_notes;
  END IF;
END $$;

-- Add ai_review_notes if it doesn't exist
ALTER TABLE user_checkpoints
ADD COLUMN IF NOT EXISTS ai_review_notes TEXT;

-- Add ai_review_passed if it doesn't exist
ALTER TABLE user_checkpoints
ADD COLUMN IF NOT EXISTS ai_review_passed BOOLEAN;

-- Ensure status column has correct check constraint
DO $$ 
BEGIN
  -- Drop existing constraint if it exists with different name
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_checkpoints' 
    AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%status%'
  ) THEN
    -- We'll recreate it below
    NULL;
  END IF;
END $$;

-- Add check constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'user_checkpoints' 
    AND constraint_name LIKE '%status%check%'
  ) THEN
    ALTER TABLE user_checkpoints
    ADD CONSTRAINT user_checkpoints_status_check 
    CHECK (status IN ('pending', 'approved', 'denied', 'needs_review'));
  END IF;
END $$;

-- Add UNIQUE constraint on (user_id, checkpoint_id) if it doesn't exist
-- First, clean up any duplicates
DELETE FROM user_checkpoints
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY user_id, checkpoint_id 
                ORDER BY 
                    CASE status
                        WHEN 'approved' THEN 1
                        WHEN 'denied' THEN 2
                        WHEN 'needs_review' THEN 3
                        WHEN 'pending' THEN 4
                        ELSE 5
                    END,
                    submitted_at DESC NULLS LAST,
                    created_at DESC
            ) as rn
        FROM user_checkpoints
    ) ranked
    WHERE rn > 1
);

-- Now add the unique constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_checkpoints' 
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%user_id%checkpoint_id%'
  ) THEN
    ALTER TABLE user_checkpoints
    ADD CONSTRAINT user_checkpoints_user_checkpoint_unique 
    UNIQUE (user_id, checkpoint_id);
  END IF;
END $$;

-- STEP 8: Update unlock_rules table
-- Change target_id from TEXT to UUID for modules (keep TEXT for courses)
-- This is complex - we'll add a new column and migrate
ALTER TABLE unlock_rules
ADD COLUMN IF NOT EXISTS target_id_uuid UUID;

-- Migrate section UUIDs to target_id_uuid
UPDATE unlock_rules
SET target_id_uuid = target_id::UUID
WHERE target_type = 'section'
AND target_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Update target_type to use 'module' instead of 'section'
UPDATE unlock_rules
SET target_type = 'module'
WHERE target_type = 'section';

-- Add check constraint for target_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'unlock_rules' 
    AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%target_type%'
  ) THEN
    ALTER TABLE unlock_rules
    ADD CONSTRAINT unlock_rules_target_type_check 
    CHECK (target_type IN ('course', 'module'));
  END IF;
END $$;

-- STEP 9: Add missing indexes
CREATE INDEX IF NOT EXISTS idx_user_checkpoints_checkpoint_status 
ON user_checkpoints(checkpoint_id, status);

-- STEP 10: Update checkpoints to allow NULL for section_id (for transition period)
-- Keep section_id for backward compatibility but make it nullable
ALTER TABLE checkpoints
ALTER COLUMN section_id DROP NOT NULL;

-- STEP 11: Add constraint to ensure either module_id or section_id exists
-- (During transition, we allow both; eventually module_id will be required)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'checkpoints' 
    AND constraint_name = 'checkpoints_module_or_section_check'
  ) THEN
    ALTER TABLE checkpoints
    ADD CONSTRAINT checkpoints_module_or_section_check 
    CHECK (module_id IS NOT NULL OR section_id IS NOT NULL);
  END IF;
END $$;

-- STEP 12: Update unique constraint on checkpoints
-- Remove old unique constraint on section_id if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'checkpoints' 
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%section_id%'
    AND constraint_name != 'checkpoints_section_video_unique'
  ) THEN
    -- We'll handle this manually - drop the constraint
    ALTER TABLE checkpoints DROP CONSTRAINT IF EXISTS checkpoints_section_id_key;
  END IF;
END $$;

-- Add unique constraint on module_id (one checkpoint per module)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'checkpoints' 
    AND constraint_type = 'UNIQUE'
    AND constraint_name = 'checkpoints_module_id_unique'
  ) THEN
    ALTER TABLE checkpoints
    ADD CONSTRAINT checkpoints_module_id_unique UNIQUE (module_id);
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:

-- Check checkpoint columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'checkpoints' 
-- ORDER BY ordinal_position;

-- Check user_checkpoints columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_checkpoints' 
-- ORDER BY ordinal_position;

-- Check unlock_rules columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'unlock_rules' 
-- ORDER BY ordinal_position;

-- Check for checkpoints with module_id
-- SELECT COUNT(*) as checkpoints_with_module_id 
-- FROM checkpoints WHERE module_id IS NOT NULL;

-- Check for checkpoints still using section_id
-- SELECT COUNT(*) as checkpoints_with_section_id 
-- FROM checkpoints WHERE section_id IS NOT NULL;

