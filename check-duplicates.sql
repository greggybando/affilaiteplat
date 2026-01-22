-- ============================================
-- CHECK FOR DUPLICATES IN SOURCE DATA
-- ============================================

-- Check for duplicate section titles (these become module slugs)
SELECT 'Duplicate section titles:' as check_type, title, COUNT(*) as count
FROM course_sections 
GROUP BY title 
HAVING COUNT(*) > 1
ORDER BY count DESC, title;

-- Check for duplicate video titles (these become lesson slugs)
SELECT 'Duplicate video titles:' as check_type, title, COUNT(*) as count
FROM course_videos 
GROUP BY title 
HAVING COUNT(*) > 1
ORDER BY count DESC, title;

-- Check for duplicate video titles WITHIN the same section
-- (This would cause duplicate slugs within the same module)
SELECT 'Duplicate video titles within same section:' as check_type, 
  cs.title as section_title,
  cv.title as video_title,
  COUNT(*) as count
FROM course_videos cv
JOIN course_sections cs ON cv.section_id = cs.id
GROUP BY cs.title, cv.title
HAVING COUNT(*) > 1
ORDER BY count DESC, cs.title, cv.title;

-- Check what slugs would be generated for DreamJob modules
-- (to see if section_id inclusion helps)
SELECT 'DreamJob section titles and potential slugs:' as check_type,
  cs.title,
  cs.section_id,
  generate_slug(cs.title || '-' || cs.section_id::text) as generated_slug,
  COUNT(*) OVER (PARTITION BY generate_slug(cs.title || '-' || cs.section_id::text)) as slug_count
FROM course_sections cs
JOIN course_categories cc ON cs.category_id = cc.id
WHERE cc.course_type = 'dreamjob'
ORDER BY cs.display_order;

-- Check what slugs would be generated for videos (with video_id)
SELECT 'Video titles and potential lesson slugs:' as check_type,
  cs.title as section_title,
  cv.title as video_title,
  cv.video_id,
  generate_slug(cv.title || '-' || cv.video_id) as generated_slug,
  COUNT(*) OVER (PARTITION BY cs.id, generate_slug(cv.title || '-' || cv.video_id)) as slug_count_per_section
FROM course_videos cv
JOIN course_sections cs ON cv.section_id = cs.id
JOIN course_categories cc ON cs.category_id = cc.id
WHERE cc.course_type IN ('mindset', 'dreamjob')
ORDER BY cc.course_type, cs.display_order, cv.display_order
LIMIT 50;

