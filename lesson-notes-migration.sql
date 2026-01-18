-- Lesson Notes Migration
-- Stores course-wide notes for lessons that admins can edit and all users can view
-- Similar to video_notes but for the new course system (course_lessons)

CREATE TABLE IF NOT EXISTS lesson_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  notes TEXT,
  created_by UUID REFERENCES affiliates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id)
);

-- Index for efficient lookup
CREATE INDEX idx_lesson_notes_lesson ON lesson_notes(lesson_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_lesson_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lesson_notes_updated_at
  BEFORE UPDATE ON lesson_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_notes_updated_at();

