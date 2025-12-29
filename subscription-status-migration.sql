-- Add 'past_due' to status CHECK constraint
-- First, drop the existing constraint
ALTER TABLE affiliates DROP CONSTRAINT IF EXISTS affiliates_status_check;

-- Add the new constraint with 'past_due' included
ALTER TABLE affiliates 
ADD CONSTRAINT affiliates_status_check 
CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'past_due'));

-- Ensure subscription_id column exists (it's already stripe_subscription_id, but we'll add an alias column if needed)
-- Actually, we already have stripe_subscription_id, so we'll use that


