-- Add globally_unlocked column to course_modules table
-- This allows admins to globally unlock a module for all users

ALTER TABLE course_modules 
ADD COLUMN IF NOT EXISTS globally_unlocked BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN course_modules.globally_unlocked IS 'When true, this module is accessible to all users without checkpoint completion';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_course_modules_globally_unlocked ON course_modules(globally_unlocked) WHERE globally_unlocked = true;

-- Verify column was added
SELECT 
  'COURSE_MODULES TABLE COLUMNS' as check_type,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'course_modules'
  AND column_name IN ('globally_unlocked')
ORDER BY column_name;

