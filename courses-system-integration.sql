-- ============================================
-- DYNAMIC COURSES SYSTEM - UPDATED MIGRATION
-- Uses existing courses/course_modules/course_lessons tables
-- ============================================

-- Ensure courses table exists with all needed columns
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS icon TEXT;

-- Ensure course_modules has video_type column
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS video_type TEXT;

-- Ensure course_lessons has video_type column  
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS video_type TEXT;

-- Update course_attachments_new to work with course_lessons
-- (already references course_lessons, so we're good)

-- Ensure user_lesson_progress has notes column
ALTER TABLE user_lesson_progress ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE user_lesson_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes if not exist
CREATE INDEX IF NOT EXISTS idx_course_modules_course_order ON course_modules(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_course_lessons_module_order ON course_lessons(module_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_courses_published_order ON courses(is_published, sort_order);

-- ============================================
-- MAKE YOURSELF ADMIN
-- ============================================

-- Update affiliates table to use 'role' if using is_admin
UPDATE affiliates SET role = 'admin' WHERE email = 'grant@reelstacks.ai';

-- Ensure role column exists
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

