-- Check if any courses have globally_unlocked set to true
SELECT 
  id,
  title,
  slug,
  globally_unlocked,
  is_published
FROM courses
ORDER BY title;

-- Check user-specific unlocks for a specific user (replace USER_ID)
-- SELECT 
--   ucu.course_id,
--   c.title as course_title,
--   ucu.unlocked_at
-- FROM user_course_unlocks ucu
-- JOIN courses c ON c.id = ucu.course_id
-- WHERE ucu.user_id = 'USER_ID_HERE';

-- Check module-specific unlocks for a specific user (replace USER_ID)
-- SELECT 
--   umu.module_id,
--   cm.title as module_title,
--   c.title as course_title,
--   umu.unlocked_at
-- FROM user_module_unlocks umu
-- JOIN course_modules cm ON cm.id = umu.module_id
-- JOIN courses c ON c.course_id = cm.course_id
-- WHERE umu.user_id = 'USER_ID_HERE';

