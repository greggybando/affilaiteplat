-- LifeDesign Platform Migration
-- Add platform-level fields to affiliates table

ALTER TABLE affiliates
ADD COLUMN IF NOT EXISTS access_level VARCHAR(20) DEFAULT 'all' CHECK (access_level IN ('all', 'mindset_only', 'dreamjob_only', 'affiliate_only')),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Update existing users to have onboarding_completed = true if they have an avatar_name
-- (they've already completed the old onboarding flow)
UPDATE affiliates
SET onboarding_completed = true
WHERE avatar_name IS NOT NULL AND avatar_name != '';





