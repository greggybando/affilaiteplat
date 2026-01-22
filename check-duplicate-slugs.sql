-- Diagnostic query to find duplicate slugs that would cause conflicts

-- Check for duplicate category titles in Mindset
SELECT 'Mindset Categories with duplicate titles:' as check_type, cc.title, COUNT(*) as count
FROM course_categories cc
WHERE cc.course_type = 'mindset'
GROUP BY cc.title
HAVING COUNT(*) > 1;

-- Check for duplicate section titles in DreamJob
SELECT 'DreamJob Sections with duplicate titles:' as check_type, cs.title, cs.section_id, COUNT(*) as count
FROM course_sections cs
JOIN course_categories cc ON cs.category_id = cc.id
WHERE cc.course_type = 'dreamjob'
GROUP BY cs.title, cs.section_id
HAVING COUNT(*) > 1;

-- Check for duplicate video titles + video_ids
SELECT 'Videos with duplicate title+video_id:' as check_type, cv.title, cv.video_id, COUNT(*) as count
FROM course_videos cv
JOIN course_sections cs ON cv.section_id = cs.id
JOIN course_categories cc ON cs.category_id = cc.id
WHERE cc.course_type IN ('mindset', 'dreamjob')
GROUP BY cv.title, cv.video_id
HAVING COUNT(*) > 1;

-- Check what slugs would be generated for DreamJob modules
SELECT 'DreamJob module slugs that would be generated:' as check_type, 
  cs.title, 
  cs.section_id,
  generate_slug(cs.title || '-' || cs.section_id::text) as generated_slug,
  COUNT(*) OVER (PARTITION BY generate_slug(cs.title || '-' || cs.section_id::text)) as slug_count
FROM course_sections cs
JOIN course_categories cc ON cs.category_id = cc.id
WHERE cc.course_type = 'dreamjob'
ORDER BY generated_slug, cs.section_id;

