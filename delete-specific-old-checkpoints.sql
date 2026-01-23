-- ============================================
-- DELETE SPECIFIC OLD CHECKPOINTS BLOCKING TRIAL PROJECT
-- ============================================
-- More targeted approach: Only delete checkpoints that are blocking modules
-- This preserves the ability to test the new system while cleaning up old data

-- OPTION 1: Delete only checkpoints on modules that come BEFORE Trial Project
-- (if those are old checkpoints blocking it)

-- First, let's see what we're deleting:
SELECT 
  'CHECKPOINTS TO DELETE (blocking Trial Project)' as action,
  cp.id,
  cp.title,
  cp.module_id,
  cp.section_id,
  cm.title as module_title,
  cm.sort_order,
  c.slug as course_slug
FROM checkpoints cp
JOIN course_modules cm ON cm.id = cp.module_id
JOIN courses c ON c.id = cm.course_id
WHERE c.slug = 'dream-job'
  AND cm.sort_order < (
    SELECT sort_order 
    FROM course_modules cm2
    JOIN courses c2 ON c2.id = cm2.course_id
    WHERE c2.slug = 'dream-job'
      AND (cm2.title ILIKE '%trial project%' OR cm2.title ILIKE '%trial%')
    LIMIT 1
  )
  AND (
    -- Old checkpoint (has section_id but no valid module_id)
    (cp.section_id IS NOT NULL AND cp.module_id IS NULL)
    OR (cp.section_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM course_modules WHERE id = cp.module_id
    ))
  );

-- OPTION 2: Delete ALL old checkpoints (more aggressive)
-- Uncomment this section if you want to delete all old checkpoints:

/*
-- Delete user_checkpoints for old checkpoints
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

-- Delete unlock_rules for old checkpoints
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

-- Delete old checkpoints
DELETE FROM checkpoints
WHERE section_id IS NOT NULL
  AND (
    module_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM course_modules WHERE id = module_id)
  );
*/

-- OPTION 3: Just delete the specific checkpoint blocking Trial Project
-- (if we know which one it is)

-- Run the diagnose script first to identify the exact checkpoint, then:
-- DELETE FROM user_checkpoints WHERE checkpoint_id = '<checkpoint_id>';
-- DELETE FROM unlock_rules WHERE required_checkpoint_id = '<checkpoint_id>';
-- DELETE FROM checkpoints WHERE id = '<checkpoint_id>';

