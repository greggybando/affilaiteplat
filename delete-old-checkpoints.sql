-- ============================================
-- DELETE OLD CHECKPOINTS FROM PRE-MIGRATION SYSTEM
-- ============================================
-- This script deletes checkpoints that were created in the old system
-- (those that reference course_sections instead of course_modules)
-- and all associated user submissions and unlock rules

-- STEP 1: Show what we're about to delete (for verification)
SELECT 
  'CHECKPOINTS TO DELETE' as action,
  c.id,
  c.title,
  c.section_id,
  c.module_id,
  cs.title as old_section_title,
  cm.title as new_module_title,
  CASE 
    WHEN c.module_id IS NULL THEN 'No module_id mapped'
    WHEN NOT EXISTS (SELECT 1 FROM course_modules WHERE id = c.module_id) THEN 'module_id references non-existent module'
    ELSE 'module_id exists but may be orphaned'
  END as reason
FROM checkpoints c
LEFT JOIN course_sections cs ON cs.id = c.section_id
LEFT JOIN course_modules cm ON cm.id = c.module_id
WHERE c.section_id IS NOT NULL
  AND (
    -- Checkpoint has section_id but no module_id
    c.module_id IS NULL
    -- OR module_id doesn't exist in course_modules
    OR NOT EXISTS (SELECT 1 FROM course_modules WHERE id = c.module_id)
    -- OR section_id exists but doesn't map to a valid module
    OR (c.section_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM course_modules cm2
      JOIN course_sections cs2 ON cs2.title = cm2.title
      WHERE cs2.id = c.section_id
    ))
  )
ORDER BY c.created_at;

-- STEP 2: Count user_checkpoints that will be deleted
SELECT 
  'USER_CHECKPOINTS TO DELETE' as action,
  COUNT(*) as count
FROM user_checkpoints uc
WHERE uc.checkpoint_id IN (
  SELECT c.id
  FROM checkpoints c
  WHERE c.section_id IS NOT NULL
    AND (
      c.module_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM course_modules WHERE id = c.module_id)
    )
);

-- STEP 3: Count unlock_rules that will be deleted
SELECT 
  'UNLOCK_RULES TO DELETE' as action,
  COUNT(*) as count
FROM unlock_rules ur
WHERE ur.required_checkpoint_id IN (
  SELECT c.id
  FROM checkpoints c
  WHERE c.section_id IS NOT NULL
    AND (
      c.module_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM course_modules WHERE id = c.module_id)
    )
);

-- STEP 4: DELETE IN ORDER (respecting foreign key constraints)

-- 4a. Delete user_checkpoints first (they reference checkpoints)
DELETE FROM user_checkpoints
WHERE checkpoint_id IN (
  SELECT c.id
  FROM checkpoints c
  WHERE c.section_id IS NOT NULL
    AND (
      c.module_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM course_modules WHERE id = c.module_id)
    )
);

-- 4b. Delete unlock_rules that reference these checkpoints
DELETE FROM unlock_rules
WHERE required_checkpoint_id IN (
  SELECT c.id
  FROM checkpoints c
  WHERE c.section_id IS NOT NULL
    AND (
      c.module_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM course_modules WHERE id = c.module_id)
    )
);

-- 4c. Delete the old checkpoints themselves
DELETE FROM checkpoints
WHERE section_id IS NOT NULL
  AND (
    module_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM course_modules WHERE id = module_id)
  );

-- STEP 5: Verification - Show remaining checkpoints
SELECT 
  'REMAINING CHECKPOINTS' as action,
  COUNT(*) as count,
  COUNT(CASE WHEN module_id IS NOT NULL THEN 1 END) as with_module_id,
  COUNT(CASE WHEN section_id IS NOT NULL THEN 1 END) as with_section_id
FROM checkpoints;

-- Show remaining checkpoints with details
SELECT 
  id,
  title,
  section_id,
  module_id,
  created_at
FROM checkpoints
ORDER BY created_at DESC
LIMIT 20;

