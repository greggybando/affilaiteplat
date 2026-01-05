-- Compliance, Fraud Detection, and Enhanced Tracking Migration
-- Adds webhook idempotency, fraud detection, tax forms, agreement tracking, click velocity limits, and compliance checking

-- Webhook events table for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed', 'skipped')),
  error_message TEXT,
  processing_time_ms INTEGER,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);

-- Fraud detection tables
CREATE TABLE IF NOT EXISTS fraud_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  conversion_id UUID REFERENCES conversions(id) ON DELETE SET NULL,
  flag_type VARCHAR(50) NOT NULL, -- 'self_referral', 'click_velocity', 'suspicious_conversion', etc.
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  details JSONB,
  resolution VARCHAR(50), -- 'false_positive', 'account_suspended', 'ip_blocked', etc.
  resolution_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fraud_flags_affiliate ON fraud_flags(affiliate_id);
CREATE INDEX idx_fraud_flags_status ON fraud_flags(status);
CREATE INDEX idx_fraud_flags_severity ON fraud_flags(severity);

CREATE TABLE IF NOT EXISTS fraud_blocklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('ip', 'email', 'affiliate_id')),
  block_value VARCHAR(255) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(block_type, block_value)
);

CREATE INDEX idx_fraud_blocklist_type_value ON fraud_blocklist(block_type, block_value);

-- Click velocity tracking
CREATE TABLE IF NOT EXISTS click_velocity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE CASCADE,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  click_count INTEGER DEFAULT 1,
  last_click_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ip_address, affiliate_link_id, window_start)
);

CREATE INDEX idx_click_velocity_ip_link ON click_velocity(ip_address, affiliate_link_id);
CREATE INDEX idx_click_velocity_window ON click_velocity(window_start);

-- Tax forms
CREATE TABLE IF NOT EXISTS affiliate_tax_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  form_type VARCHAR(10) NOT NULL CHECK (form_type IN ('w9', 'w8ben')),
  tax_year INTEGER NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  tax_classification VARCHAR(50),
  tax_id_type VARCHAR(20), -- 'ssn', 'ein', 'foreign'
  tax_id_last_four VARCHAR(4),
  foreign_tax_id VARCHAR(255),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL,
  certification_confirmed BOOLEAN NOT NULL,
  electronic_signature VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_valid BOOLEAN DEFAULT true,
  invalidated_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tax_forms_affiliate_year ON affiliate_tax_forms(affiliate_id, tax_year);
CREATE INDEX idx_tax_forms_valid ON affiliate_tax_forms(affiliate_id, tax_year, is_valid);

-- Annual earnings view for tax threshold checking
CREATE TABLE IF NOT EXISTS affiliate_annual_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  total_paid_cents INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(affiliate_id, tax_year)
);

CREATE INDEX idx_annual_earnings_affiliate_year ON affiliate_annual_earnings(affiliate_id, tax_year);

-- Agreement tracking
CREATE TABLE IF NOT EXISTS affiliate_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_current BOOLEAN DEFAULT false,
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agreements_current ON affiliate_agreements(is_current);

CREATE TABLE IF NOT EXISTS agreement_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  agreement_id UUID NOT NULL REFERENCES affiliate_agreements(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(affiliate_id, agreement_id)
);

CREATE INDEX idx_acceptances_affiliate ON agreement_acceptances(affiliate_id);
CREATE INDEX idx_acceptances_agreement ON agreement_acceptances(agreement_id);

-- Notification preferences and logging (if not exists)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  email_conversions BOOLEAN DEFAULT true,
  email_payouts BOOLEAN DEFAULT true,
  email_compliance BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(affiliate_id)
);

CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced'))
);

-- Add columns to existing tables
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER DEFAULT 0;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS commission_clawback_cents INTEGER DEFAULT 0;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS refund_type TEXT;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE clicks ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS os TEXT;

