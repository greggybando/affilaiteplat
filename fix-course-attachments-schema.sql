-- Fix course_attachments table to match actual API usage
-- The API uses course_lessons (not course_lessons_new)

-- Drop the table if it exists with wrong schema
DROP TABLE IF EXISTS course_attachments CASCADE;

-- Create course_attachments table with correct foreign key
CREATE TABLE IF NOT EXISTS course_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- MIME type like 'application/pdf', 'image/png'
  file_size INTEGER, -- bytes
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_course_attachments_lesson ON course_attachments(lesson_id);

-- Grant permissions (adjust as needed for your RLS policies)
-- ALTER TABLE course_attachments ENABLE ROW LEVEL SECURITY;

