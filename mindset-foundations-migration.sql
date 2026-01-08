-- MINDSET & FOUNDATIONS - Progress Tracking & Worksheet System

CREATE TABLE IF NOT EXISTS user_module_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL DEFAULT 'mindset',
  module_id INTEGER NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, section, module_id)
);

CREATE TABLE IF NOT EXISTS worksheet_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL DEFAULT 'mindset',
  module_id INTEGER NOT NULL,
  worksheet_id VARCHAR(100) NOT NULL,
  responses JSONB NOT NULL,
  ai_feedback TEXT,
  ai_score INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  admin_override BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, section, module_id, worksheet_id, submitted_at)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_submissions_user ON worksheet_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_submissions_status ON worksheet_submissions(status);

INSERT INTO user_module_progress (user_id, section, module_id)
SELECT id, 'mindset', 1 FROM affiliates
WHERE onboarding_completed = true
ON CONFLICT (user_id, section, module_id) DO NOTHING;





