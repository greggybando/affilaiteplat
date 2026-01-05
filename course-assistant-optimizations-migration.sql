-- Course Assistant Optimizations Migration
-- ==========================================
-- This migration adds caching and rate limiting for the course assistant

-- 1. Create assistant_cache table for caching common questions
CREATE TABLE IF NOT EXISTS assistant_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Index for fast lookups by hash
  CONSTRAINT assistant_cache_question_hash_key UNIQUE (question_hash)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assistant_cache_question_hash ON assistant_cache(question_hash);
CREATE INDEX IF NOT EXISTS idx_assistant_cache_created_at ON assistant_cache(created_at);

-- 2. Create assistant_usage table for rate limiting
CREATE TABLE IF NOT EXISTS assistant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  question_count INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- One record per user per day
  UNIQUE(user_id, date)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assistant_usage_user_date ON assistant_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_assistant_usage_date ON assistant_usage(date);

-- 3. Function to clean up old cache entries (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_assistant_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM assistant_cache
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- 4. Optional: Create a scheduled job to clean up old cache (if pg_cron is enabled)
-- Uncomment if you want automatic cleanup:
-- SELECT cron.schedule('cleanup-assistant-cache', '0 2 * * *', 'SELECT cleanup_old_assistant_cache()');

-- 5. Add comment to tables
COMMENT ON TABLE assistant_cache IS 'Caches common questions and responses for the course assistant (24 hour TTL)';
COMMENT ON TABLE assistant_usage IS 'Tracks daily question usage per user for rate limiting (10 questions/day limit)';




