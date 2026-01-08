CREATE TABLE IF NOT EXISTS worksheet_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  worksheet_id VARCHAR(100) NOT NULL,
  responses JSONB NOT NULL,
  ai_feedback TEXT,
  ai_score INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_unlocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  unlock_key VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unlocked_by VARCHAR(100),
  UNIQUE(user_id, unlock_key)
);

CREATE INDEX idx_worksheet_user ON worksheet_submissions(user_id);
CREATE INDEX idx_worksheet_status ON worksheet_submissions(status);
CREATE INDEX idx_unlocks_user ON user_unlocks(user_id);




