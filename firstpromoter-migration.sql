-- FirstPromoter Integration Migration
-- Add FirstPromoter promoter ID and referral code columns to affiliates table

ALTER TABLE affiliates
ADD COLUMN IF NOT EXISTS fp_promoter_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS fp_ref_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliates_fp_promoter_id ON affiliates(fp_promoter_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_fp_ref_id ON affiliates(fp_ref_id);

