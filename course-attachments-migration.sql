-- Course Attachments Migration
-- Allows attaching documents/files to course content (videos, sections, categories)

CREATE TABLE IF NOT EXISTS course_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_type VARCHAR(50) NOT NULL, -- 'mindset', 'dreamjob', 'affiliate'
  attachment_type VARCHAR(50) NOT NULL, -- 'video', 'section', 'category'
  parent_id UUID NOT NULL, -- ID of video/section/category this is attached to
  parent_type VARCHAR(50) NOT NULL, -- 'video_id', 'section_id', 'category_id'
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_url TEXT NOT NULL, -- Public URL
  file_size INTEGER NOT NULL, -- Size in bytes
  file_type VARCHAR(100) NOT NULL, -- MIME type (e.g., 'application/pdf', 'image/png')
  display_name VARCHAR(255), -- Optional custom display name
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_course_attachments_parent ON course_attachments(parent_id, parent_type);
CREATE INDEX idx_course_attachments_course_type ON course_attachments(course_type);
CREATE INDEX idx_course_attachments_type ON course_attachments(attachment_type);



