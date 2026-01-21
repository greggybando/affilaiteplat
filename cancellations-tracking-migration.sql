-- ============================================
-- CANCELLATIONS TRACKING MIGRATION
-- ============================================

-- Create cancellations table to track user cancellations
CREATE TABLE IF NOT EXISTS cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  canceled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscription_start_date TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cancellations_affiliate ON cancellations(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_canceled_at ON cancellations(canceled_at);
CREATE INDEX IF NOT EXISTS idx_cancellations_email ON cancellations(email);

-- Ensure subscription_start_date exists on affiliates (it already does, but this is safe)
-- ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;

