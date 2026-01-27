-- Fix globally_unlocked default: Change from false to NULL
-- This allows us to distinguish between:
-- - NULL = use sequential checkpoint logic (default)
-- - true = admin forced UNLOCK
-- - false = admin forced LOCK

-- Step 1: Change default from false to null
ALTER TABLE course_modules ALTER COLUMN globally_unlocked DROP DEFAULT;
ALTER TABLE course_modules ALTER COLUMN globally_unlocked SET DEFAULT NULL;

-- Step 2: Reset all modules that were never explicitly set (currently false) to null
-- This treats existing false values as "never set" so they use sequential logic
UPDATE course_modules SET globally_unlocked = NULL WHERE globally_unlocked = false;

-- Verify the change
SELECT 
  COUNT(*) as total_modules,
  COUNT(*) FILTER (WHERE globally_unlocked IS NULL) as null_modules,
  COUNT(*) FILTER (WHERE globally_unlocked = true) as unlocked_modules,
  COUNT(*) FILTER (WHERE globally_unlocked = false) as locked_modules
FROM course_modules;

