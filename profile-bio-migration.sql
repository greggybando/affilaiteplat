-- ============================================
-- PROFILE BIO MIGRATION
-- ============================================

-- Add bio/tagline field to affiliates table
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add last_active_at field for tracking user activity
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for last_active_at for performance
CREATE INDEX IF NOT EXISTS idx_affiliates_last_active ON affiliates(last_active_at DESC);

