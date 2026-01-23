-- ============================================
-- CHECKPOINT SYSTEM - DEFAULT BEHAVIOR UPDATE
-- ============================================
-- Updates unlock system to use sequential default behavior
-- Adds admin override options for lessons and courses
-- Creates tables for user-specific unlocks (UI to be built later)

-- ============================================
-- STEP 1: ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add globally_unlocked to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS globally_unlocked BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN courses.globally_unlocked IS 'When true, all sections in this course are accessible without checkpoint completion';

-- Add always_unlocked to course_lessons table
ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS always_unlocked BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN course_lessons.always_unlocked IS 'When true, this lesson is accessible even when its section is locked';

-- ============================================
-- STEP 2: CREATE USER-SPECIFIC UNLOCK TABLES
-- ============================================

-- Table for course-level user unlocks
CREATE TABLE IF NOT EXISTS user_course_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_by UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Add comment
COMMENT ON TABLE user_course_unlocks IS 'Admin can grant full course access to specific users';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_course_unlocks_user_id ON user_course_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_unlocks_course_id ON user_course_unlocks(course_id);

-- Table for module/section-level user unlocks
CREATE TABLE IF NOT EXISTS user_module_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_by UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Add comment
COMMENT ON TABLE user_module_unlocks IS 'Admin can grant access to specific sections/modules for specific users';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_module_unlocks_user_id ON user_module_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_unlocks_module_id ON user_module_unlocks(module_id);

-- ============================================
-- STEP 3: VERIFICATION QUERIES
-- ============================================

-- Verify columns were added
SELECT 
  'COURSES TABLE COLUMNS' as check_type,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'courses'
  AND column_name IN ('globally_unlocked')
ORDER BY column_name;

SELECT 
  'COURSE_LESSONS TABLE COLUMNS' as check_type,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'course_lessons'
  AND column_name IN ('always_unlocked')
ORDER BY column_name;

-- Verify tables were created
SELECT 
  'NEW TABLES CREATED' as check_type,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('user_course_unlocks', 'user_module_unlocks')
ORDER BY table_name;

-- ============================================
-- STEP 4: SET DEFAULT VALUES (OPTIONAL)
-- ============================================

-- Ensure all existing courses have globally_unlocked = false
UPDATE courses 
SET globally_unlocked = FALSE 
WHERE globally_unlocked IS NULL;

-- Ensure all existing lessons have always_unlocked = false
UPDATE course_lessons 
SET always_unlocked = FALSE 
WHERE always_unlocked IS NULL;

-- ============================================
-- NOTES
-- ============================================
-- 1. This migration adds the database structure for the new unlock system
-- 2. The unlock logic will be updated in /api/courses/[courseId]/unlock-status
-- 3. Admin UI toggles will be added to the course editor
-- 4. User-specific unlock UI will be built later (tables are ready)

