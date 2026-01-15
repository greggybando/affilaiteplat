-- ============================================
-- NEW DYNAMIC COURSE SYSTEM (Replaces old hardcoded system)
-- ============================================

-- Courses Table (unlimited courses)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  thumbnail_url TEXT,
  color TEXT, -- hex color for course card
  icon TEXT, -- icon name or emoji
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course Sections (formerly modules)
CREATE TABLE IF NOT EXISTS course_sections_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- Course Lessons (the actual content)
CREATE TABLE IF NOT EXISTS course_lessons_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES course_sections_new(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  video_url TEXT, -- YouTube or Loom ID
  video_type TEXT, -- 'youtube' or 'loom'
  content TEXT, -- Rich text content
  duration_minutes INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  is_free_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id, slug)
);

-- Course Attachments (PDFs, worksheets, etc.)
CREATE TABLE IF NOT EXISTS course_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES course_lessons_new(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'pdf', 'image', 'video', 'document'
  file_size INTEGER, -- bytes
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Progress Tracking
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID REFERENCES course_lessons_new(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  video_position_seconds INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_sections_course ON course_sections_new(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_course_lessons_section ON course_lessons_new(section_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_course_attachments_lesson ON course_attachments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson ON user_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published, sort_order);

-- ============================================
-- SEED INITIAL COURSES (Migrate from old system)
-- ============================================

-- Insert the 3 existing courses
INSERT INTO courses (slug, title, emoji, description, color, sort_order, is_published) VALUES
('mindset', 'Mindset & Foundations', '🧠', 'Rewire your brain. Kill limiting beliefs. Become unstoppable.', '#8B5CF6', 0, true),
('dream-job', 'Get Your Dream Job', '💼', 'Stop applying to 100 jobs. Land the ONE you actually want.', '#06B6D4', 1, true),
('side-income', 'Build Your Side Income', '💰', 'Create passive income streams through our affiliate system.', '#10B981', 2, true)
ON CONFLICT (slug) DO NOTHING;

-- You can add more courses here as you expand
-- INSERT INTO courses (slug, title, emoji, description, color, sort_order) VALUES
-- ('productivity', 'Master Productivity', '⚡', 'Get 10x more done in less time', '#F59E0B', 3);

