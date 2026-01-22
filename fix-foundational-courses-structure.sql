-- ============================================
-- FIX FOUNDATIONAL COURSES STRUCTURE
-- ============================================
-- This script restores the EXACT original Mindset/LifeDesign structure
-- 
-- ORIGINAL STRUCTURE:
-- - 4 Categories: starthere, mindset, lifedesign, thinkingtools
-- - 11 Sections total (1 + 3 + 4 + 3)
-- - 61 Videos total
--
-- MIGRATION:
-- - Sections → Modules (preserving exact order and structure)
-- - Videos → Lessons (preserving exact order and structure)
-- ============================================

-- Helper function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN trim(
    regexp_replace(
      regexp_replace(
        lower(title),
        '[^a-z0-9]+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    ),
    '-'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
DECLARE
  mindset_course_id UUID;
  dreamjob_course_id UUID;
  cs_rec RECORD;
  cv_rec RECORD;
  module_id_var UUID;
  lesson_id_var UUID;
  module_slug TEXT;
  lesson_slug TEXT;
  video_url TEXT;
  video_type TEXT;
  -- Track sort order globally across all sections
  global_sort_order INTEGER := 0;
BEGIN
  -- Get course IDs
  SELECT id INTO mindset_course_id FROM courses WHERE slug = 'mindset';
  SELECT id INTO dreamjob_course_id FROM courses WHERE slug = 'dream-job';

  -- ============================================
  -- STEP 1: DELETE ALL EXISTING MODULES AND LESSONS
  -- ============================================
  
  -- Delete lessons first (due to FK constraint)
  DELETE FROM course_lessons 
  WHERE module_id IN (
    SELECT id FROM course_modules 
    WHERE course_id IN (mindset_course_id, dreamjob_course_id)
  );

  -- Delete modules
  DELETE FROM course_modules 
  WHERE course_id IN (mindset_course_id, dreamjob_course_id);

  -- ============================================
  -- STEP 2: FIX COURSE COLORS
  -- ============================================
  
  UPDATE courses 
  SET color = '#06B6D4' 
  WHERE slug = 'mindset' AND (color IS NULL OR color != '#06B6D4');

  UPDATE courses 
  SET color = '#06B6D4' 
  WHERE slug = 'dream-job' AND (color IS NULL OR color != '#06B6D4');

  -- ============================================
  -- STEP 3: MIGRATE MINDSET SECTIONS → MODULES
  -- ============================================
  -- Migrate sections in the EXACT order they appear in the original structure
  -- Order: starthere (0) → mindset (1,2,10) → lifedesign (3,7,9,8) → thinkingtools (4,6,5)
  
  -- Reset global sort order
  global_sort_order := 0;

  -- Process sections in the exact order from seed data
  FOR cs_rec IN 
    SELECT 
      cs.id,
      cs.section_id,
      cs.number,
      cs.title,
      cs.description,
      cs.display_order,
      cc.category_id,
      cc.title as category_title,
      cc.display_order as category_order
    FROM course_sections cs
    JOIN course_categories cc ON cs.category_id = cc.id
    WHERE cc.course_type = 'mindset'
    ORDER BY 
      -- Order by category first (starthere=0, mindset=1, lifedesign=2, thinkingtools=3)
      cc.display_order,
      -- Then by section number within category
      cs.number,
      -- Then by section_id as tiebreaker
      cs.section_id
  LOOP
    -- Generate unique slug: category-section_id-title
    module_slug := generate_slug(
      cs_rec.category_id || 
      '-' || 
      cs_rec.section_id::text || 
      '-' || 
      cs_rec.title
    );
    
    -- Insert module with global sort order
    INSERT INTO course_modules (course_id, title, slug, description, sort_order, is_published)
    VALUES (
      mindset_course_id,
      cs_rec.title,
      module_slug,
      cs_rec.description,
      global_sort_order,
      true
    )
    ON CONFLICT (course_id, slug) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order
    RETURNING id INTO module_id_var;

    -- Increment global sort order
    global_sort_order := global_sort_order + 1;

    -- Migrate videos for this section → lessons (in exact order)
    FOR cv_rec IN
      SELECT 
        cv.id,
        cv.video_id,
        cv.title,
        cv.youtube_id,
        cv.loom_id,
        cv.display_order
      FROM course_videos cv
      WHERE cv.section_id = cs_rec.id
      ORDER BY cv.display_order, cv.id
    LOOP
      -- Determine video URL and type
      IF cv_rec.youtube_id IS NOT NULL AND cv_rec.youtube_id != '' THEN
        video_url := cv_rec.youtube_id;
        video_type := 'youtube';
      ELSIF cv_rec.loom_id IS NOT NULL AND cv_rec.loom_id != '' THEN
        video_url := cv_rec.loom_id;
        video_type := 'loom';
      ELSE
        video_url := NULL;
        video_type := NULL;
      END IF;

      -- Generate lesson slug: title-video_id
      lesson_slug := generate_slug(cv_rec.title || '-' || cv_rec.video_id);

      -- Insert lesson
      INSERT INTO course_lessons (
        module_id, 
        title, 
        slug, 
        video_url, 
        video_type, 
        sort_order, 
        is_published
      )
      VALUES (
        module_id_var,
        cv_rec.title,
        lesson_slug,
        video_url,
        video_type,
        cv_rec.display_order,
        true
      )
      ON CONFLICT (module_id, slug) DO UPDATE SET
        title = EXCLUDED.title,
        video_url = EXCLUDED.video_url,
        video_type = EXCLUDED.video_type,
        sort_order = EXCLUDED.sort_order;
    END LOOP;
  END LOOP;

  -- ============================================
  -- STEP 4: MIGRATE DREAMJOB SECTIONS → MODULES
  -- ============================================
  -- For DreamJob: course_sections become course_modules directly
  -- Order: sections 1-8 in order
  
  FOR cs_rec IN 
    SELECT 
      cs.id,
      cs.section_id,
      cs.title,
      cs.description,
      cs.display_order
    FROM course_sections cs
    JOIN course_categories cc ON cs.category_id = cc.id
    WHERE cc.course_type = 'dreamjob'
    ORDER BY cs.display_order, cs.section_id
  LOOP
    -- Generate unique slug: section-title-section_id
    module_slug := generate_slug(cs_rec.title || '-' || cs_rec.section_id::text);
    
    -- Insert module (use ON CONFLICT to handle duplicates)
    INSERT INTO course_modules (course_id, title, slug, description, sort_order, is_published)
    VALUES (
      dreamjob_course_id,
      cs_rec.title,
      module_slug,
      cs_rec.description,
      cs_rec.display_order,
      true
    )
    ON CONFLICT (course_id, slug) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order
    RETURNING id INTO module_id_var;

    -- Migrate videos for this section → lessons
    FOR cv_rec IN
      SELECT 
        cv.id,
        cv.video_id,
        cv.title,
        cv.youtube_id,
        cv.loom_id,
        cv.display_order
      FROM course_videos cv
      WHERE cv.section_id = cs_rec.id
      ORDER BY cv.display_order, cv.id
    LOOP
      -- Determine video URL and type
      IF cv_rec.youtube_id IS NOT NULL AND cv_rec.youtube_id != '' THEN
        video_url := cv_rec.youtube_id;
        video_type := 'youtube';
      ELSIF cv_rec.loom_id IS NOT NULL AND cv_rec.loom_id != '' THEN
        video_url := cv_rec.loom_id;
        video_type := 'loom';
      ELSE
        video_url := NULL;
        video_type := NULL;
      END IF;

      -- Generate lesson slug: title-video_id
      lesson_slug := generate_slug(cv_rec.title || '-' || cv_rec.video_id);

      -- Insert lesson
      INSERT INTO course_lessons (
        module_id, 
        title, 
        slug, 
        video_url, 
        video_type, 
        sort_order, 
        is_published
      )
      VALUES (
        module_id_var,
        cv_rec.title,
        lesson_slug,
        video_url,
        video_type,
        cv_rec.display_order,
        true
      )
      ON CONFLICT (module_id, slug) DO UPDATE SET
        title = EXCLUDED.title,
        video_url = EXCLUDED.video_url,
        video_type = EXCLUDED.video_type,
        sort_order = EXCLUDED.sort_order;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE 'Mindset course ID: %', mindset_course_id;
  RAISE NOTICE 'DreamJob course ID: %', dreamjob_course_id;
  RAISE NOTICE 'Total modules created for Mindset: %', global_sort_order;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count modules and lessons
SELECT 
  c.slug,
  c.title,
  c.color,
  COUNT(DISTINCT cm.id) as module_count,
  COUNT(DISTINCT cl.id) as lesson_count
FROM courses c
LEFT JOIN course_modules cm ON cm.course_id = c.id
LEFT JOIN course_lessons cl ON cl.module_id = cm.id
WHERE c.slug IN ('mindset', 'dream-job')
GROUP BY c.id, c.slug, c.title, c.color;

-- Show all modules for Mindset in order
SELECT 
  cm.title as module_title,
  cm.slug as module_slug,
  cm.sort_order,
  COUNT(cl.id) as lesson_count
FROM course_modules cm
JOIN courses c ON cm.course_id = c.id
LEFT JOIN course_lessons cl ON cl.module_id = cm.id
WHERE c.slug = 'mindset'
GROUP BY cm.id, cm.title, cm.slug, cm.sort_order
ORDER BY cm.sort_order;

-- Show all modules for DreamJob in order
SELECT 
  cm.title as module_title,
  cm.slug as module_slug,
  cm.sort_order,
  COUNT(cl.id) as lesson_count
FROM course_modules cm
JOIN courses c ON cm.course_id = c.id
LEFT JOIN course_lessons cl ON cl.module_id = cm.id
WHERE c.slug = 'dream-job'
GROUP BY cm.id, cm.title, cm.slug, cm.sort_order
ORDER BY cm.sort_order;

-- Check for duplicates
SELECT 
  c.slug,
  cm.slug as module_slug,
  COUNT(*) as duplicate_count
FROM course_modules cm
JOIN courses c ON cm.course_id = c.id
WHERE c.slug IN ('mindset', 'dream-job')
GROUP BY c.slug, cm.slug
HAVING COUNT(*) > 1;
