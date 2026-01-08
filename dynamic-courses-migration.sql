-- ============================================
-- DYNAMIC COURSES SYSTEM
-- ============================================

-- Add admin flag to affiliates
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Courses (the 3 worlds)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modules within courses
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- Lessons within modules
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content TEXT,
  duration_minutes INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  is_free_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, slug)
);

-- Attachments for lessons
CREATE TABLE IF NOT EXISTS course_attachments_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  video_position_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_modules_course ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON course_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_lesson_progress(user_id);

-- ============================================
-- SEED THE 3 WORLDS
-- ============================================

INSERT INTO courses (slug, title, emoji, description, color, sort_order) VALUES
('mindset', 'Mindset & Foundations', '🧠', 'Rewire your brain. Kill limiting beliefs. Become unstoppable.', 'purple', 1),
('dream-job', 'Get Your Dream Job', '💼', 'Stop applying to 100 jobs. Land the ONE you actually want.', 'cyan', 2),
('side-income', 'Build Your Side Income', '💰', 'Create passive income streams through our affiliate system.', 'green', 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DREAM JOB MODULES AND LESSONS
-- ============================================

DO $$
DECLARE
  dj_id UUID;
  foundation_id UUID;
  know_thyself_id UUID;
  research_id UUID;
  trial_id UUID;
  reach_id UUID;
  interview_id UUID;
  final_id UUID;
BEGIN
  SELECT id INTO dj_id FROM courses WHERE slug = 'dream-job';
  
  IF dj_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Create modules (with conflict handling)
  INSERT INTO course_modules (course_id, title, slug, sort_order) VALUES
  (dj_id, 'Foundation', 'foundation', 1)
  ON CONFLICT (course_id, slug) DO NOTHING
  RETURNING id INTO foundation_id;
  
  SELECT id INTO foundation_id FROM course_modules WHERE course_id = dj_id AND slug = 'foundation';
  
  INSERT INTO course_modules (course_id, title, slug, sort_order) VALUES
  (dj_id, 'Know Thyself', 'know-thyself', 2)
  ON CONFLICT (course_id, slug) DO NOTHING
  RETURNING id INTO know_thyself_id;
  
  SELECT id INTO know_thyself_id FROM course_modules WHERE course_id = dj_id AND slug = 'know-thyself';
  
  INSERT INTO course_modules (course_id, title, slug, sort_order) VALUES
  (dj_id, 'Research Like Heaven', 'research-like-heaven', 3)
  ON CONFLICT (course_id, slug) DO NOTHING
  RETURNING id INTO research_id;
  
  SELECT id INTO research_id FROM course_modules WHERE course_id = dj_id AND slug = 'research-like-heaven';
  
  INSERT INTO course_modules (course_id, title, slug, sort_order) VALUES
  (dj_id, 'Trial Project', 'trial-project', 4)
  ON CONFLICT (course_id, slug) DO NOTHING
  RETURNING id INTO trial_id;
  
  SELECT id INTO trial_id FROM course_modules WHERE course_id = dj_id AND slug = 'trial-project';
  
  INSERT INTO course_modules (course_id, title, slug, sort_order) VALUES
  (dj_id, 'Reach Anyone In The World', 'reach-anyone', 5)
  ON CONFLICT (course_id, slug) DO NOTHING
  RETURNING id INTO reach_id;
  
  SELECT id INTO reach_id FROM course_modules WHERE course_id = dj_id AND slug = 'reach-anyone';
  
  INSERT INTO course_modules (course_id, title, slug, sort_order) VALUES
  (dj_id, 'Acing Every Interview', 'acing-interviews', 6)
  ON CONFLICT (course_id, slug) DO NOTHING
  RETURNING id INTO interview_id;
  
  SELECT id INTO interview_id FROM course_modules WHERE course_id = dj_id AND slug = 'acing-interviews';
  
  INSERT INTO course_modules (course_id, title, slug, sort_order) VALUES
  (dj_id, 'Final First Impression', 'final-impression', 7)
  ON CONFLICT (course_id, slug) DO NOTHING
  RETURNING id INTO final_id;
  
  SELECT id INTO final_id FROM course_modules WHERE course_id = dj_id AND slug = 'final-impression';

  -- Foundation lessons
  INSERT INTO course_lessons (module_id, title, slug, video_url, sort_order) VALUES
  (foundation_id, 'Lesson 1', 'lesson-1', 'gGJFV0kkKI4', 1),
  (foundation_id, 'Lesson 2', 'lesson-2', 'qr_HLs7iKY4', 2),
  (foundation_id, 'Lesson 3', 'lesson-3', 'CHv9kau4XAE', 3),
  (foundation_id, 'Lesson 4', 'lesson-4', 'RL2x2ccwmhw', 4),
  (foundation_id, 'Lesson 5', 'lesson-5', 'BMZ9m5Wpkbg', 5),
  (foundation_id, 'Lesson 6', 'lesson-6', 'LUQNqSVdl_I', 6),
  (foundation_id, 'Lesson 7', 'lesson-7', '-gGMhPJNIxc', 7)
  ON CONFLICT (module_id, slug) DO NOTHING;

  -- Know Thyself lessons
  INSERT INTO course_lessons (module_id, title, slug, video_url, sort_order) VALUES
  (know_thyself_id, 'Lesson 1', 'lesson-1', 'qvMj6SUKA0c', 1),
  (know_thyself_id, 'Lesson 2', 'lesson-2', '53DfCx9gSUg', 2),
  (know_thyself_id, 'Lesson 3', 'lesson-3', '-K3KsXLHARw', 3)
  ON CONFLICT (module_id, slug) DO NOTHING;

  -- Research Like Heaven lessons
  INSERT INTO course_lessons (module_id, title, slug, video_url, sort_order) VALUES
  (research_id, 'Lesson 1', 'lesson-1', 'AJf9LB2Le3Y', 1),
  (research_id, 'Lesson 2', 'lesson-2', 'ilL-E1ks8XU', 2),
  (research_id, 'Lesson 3', 'lesson-3', 'U1RAtTAwNxA', 3),
  (research_id, 'Lesson 3 Part 2', 'lesson-3b', 'QxKkCazV2NY', 4)
  ON CONFLICT (module_id, slug) DO NOTHING;

  -- Trial Project lessons
  INSERT INTO course_lessons (module_id, title, slug, video_url, sort_order) VALUES
  (trial_id, 'Lesson 1', 'lesson-1', 'z3IX2ACDXNs', 1),
  (trial_id, 'Lesson 2', 'lesson-2', 'E9sBYsPmhw8', 2),
  (trial_id, 'Lesson 3', 'lesson-3', 'jd3wQ3k7Nlk', 3),
  (trial_id, 'Lesson 4', 'lesson-4', 'xpcpLPdDU_A', 4),
  (trial_id, 'Lesson 5', 'lesson-5', 'tbWygenb3iI', 5),
  (trial_id, 'Lesson 6', 'lesson-6', 'GRVoPEB9yBI', 6)
  ON CONFLICT (module_id, slug) DO NOTHING;

  -- Reach Anyone lessons
  INSERT INTO course_lessons (module_id, title, slug, video_url, sort_order) VALUES
  (reach_id, 'Lesson 1', 'lesson-1', 'aK45c5bjEms', 1),
  (reach_id, 'Lesson 2', 'lesson-2', 'FPb7qVArelg', 2),
  (reach_id, 'Lesson 3', 'lesson-3', '1ehr1fk9sY8', 3)
  ON CONFLICT (module_id, slug) DO NOTHING;

  -- Interview lesson
  INSERT INTO course_lessons (module_id, title, slug, video_url, sort_order) VALUES
  (interview_id, 'Master Lesson', 'master', 'fyeoO8EzD6w', 1)
  ON CONFLICT (module_id, slug) DO NOTHING;

  -- Final Impression lessons
  INSERT INTO course_lessons (module_id, title, slug, video_url, sort_order) VALUES
  (final_id, 'Master Lesson', 'master', 'AkF6LvlvroY', 1),
  (final_id, 'Bonus: Final Adjustment', 'bonus', 'qXjuyco6RQw', 2)
  ON CONFLICT (module_id, slug) DO NOTHING;
END $$;

-- ============================================
-- SEED MINDSET/LIFEDESIGN MODULES
-- ============================================

DO $$
DECLARE
  ms_id UUID;
BEGIN
  SELECT id INTO ms_id FROM courses WHERE slug = 'mindset';
  
  IF ms_id IS NULL THEN
    RETURN;
  END IF;
  
  INSERT INTO course_modules (course_id, title, slug, sort_order) VALUES
  (ms_id, 'Diagnosis', 'diagnosis', 1),
  (ms_id, 'Identity Transformation', 'identity', 2),
  (ms_id, 'Confidence Building', 'confidence', 3),
  (ms_id, 'Fear Elimination', 'fear', 4),
  (ms_id, 'Goal Setting', 'goals', 5),
  (ms_id, 'Daily Systems', 'systems', 6)
  ON CONFLICT (course_id, slug) DO NOTHING;
END $$;

-- Make yourself admin (CHANGE THIS EMAIL)
-- UPDATE affiliates SET is_admin = true WHERE email = 'YOUR_EMAIL_HERE';


