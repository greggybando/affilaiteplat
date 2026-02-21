-- Add 'pending_payment' status to affiliates table
-- This allows accounts to be created before payment is completed

ALTER TABLE affiliates 
DROP CONSTRAINT IF EXISTS affiliates_status_check;

ALTER TABLE affiliates 
ADD CONSTRAINT affiliates_status_check 
CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'pending_payment'));

