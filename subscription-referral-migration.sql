-- Subscription Referral System Migration
-- Allows affiliates to refer platform subscriptions and earn 50% recurring commission

-- Subscription referrals table
CREATE TABLE IF NOT EXISTS subscription_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL,
  subscription_id VARCHAR(255), -- Stripe subscription ID
  commission_percent DECIMAL(5,2) DEFAULT 50.00, -- 50% commission
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  first_commission_paid_at TIMESTAMP WITH TIME ZONE,
  last_commission_paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id) -- Each user can only be referred once
);

-- Recurring commission payments table
CREATE TABLE IF NOT EXISTS subscription_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES subscription_referrals(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  subscription_id VARCHAR(255) NOT NULL,
  amount_cents INTEGER NOT NULL, -- Commission amount in cents
  subscription_amount_cents INTEGER NOT NULL, -- Full subscription amount
  commission_percent DECIMAL(5,2) NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscription_id, period_start) -- One commission per subscription period
);

-- Referral codes table (for generating unique codes)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(affiliate_id, code)
);

-- Indexes for performance
CREATE INDEX idx_subscription_referrals_referrer ON subscription_referrals(referrer_id);
CREATE INDEX idx_subscription_referrals_referred ON subscription_referrals(referred_id);
CREATE INDEX idx_subscription_referrals_code ON subscription_referrals(referral_code);
CREATE INDEX idx_subscription_referrals_status ON subscription_referrals(status);
CREATE INDEX idx_subscription_commissions_referrer ON subscription_commissions(referrer_id);
CREATE INDEX idx_subscription_commissions_referral ON subscription_commissions(referral_id);
CREATE INDEX idx_subscription_commissions_status ON subscription_commissions(status);
CREATE INDEX idx_referral_codes_affiliate ON referral_codes(affiliate_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);


