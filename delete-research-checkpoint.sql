-- ============================================
-- DELETE CHECKPOINT ON "RESEARCH LIKE HEAVEN" 
-- TO UNLOCK "TRIAL PROJECT"
-- ============================================
-- Based on diagnostic results:
-- - Previous module: "RESEARCH LIKE HEAVEN" (sort_order: 3)
-- - Trial Project: "TRIAL PROJECT" (sort_order: 4)
-- - Checkpoint ID: 17243eab-3da1-4b62-a29a-a50219f4324a

-- Step 1: Verify what we're deleting
SELECT 
  'CHECKPOINT TO DELETE' as action,
  cp.id,
  cp.title,
  cp.module_id,
  cp.section_id,
  cm.title as module_title,
  cm.sort_order
FROM checkpoints cp
JOIN course_modules cm ON cm.id = cp.module_id
WHERE cp.id = '17243eab-3da1-4b62-a29a-a50219f4324a'
  OR (cm.title ILIKE '%research like%' AND cp.section_id IS NOT NULL);

-- Step 2: Count user_checkpoints that will be deleted
SELECT 
  'USER_CHECKPOINTS TO DELETE' as action,
  COUNT(*) as count
FROM user_checkpoints
WHERE checkpoint_id = '17243eab-3da1-4b62-a29a-a50219f4324a'
  OR checkpoint_id IN (
    SELECT cp.id
    FROM checkpoints cp
    JOIN course_modules cm ON cm.id = cp.module_id
    WHERE cm.title ILIKE '%research like%' AND cp.section_id IS NOT NULL
  );

-- Step 3: Count unlock_rules that will be deleted
SELECT 
  'UNLOCK_RULES TO DELETE' as action,
  COUNT(*) as count
FROM unlock_rules
WHERE required_checkpoint_id = '17243eab-3da1-4b62-a29a-a50219f4324a'
  OR required_checkpoint_id IN (
    SELECT cp.id
    FROM checkpoints cp
    JOIN course_modules cm ON cm.id = cp.module_id
    WHERE cm.title ILIKE '%research like%' AND cp.section_id IS NOT NULL
  );

-- Step 4: DELETE IN ORDER (respecting foreign key constraints)

-- 4a. Delete user_checkpoints first
DELETE FROM user_checkpoints
WHERE checkpoint_id = '17243eab-3da1-4b62-a29a-a50219f4324a'
  OR checkpoint_id IN (
    SELECT cp.id
    FROM checkpoints cp
    JOIN course_modules cm ON cm.id = cp.module_id
    WHERE cm.title ILIKE '%research like%' AND cp.section_id IS NOT NULL
  );

-- 4b. Delete unlock_rules that reference this checkpoint
DELETE FROM unlock_rules
WHERE required_checkpoint_id = '17243eab-3da1-4b62-a29a-a50219f4324a'
  OR required_checkpoint_id IN (
    SELECT cp.id
    FROM checkpoints cp
    JOIN course_modules cm ON cm.id = cp.module_id
    WHERE cm.title ILIKE '%research like%' AND cp.section_id IS NOT NULL
  );

-- 4c. Delete the checkpoint itself
DELETE FROM checkpoints
WHERE id = '17243eab-3da1-4b62-a29a-a50219f4324a'
  OR id IN (
    SELECT cp.id
    FROM checkpoints cp
    JOIN course_modules cm ON cm.id = cp.module_id
    WHERE cm.title ILIKE '%research like%' AND cp.section_id IS NOT NULL
  );

-- Step 5: Verify Trial Project is now unlocked
SELECT 
  'VERIFICATION - TRIAL PROJECT STATUS' as action,
  cm_trial.title as trial_project_module,
  cm_trial.sort_order,
  cm_prev.title as previous_module,
  cm_prev.sort_order as prev_sort_order,
  cp.id as checkpoint_id,
  CASE 
    WHEN cp.id IS NULL THEN '✓ UNLOCKED - No checkpoint blocking'
    ELSE '✗ Still has checkpoint: ' || cp.title
  END as status
FROM course_modules cm_trial
JOIN courses c ON c.id = cm_trial.course_id
LEFT JOIN course_modules cm_prev ON cm_prev.course_id = c.id 
  AND cm_prev.sort_order = cm_trial.sort_order - 1
LEFT JOIN checkpoints cp ON cp.module_id = cm_prev.id
WHERE c.slug = 'dream-job'
  AND cm_trial.title ILIKE '%trial project%';

