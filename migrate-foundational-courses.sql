-- ============================================
-- MIGRATE FOUNDATIONAL COURSES TO NEW STRUCTURE
-- ============================================
-- This script migrates Mindset and DreamJob courses from:
--   OLD: course_categories → course_sections → course_videos
--   NEW: courses → course_modules → course_lessons
--
-- IMPORTANT: Old tables are NOT deleted - kept as backup
-- Run this script in Supabase SQL Editor
-- ============================================

-- Helper function to generate slug from title (matches frontend logic)
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

-- ============================================
-- STEP 1: CREATE COURSE ENTRIES
-- ============================================

DO $$
DECLARE
  mindset_course_id UUID;
  dreamjob_course_id UUID;
  cs_rec RECORD;
  cv_rec RECORD;
  cc_rec RECORD;
  module_id_var UUID;
  lesson_slug TEXT;
  existing_lesson_id UUID;
  module_slug TEXT;
  existing_module_id UUID;
BEGIN
  -- Create Mindset course (or get existing)
  INSERT INTO courses (slug, title, description, emoji, color, sort_order, is_published)
  VALUES ('mindset', 'Mindset & Foundations', 'Rewire your brain. Kill limiting beliefs. Become unstoppable.', '🧠', '#8B5CF6', 0, true)
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    emoji = EXCLUDED.emoji,
    color = EXCLUDED.color
  RETURNING id INTO mindset_course_id;
  
  -- Get ID if already exists
  IF mindset_course_id IS NULL THEN
    SELECT id INTO mindset_course_id FROM courses WHERE slug = 'mindset';
  END IF;

  -- Create DreamJob course (or get existing)
  INSERT INTO courses (slug, title, description, emoji, color, sort_order, is_published)
  VALUES ('dream-job', 'Get Your Dream Job', 'Stop applying to 100 jobs. Land the ONE you actually want.', '💼', '#06B6D4', 1, true)
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    emoji = EXCLUDED.emoji,
    color = EXCLUDED.color
  RETURNING id INTO dreamjob_course_id;
  
  -- Get ID if already exists
  IF dreamjob_course_id IS NULL THEN
    SELECT id INTO dreamjob_course_id FROM courses WHERE slug = 'dream-job';
  END IF;

  -- ============================================
  -- STEP 2: MIGRATE MINDSET MODULES
  -- ============================================
  -- Mindset has multiple categories, each becomes a module
  -- Insert modules one at a time to avoid conflicts
  
  FOR cc_rec IN 
    SELECT DISTINCT ON (cc.id) cc.id, cc.title, cc.display_order
    FROM course_categories cc
    WHERE cc.course_type = 'mindset'
    ORDER BY cc.id, cc.display_order
  LOOP
    module_slug := generate_slug(cc_rec.title);
    
    SELECT id INTO existing_module_id
    FROM course_modules
    WHERE course_id = mindset_course_id AND slug = module_slug
    LIMIT 1;
    
    IF existing_module_id IS NULL THEN
      INSERT INTO course_modules (course_id, title, slug, description, sort_order, is_published)
      VALUES (
        mindset_course_id,
        cc_rec.title,
        module_slug,
        cc_rec.title,
        cc_rec.display_order,
        true
      );
    ELSE
      UPDATE course_modules
      SET 
        title = cc_rec.title,
        description = cc_rec.title,
        sort_order = cc_rec.display_order
      WHERE id = existing_module_id;
    END IF;
  END LOOP;

  -- ============================================
  -- STEP 3: MIGRATE MINDSET LESSONS
  -- ============================================
  -- Insert lessons one at a time to avoid conflicts
  
  FOR cv_rec IN
    SELECT DISTINCT ON (cv.id) cv.id, cv.title, cv.video_id, cv.youtube_id, cv.loom_id, cv.display_order, cc.title as category_title, cc.display_order as cc_order, cs.display_order as cs_order
    FROM course_videos cv
    JOIN course_sections cs ON cv.section_id = cs.id
    JOIN course_categories cc ON cs.category_id = cc.id
    WHERE cc.course_type = 'mindset'
    ORDER BY cv.id, cc_order, cs_order, cv.display_order
  LOOP
    -- Get the module ID first
    SELECT cm.id INTO module_id_var
    FROM course_modules cm
    WHERE cm.course_id = mindset_course_id 
      AND cm.slug = generate_slug(cv_rec.category_title)
    LIMIT 1;
    
    -- Only insert if module found
    IF module_id_var IS NOT NULL THEN
      -- Check if lesson already exists to avoid conflicts
      lesson_slug := generate_slug(cv_rec.title || '-' || cv_rec.video_id);
      
      SELECT id INTO existing_lesson_id
      FROM course_lessons
      WHERE module_id = module_id_var AND slug = lesson_slug
      LIMIT 1;
      
      IF existing_lesson_id IS NULL THEN
        -- Insert new lesson
        INSERT INTO course_lessons (module_id, title, slug, description, video_url, video_type, sort_order, is_published)
        VALUES (
          module_id_var,
          cv_rec.title,
          lesson_slug,
          cv_rec.title,
          COALESCE(cv_rec.youtube_id, cv_rec.loom_id),
          CASE 
            WHEN cv_rec.youtube_id IS NOT NULL THEN 'youtube'
            WHEN cv_rec.loom_id IS NOT NULL THEN 'loom'
            ELSE NULL
          END,
          cv_rec.display_order,
          true
        );
      ELSE
        -- Update existing lesson
        UPDATE course_lessons
        SET 
          title = cv_rec.title,
          description = cv_rec.title,
          video_url = COALESCE(cv_rec.youtube_id, cv_rec.loom_id),
          video_type = CASE 
            WHEN cv_rec.youtube_id IS NOT NULL THEN 'youtube'
            WHEN cv_rec.loom_id IS NOT NULL THEN 'loom'
            ELSE NULL
          END,
          sort_order = cv_rec.display_order
        WHERE id = existing_lesson_id;
      END IF;
    END IF;
  END LOOP;

  -- ============================================
  -- STEP 4: MIGRATE DREAMJOB MODULES
  -- ============================================
  -- DreamJob has a single category, sections become modules
  -- Use section_id to ensure unique slugs
  
  -- Insert modules one at a time to avoid conflicts
  FOR cs_rec IN 
    SELECT DISTINCT ON (cs.id) cs.id, cs.title, cs.section_id, cs.description, cs.display_order
    FROM course_sections cs
    JOIN course_categories cc ON cs.category_id = cc.id
    WHERE cc.course_type = 'dreamjob'
    ORDER BY cs.id, cs.display_order
  LOOP
    module_slug := generate_slug(cs_rec.title || '-' || cs_rec.section_id::text);
    
    SELECT id INTO existing_module_id
    FROM course_modules
    WHERE course_id = dreamjob_course_id AND slug = module_slug
    LIMIT 1;
    
    IF existing_module_id IS NULL THEN
      INSERT INTO course_modules (course_id, title, slug, description, sort_order, is_published)
      VALUES (
        dreamjob_course_id,
        cs_rec.title,
        module_slug,
        COALESCE(cs_rec.description, cs_rec.title),
        cs_rec.display_order,
        true
      );
    ELSE
      UPDATE course_modules
      SET 
        title = cs_rec.title,
        description = COALESCE(cs_rec.description, cs_rec.title),
        sort_order = cs_rec.display_order
      WHERE id = existing_module_id;
    END IF;
  END LOOP;

  -- ============================================
  -- STEP 5: MIGRATE DREAMJOB LESSONS
  -- ============================================
  -- Insert lessons one at a time to avoid conflicts
  
  FOR cv_rec IN
    SELECT DISTINCT ON (cv.id) cv.id, cv.title, cv.video_id, cv.youtube_id, cv.loom_id, cv.display_order, cs.title as section_title, cs.section_id, cs.display_order as cs_order
    FROM course_videos cv
    JOIN course_sections cs ON cv.section_id = cs.id
    JOIN course_categories cc ON cs.category_id = cc.id
    WHERE cc.course_type = 'dreamjob'
    ORDER BY cv.id, cs_order, cv.display_order
  LOOP
    -- Get the module ID first
    SELECT cm.id INTO module_id_var
    FROM course_modules cm
    WHERE cm.course_id = dreamjob_course_id
      AND cm.slug = generate_slug(cv_rec.section_title || '-' || cv_rec.section_id::text)
    LIMIT 1;
    
    -- Only insert if module found
    IF module_id_var IS NOT NULL THEN
      -- Check if lesson already exists to avoid conflicts
      lesson_slug := generate_slug(cv_rec.title || '-' || cv_rec.video_id);
      
      SELECT id INTO existing_lesson_id
      FROM course_lessons
      WHERE module_id = module_id_var AND slug = lesson_slug
      LIMIT 1;
      
      IF existing_lesson_id IS NULL THEN
        -- Insert new lesson
        INSERT INTO course_lessons (module_id, title, slug, description, video_url, video_type, sort_order, is_published)
        VALUES (
          module_id_var,
          cv_rec.title,
          lesson_slug,
          cv_rec.title,
          COALESCE(cv_rec.youtube_id, cv_rec.loom_id),
          CASE 
            WHEN cv_rec.youtube_id IS NOT NULL THEN 'youtube'
            WHEN cv_rec.loom_id IS NOT NULL THEN 'loom'
            ELSE NULL
          END,
          cv_rec.display_order,
          true
        );
      ELSE
        -- Update existing lesson
        UPDATE course_lessons
        SET 
          title = cv_rec.title,
          description = cv_rec.title,
          video_url = COALESCE(cv_rec.youtube_id, cv_rec.loom_id),
          video_type = CASE 
            WHEN cv_rec.youtube_id IS NOT NULL THEN 'youtube'
            WHEN cv_rec.loom_id IS NOT NULL THEN 'loom'
            ELSE NULL
          END,
          sort_order = cv_rec.display_order
        WHERE id = existing_lesson_id;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Mindset course ID: %', mindset_course_id;
  RAISE NOTICE 'DreamJob course ID: %', dreamjob_course_id;
END $$;

-- ============================================
-- STEP 6: UPDATE CHECKPOINTS
-- ============================================
-- Update section-level checkpoints to reference new modules
-- Update video-level checkpoints to reference new lessons

DO $$
DECLARE
  old_section_id UUID;
  new_module_id UUID;
  old_video_id UUID;
  new_lesson_id UUID;
BEGIN
  -- Update section-level checkpoints (video_id IS NULL)
  FOR old_section_id, new_module_id IN
    SELECT DISTINCT
      cs.id as old_section_id,
      cm.id as new_module_id
    FROM checkpoints cp
    JOIN course_sections cs ON cp.section_id = cs.id
    JOIN course_categories cc ON cs.category_id = cc.id
    JOIN courses c ON c.slug = CASE 
      WHEN cc.course_type = 'mindset' THEN 'mindset'
      WHEN cc.course_type = 'dreamjob' THEN 'dream-job'
    END
    JOIN course_modules cm ON cm.course_id = c.id
      AND (
        (cc.course_type = 'mindset' AND cm.slug = generate_slug(cc.title))
        OR (cc.course_type = 'dreamjob' AND cm.slug = generate_slug(cs.title || '-' || cs.section_id::text))
      )
    WHERE cp.video_id IS NULL
      AND (cc.course_type = 'mindset' OR cc.course_type = 'dreamjob')
  LOOP
    -- Note: We can't directly update checkpoints.section_id because it references course_sections
    -- Instead, we'll create a mapping table or update the checkpoints to use course_modules
    -- For now, we'll leave checkpoints pointing to old sections
    -- This will be handled in the unlock system rewrite
    RAISE NOTICE 'Checkpoint mapping: old_section % → new_module %', old_section_id, new_module_id;
  END LOOP;

  -- Update video-level checkpoints (video_id IS NOT NULL)
  FOR old_video_id, new_lesson_id IN
    SELECT DISTINCT
      cv.id as old_video_id,
      cl.id as new_lesson_id
    FROM checkpoints cp
    JOIN course_videos cv ON cp.video_id = cv.id
    JOIN course_sections cs ON cv.section_id = cs.id
    JOIN course_categories cc ON cs.category_id = cc.id
    JOIN courses c ON c.slug = CASE 
      WHEN cc.course_type = 'mindset' THEN 'mindset'
      WHEN cc.course_type = 'dreamjob' THEN 'dream-job'
    END
    JOIN course_modules cm ON cm.course_id = c.id
      AND (
        (cc.course_type = 'mindset' AND cm.slug = generate_slug(cc.title))
        OR (cc.course_type = 'dreamjob' AND cm.slug = generate_slug(cs.title || '-' || cs.section_id::text))
      )
    JOIN course_lessons cl ON cl.module_id = cm.id
      AND cl.slug = generate_slug(cv.title || '-' || cv.video_id)
    WHERE cp.video_id IS NOT NULL
      AND (cc.course_type = 'mindset' OR cc.course_type = 'dreamjob')
  LOOP
    -- Note: Similar to above, checkpoint.video_id references course_videos
    -- This will be handled in the unlock system rewrite
    RAISE NOTICE 'Video checkpoint mapping: old_video % → new_lesson %', old_video_id, new_lesson_id;
  END LOOP;

  RAISE NOTICE 'Checkpoint mapping analysis completed';
END $$;

-- ============================================
-- STEP 7: MIGRATE USER PROGRESS (OPTIONAL)
-- ============================================
-- For users with approved section checkpoints, mark all lessons in that module as completed

DO $$
DECLARE
  progress_rec RECORD;
  existing_progress_id UUID;
BEGIN
  FOR progress_rec IN
    SELECT DISTINCT ON (uc.user_id, cl.id)
      uc.user_id,
      cl.id as lesson_id,
      uc.reviewed_at as completed_at
    FROM user_checkpoints uc
    JOIN checkpoints cp ON uc.checkpoint_id = cp.id
    JOIN course_sections cs ON cp.section_id = cs.id
    JOIN course_categories cc ON cs.category_id = cc.id
    JOIN courses c ON c.slug = CASE 
      WHEN cc.course_type = 'mindset' THEN 'mindset'
      WHEN cc.course_type = 'dreamjob' THEN 'dream-job'
    END
    JOIN course_modules cm ON cm.course_id = c.id
      AND (
        (cc.course_type = 'mindset' AND cm.slug = generate_slug(cc.title))
        OR (cc.course_type = 'dreamjob' AND cm.slug = generate_slug(cs.title || '-' || cs.section_id::text))
      )
    JOIN course_lessons cl ON cl.module_id = cm.id
    WHERE uc.status = 'approved'
      AND cp.video_id IS NULL -- Only section-level checkpoints
      AND (cc.course_type = 'mindset' OR cc.course_type = 'dreamjob')
    ORDER BY uc.user_id, cl.id, uc.reviewed_at DESC
  LOOP
    -- Check if progress already exists
    SELECT id INTO existing_progress_id
    FROM user_lesson_progress
    WHERE user_id = progress_rec.user_id AND lesson_id = progress_rec.lesson_id
    LIMIT 1;
    
    IF existing_progress_id IS NULL THEN
      -- Insert new progress
      INSERT INTO user_lesson_progress (user_id, lesson_id, completed, completed_at)
      VALUES (
        progress_rec.user_id,
        progress_rec.lesson_id,
        true,
        progress_rec.completed_at
      );
    ELSE
      -- Update existing progress (use latest completed_at)
      UPDATE user_lesson_progress
      SET 
        completed = true,
        completed_at = GREATEST(user_lesson_progress.completed_at, progress_rec.completed_at)
      WHERE id = existing_progress_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'User progress migration completed';
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Count migrated courses
SELECT 'Courses migrated:' as info, COUNT(*) as count FROM courses WHERE slug IN ('mindset', 'dream-job');

-- Count migrated modules
SELECT 'Modules migrated:' as info, COUNT(*) as count 
FROM course_modules cm
JOIN courses c ON cm.course_id = c.id
WHERE c.slug IN ('mindset', 'dream-job');

-- Count migrated lessons
SELECT 'Lessons migrated:' as info, COUNT(*) as count
FROM course_lessons cl
JOIN course_modules cm ON cl.module_id = cm.id
JOIN courses c ON cm.course_id = c.id
WHERE c.slug IN ('mindset', 'dream-job');

-- Show sample migrated data
SELECT 
  c.slug as course_slug,
  cm.title as module_title,
  cm.sort_order as module_order,
  cl.title as lesson_title,
  cl.video_url,
  cl.video_type,
  cl.sort_order as lesson_order
FROM courses c
JOIN course_modules cm ON cm.course_id = c.id
JOIN course_lessons cl ON cl.module_id = cm.id
WHERE c.slug IN ('mindset', 'dream-job')
ORDER BY c.sort_order, cm.sort_order, cl.sort_order
LIMIT 20;

-- ============================================
-- NOTES
-- ============================================
-- 1. Old tables (course_categories, course_sections, course_videos) are NOT deleted
-- 2. Checkpoints still reference old tables - will be updated in unlock system rewrite
-- 3. User progress is migrated for users with approved section checkpoints
-- 4. This script is idempotent - safe to run multiple times
-- 5. Migration date: Run this script and note the date for reference

