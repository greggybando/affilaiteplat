-- Course Management System Migration
-- Stores course structure, modules, sections, and videos

CREATE TABLE IF NOT EXISTS course_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_type VARCHAR(50) NOT NULL, -- 'mindset', 'dreamjob', 'affiliate'
  category_id VARCHAR(100) NOT NULL, -- 'starthere', 'mindset', 'lifedesign', etc.
  title VARCHAR(255) NOT NULL,
  is_start_here BOOLEAN DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_type, category_id)
);

CREATE TABLE IF NOT EXISTS course_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category_id, section_id)
);

CREATE TABLE IF NOT EXISTS course_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  video_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  youtube_id VARCHAR(100),
  loom_id VARCHAR(100),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section_id, video_id)
);

CREATE INDEX idx_course_categories_type ON course_categories(course_type);
CREATE INDEX idx_course_categories_order ON course_categories(course_type, display_order);
CREATE INDEX idx_course_sections_category ON course_sections(category_id);
CREATE INDEX idx_course_sections_order ON course_sections(category_id, display_order);
CREATE INDEX idx_course_videos_section ON course_videos(section_id);
CREATE INDEX idx_course_videos_order ON course_videos(section_id, display_order);

