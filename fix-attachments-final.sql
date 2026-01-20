-- FINAL FIX FOR course_attachments
-- Run this in Supabase SQL Editor

-- 1. Drop the old table (backing up data first if needed)
DROP TABLE IF EXISTS course_attachments CASCADE;

-- 2. Create with correct schema matching the API
CREATE TABLE course_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index
CREATE INDEX idx_course_attachments_lesson ON course_attachments(lesson_id);

-- 4. DISABLE RLS (important - service role should bypass anyway, but just in case)
ALTER TABLE course_attachments DISABLE ROW LEVEL SECURITY;

-- 5. Verify
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'course_attachments';

