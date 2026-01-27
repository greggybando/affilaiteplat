-- Mentor System Database Tables
-- Run this migration to create all mentor system tables

-- Mentor profiles
CREATE TABLE IF NOT EXISTS mentors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES affiliates(id) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  availability TEXT DEFAULT 'offline' CHECK (availability IN ('online', 'away', 'offline')),
  specialty_course_ids UUID[] DEFAULT '{}',
  current_day_points INTEGER DEFAULT 0,
  current_week_points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  daily_wins INTEGER DEFAULT 0,
  weekly_wins INTEGER DEFAULT 0,
  raffle_entries INTEGER DEFAULT 0,
  last_daily_win DATE,
  last_weekly_win DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Help sessions
CREATE TABLE IF NOT EXISTS help_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID REFERENCES mentors(id) NOT NULL,
  mentee_id UUID REFERENCES affiliates(id) NOT NULL,
  dm_thread_id UUID,
  dm_received_at TIMESTAMP NOT NULL,
  first_response_at TIMESTAMP,
  response_time_seconds INTEGER,
  rating TEXT CHECK (rating IN ('not_helpful', 'helpful', 'amazing')),
  rated_at TIMESTAMP,
  day_date DATE NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Raffle entries
CREATE TABLE IF NOT EXISTS mentor_raffle_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID REFERENCES mentors(id) NOT NULL,
  earned_at DATE NOT NULL,
  month_year TEXT NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Weekly results archive
CREATE TABLE IF NOT EXISTS mentor_weekly_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID REFERENCES mentors(id) NOT NULL,
  week_start DATE NOT NULL,
  total_points INTEGER DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mentor_id, week_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentors_availability ON mentors(availability) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentors_lifetime_points ON mentors(lifetime_points DESC);
CREATE INDEX IF NOT EXISTS idx_help_sessions_day ON help_sessions(day_date, mentor_id);
CREATE INDEX IF NOT EXISTS idx_help_sessions_week ON help_sessions(week_start, mentor_id);
CREATE INDEX IF NOT EXISTS idx_help_sessions_mentor ON help_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_help_sessions_unrated ON help_sessions(mentee_id) WHERE rating IS NULL;
CREATE INDEX IF NOT EXISTS idx_raffle_entries_month ON mentor_raffle_entries(month_year, used);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_mentor ON mentor_raffle_entries(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_weekly_results_week ON mentor_weekly_results(week_start);
CREATE INDEX IF NOT EXISTS idx_mentor_weekly_results_rank ON mentor_weekly_results(week_start, rank);

-- Comments for documentation
COMMENT ON TABLE mentors IS 'Mentor profiles with daily/weekly/lifetime point tracking';
COMMENT ON TABLE help_sessions IS 'Tracks each help interaction between mentor and mentee';
COMMENT ON TABLE mentor_raffle_entries IS 'Raffle entries earned by winning daily competitions';
COMMENT ON TABLE mentor_weekly_results IS 'Archived weekly competition results for mentors';

