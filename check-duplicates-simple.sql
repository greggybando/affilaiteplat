-- ============================================
-- CHECK FOR DUPLICATES IN SOURCE DATA
-- (No function dependencies)
-- ============================================

-- 1. Check for duplicate section titles (these become module slugs)
SELECT 'Duplicate section titles:' as check_type, title, COUNT(*) as count
FROM course_sections 
GROUP BY title 
HAVING COUNT(*) > 1
ORDER BY count DESC, title;

-- 2. Check for duplicate video titles (these become lesson slugs)
SELECT 'Duplicate video titles:' as check_type, title, COUNT(*) as count
FROM course_videos 
GROUP BY title 
HAVING COUNT(*) > 1
ORDER BY count DESC, title;

-- 3. Check for duplicate video titles WITHIN the same section
-- (This would cause duplicate slugs within the same module)
SELECT 'Duplicate video titles within same section:' as check_type, 
  cs.id as section_id,
  cs.title as section_title,
  cv.title as video_title,
  cv.video_id,
  COUNT(*) as count
FROM course_videos cv
JOIN course_sections cs ON cv.section_id = cs.id
GROUP BY cs.id, cs.title, cv.title, cv.video_id
HAVING COUNT(*) > 1
ORDER BY count DESC, cs.title, cv.title;

-- 4. Check DreamJob sections that might generate duplicate slugs
-- (Same title + section_id combination)
SELECT 'DreamJob sections (check for duplicate titles):' as check_type,
  cs.id,
  cs.title,
  cs.section_id,
  cs.display_order,
  cc.course_type
FROM course_sections cs
JOIN course_categories cc ON cs.category_id = cc.id
WHERE cc.course_type = 'dreamjob'
ORDER BY cs.title, cs.section_id;

-- 5. Check for videos with same title + video_id within same section
-- (This would create duplicate lesson slugs)
SELECT 'Videos with same title+video_id in same section:' as check_type,
  cs.id as section_id,
  cs.title as section_title,
  cv.title as video_title,
  cv.video_id,
  COUNT(*) as count
FROM course_videos cv
JOIN course_sections cs ON cv.section_id = cs.id
JOIN course_categories cc ON cs.category_id = cc.id
WHERE cc.course_type IN ('mindset', 'dreamjob')
GROUP BY cs.id, cs.title, cv.title, cv.video_id
HAVING COUNT(*) > 1
ORDER BY count DESC, cs.title, cv.title;

-- 6. Show all DreamJob sections with their details
SELECT 'All DreamJob sections:' as check_type,
  cs.id,
  cs.title,
  cs.section_id,
  cs.display_order,
  COUNT(cv.id) as video_count
FROM course_sections cs
JOIN course_categories cc ON cs.category_id = cc.id
LEFT JOIN course_videos cv ON cv.section_id = cs.id
WHERE cc.course_type = 'dreamjob'
GROUP BY cs.id, cs.title, cs.section_id, cs.display_order
ORDER BY cs.display_order;

-- 7. Show all Mindset videos grouped by section
SELECT 'Mindset videos by section:' as check_type,
  cs.id as section_id,
  cs.title as section_title,
  cv.id as video_id,
  cv.title as video_title,
  cv.video_id as video_identifier,
  cv.display_order
FROM course_videos cv
JOIN course_sections cs ON cv.section_id = cs.id
JOIN course_categories cc ON cs.category_id = cc.id
WHERE cc.course_type = 'mindset'
ORDER BY cc.display_order, cs.display_order, cv.display_order
LIMIT 100;

