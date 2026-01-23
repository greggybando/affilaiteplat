-- ============================================
-- DIAGNOSE WHY "TRIAL PROJECT" IS LOCKED
-- ============================================

-- Step 1: Find the "Trial Project" module
SELECT 
  'TRIAL PROJECT MODULE' as info,
  cm.id as module_id,
  cm.title,
  cm.sort_order,
  c.id as course_id,
  c.slug as course_slug
FROM course_modules cm
JOIN courses c ON c.id = cm.course_id
WHERE cm.title ILIKE '%trial project%'
  OR cm.title ILIKE '%trial%';

-- Step 2: Check if there's a checkpoint on Trial Project
SELECT 
  'CHECKPOINT ON TRIAL PROJECT' as info,
  cp.id as checkpoint_id,
  cp.title,
  cp.module_id,
  cp.section_id,
  cm.title as module_title
FROM checkpoints cp
LEFT JOIN course_modules cm ON cm.id = cp.module_id
WHERE cm.title ILIKE '%trial project%'
  OR cm.title ILIKE '%trial%';

-- Step 3: Check if there's an unlock rule pointing TO Trial Project
SELECT 
  'UNLOCK RULE FOR TRIAL PROJECT' as info,
  ur.id as rule_id,
  ur.target_id_uuid,
  ur.required_checkpoint_id,
  ur.target_type,
  cm.title as target_module_title,
  cp.title as required_checkpoint_title
FROM unlock_rules ur
LEFT JOIN course_modules cm ON cm.id = ur.target_id_uuid::uuid
LEFT JOIN checkpoints cp ON cp.id = ur.required_checkpoint_id
WHERE cm.title ILIKE '%trial project%'
  OR cm.title ILIKE '%trial%';

-- Step 4: Check what module comes BEFORE Trial Project
SELECT 
  'MODULES BEFORE TRIAL PROJECT' as info,
  cm.id,
  cm.title,
  cm.sort_order,
  cp.id as checkpoint_id,
  cp.title as checkpoint_title,
  uc.status as user_checkpoint_status
FROM course_modules cm
LEFT JOIN courses c ON c.id = cm.course_id
LEFT JOIN checkpoints cp ON cp.module_id = cm.id
LEFT JOIN user_checkpoints uc ON uc.checkpoint_id = cp.id
WHERE c.slug = 'dream-job'
  AND cm.sort_order < (
    SELECT cm2.sort_order 
    FROM course_modules cm2
    JOIN courses c2 ON c2.id = cm2.course_id
    WHERE c2.slug = 'dream-job'
      AND (cm2.title ILIKE '%trial project%' OR cm2.title ILIKE '%trial%')
    LIMIT 1
  )
ORDER BY cm.sort_order DESC
LIMIT 3;

-- Step 5: Check if previous module has a checkpoint that's blocking
SELECT 
  'PREVIOUS MODULE CHECKPOINT STATUS' as info,
  cm_prev.title as previous_module,
  cm_prev.sort_order as prev_sort_order,
  cm_trial.title as trial_project_module,
  cm_trial.sort_order as trial_sort_order,
  cp.id as checkpoint_id,
  cp.title as checkpoint_title,
  uc.status as user_status,
  CASE 
    WHEN cp.id IS NULL THEN 'No checkpoint - should unlock'
    WHEN uc.status = 'approved' THEN 'Approved - should unlock'
    WHEN uc.status IS NULL THEN 'Not started - should unlock (new logic)'
    ELSE 'Blocking - status: ' || uc.status
  END as unlock_status
FROM course_modules cm_trial
JOIN courses c ON c.id = cm_trial.course_id
LEFT JOIN course_modules cm_prev ON cm_prev.course_id = c.id 
  AND cm_prev.sort_order = cm_trial.sort_order - 1
LEFT JOIN checkpoints cp ON cp.module_id = cm_prev.id
LEFT JOIN user_checkpoints uc ON uc.checkpoint_id = cp.id
WHERE c.slug = 'dream-job'
  AND (cm_trial.title ILIKE '%trial project%' OR cm_trial.title ILIKE '%trial%');

