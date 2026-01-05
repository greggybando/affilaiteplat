-- Video Notes Migration
-- Stores notes for video lessons that admins can edit and all users can view

CREATE TABLE IF NOT EXISTS video_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL, -- String video ID like 'v1-1', 'v2-3', etc.
  course_type VARCHAR(50) NOT NULL, -- 'mindset' or 'dreamjob'
  notes TEXT,
  created_by UUID REFERENCES affiliates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, course_type)
);

-- Index for efficient lookup
CREATE INDEX idx_video_notes_lookup ON video_notes(video_id, course_type);

