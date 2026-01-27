-- Check recent checkpoint submissions and their status
SELECT 
  uc.id,
  uc.user_id,
  uc.checkpoint_id,
  uc.status,
  uc.submitted_at,
  c.title as checkpoint_title,
  c.module_id,
  cm.title as module_title,
  cm.sort_order as module_sort_order,
  cm.course_id
FROM user_checkpoints uc
JOIN checkpoints c ON c.id = uc.checkpoint_id
JOIN course_modules cm ON cm.id = c.module_id
ORDER BY uc.submitted_at DESC
LIMIT 10;

-- Check which modules should be unlocked based on checkpoint approval
SELECT 
  cm.id as module_id,
  cm.title as module_title,
  cm.sort_order,
  cm.course_id,
  c.id as checkpoint_id,
  c.title as checkpoint_title,
  uc.status as checkpoint_status,
  CASE 
    WHEN uc.status = 'approved' THEN 'UNLOCKED'
    ELSE 'LOCKED'
  END as unlock_status
FROM course_modules cm
LEFT JOIN checkpoints c ON c.module_id = cm.id
LEFT JOIN user_checkpoints uc ON uc.checkpoint_id = c.id
WHERE cm.course_id = (SELECT course_id FROM course_modules ORDER BY sort_order LIMIT 1)
ORDER BY cm.sort_order;

