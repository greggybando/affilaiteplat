-- ============================================
-- AFFILIATE PLATFORM DATABASE SCHEMA
-- ============================================

-- AFFILIATES (your paying subscribers)
-- They sign up, get 7-day trial, then pay $40/mo
CREATE TABLE affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Payout info (they choose one)
    payout_method VARCHAR(20) CHECK (payout_method IN ('paypal', 'stripe')),
    paypal_email VARCHAR(255),
    stripe_account_id VARCHAR(255),
    
    -- Subscription status
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
    trial_started_at TIMESTAMPTZ DEFAULT NOW(),
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_started_at TIMESTAMPTZ,
    
    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS (your offerings - ADHD course, future products)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    commission_percent DECIMAL(5,2) NOT NULL, -- e.g., 30.00 for 30%
    commission_fixed_cents INTEGER DEFAULT 0, -- optional flat rate instead
    
    -- Stripe integration
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    
    -- Webhook for tracking conversions
    webhook_secret VARCHAR(255),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LANDING PAGES (Claude-generated, pushed by you)
CREATE TABLE landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL, -- internal name for you
    slug VARCHAR(100) NOT NULL, -- URL path
    
    -- The actual page content (HTML/React component)
    page_type VARCHAR(20) DEFAULT 'html' CHECK (page_type IN ('html', 'react')),
    content TEXT NOT NULL, -- the Claude-generated page
    
    -- Metadata
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- For A/B testing
    variant_name VARCHAR(50), -- e.g., "control", "urgency", "social-proof"
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_id, slug)
);

-- AFFILIATE LINKS (unique tracking links per affiliate per page)
CREATE TABLE affiliate_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
    landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
    
    -- The unique tracking code (short, URL-safe)
    tracking_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Optional custom slug they can set
    custom_slug VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(affiliate_id, landing_page_id)
);

-- CLICKS (every click on an affiliate link)
CREATE TABLE clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE CASCADE,
    
    -- Tracking data
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    
    -- For attribution
    visitor_id VARCHAR(100), -- cookie-based identifier
    
    clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast click counting
CREATE INDEX idx_clicks_affiliate_link ON clicks(affiliate_link_id);
CREATE INDEX idx_clicks_clicked_at ON clicks(clicked_at);

-- CONVERSIONS (successful sales attributed to affiliates)
CREATE TABLE conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
    affiliate_link_id UUID REFERENCES affiliate_links(id),
    product_id UUID REFERENCES products(id),
    
    -- Order details from Stripe webhook
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_customer_email VARCHAR(255),
    order_amount_cents INTEGER NOT NULL,
    
    -- Commission calculation
    commission_cents INTEGER NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',    -- just converted, awaiting refund window
        'approved',   -- past refund window, ready to pay
        'locked',     -- affiliate on expired trial, frozen until they subscribe
        'paid',       -- paid out
        'refunded'    -- customer refunded, commission clawed back
    )),
    
    -- Attribution data
    visitor_id VARCHAR(100),
    attributed_click_id UUID REFERENCES clicks(id),
    
    converted_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

CREATE INDEX idx_conversions_affiliate ON conversions(affiliate_id);
CREATE INDEX idx_conversions_status ON conversions(status);

-- PAYOUTS (batch payments to affiliates)
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
    
    amount_cents INTEGER NOT NULL,
    
    -- Payment method used
    payout_method VARCHAR(20) NOT NULL,
    
    -- External payment IDs
    stripe_transfer_id VARCHAR(255),
    paypal_batch_id VARCHAR(255),
    paypal_payout_item_id VARCHAR(255),
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Which conversions were included
    conversion_ids UUID[] NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    notes TEXT
);

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- Affiliate dashboard stats
CREATE VIEW affiliate_stats AS
SELECT 
    a.id as affiliate_id,
    a.email,
    a.name,
    a.status as subscription_status,
    a.trial_ends_at,
    COUNT(DISTINCT al.id) as total_links,
    COUNT(DISTINCT c.id) as total_clicks,
    COUNT(DISTINCT conv.id) as total_conversions,
    COALESCE(SUM(CASE WHEN conv.status = 'pending' THEN conv.commission_cents ELSE 0 END), 0) as pending_cents,
    COALESCE(SUM(CASE WHEN conv.status = 'approved' THEN conv.commission_cents ELSE 0 END), 0) as approved_cents,
    COALESCE(SUM(CASE WHEN conv.status = 'locked' THEN conv.commission_cents ELSE 0 END), 0) as locked_cents,
    COALESCE(SUM(CASE WHEN conv.status = 'paid' THEN conv.commission_cents ELSE 0 END), 0) as paid_cents
FROM affiliates a
LEFT JOIN affiliate_links al ON a.id = al.affiliate_id
LEFT JOIN clicks c ON al.id = c.affiliate_link_id
LEFT JOIN conversions conv ON a.id = conv.affiliate_id
GROUP BY a.id, a.email, a.name, a.status, a.trial_ends_at;

-- Admin overview
CREATE VIEW admin_overview AS
SELECT
    (SELECT COUNT(*) FROM affiliates WHERE status = 'trial') as trial_affiliates,
    (SELECT COUNT(*) FROM affiliates WHERE status = 'active') as paying_affiliates,
    (SELECT COUNT(*) FROM affiliates WHERE status = 'expired') as expired_affiliates,
    (SELECT COUNT(*) FROM clicks WHERE clicked_at > NOW() - INTERVAL '30 days') as clicks_30d,
    (SELECT COUNT(*) FROM conversions WHERE converted_at > NOW() - INTERVAL '30 days') as conversions_30d,
    (SELECT COALESCE(SUM(commission_cents), 0) FROM conversions WHERE status = 'approved') as pending_payouts_cents,
    (SELECT COALESCE(SUM(commission_cents), 0) FROM conversions WHERE status = 'paid' AND paid_at > NOW() - INTERVAL '30 days') as paid_30d_cents;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check and update trial expirations
-- Run this on a cron job daily
CREATE OR REPLACE FUNCTION expire_trials() RETURNS void AS $$
BEGIN
    -- Mark expired trials
    UPDATE affiliates 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'trial' AND trial_ends_at < NOW();
    
    -- Lock their pending/approved commissions
    UPDATE conversions 
    SET status = 'locked'
    WHERE affiliate_id IN (SELECT id FROM affiliates WHERE status = 'expired')
    AND status IN ('pending', 'approved');
END;
$$ LANGUAGE plpgsql;

-- Function to unlock commissions when affiliate subscribes
CREATE OR REPLACE FUNCTION unlock_commissions(p_affiliate_id UUID) RETURNS void AS $$
BEGIN
    UPDATE conversions 
    SET status = 'approved'
    WHERE affiliate_id = p_affiliate_id AND status = 'locked';
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique tracking code
CREATE OR REPLACE FUNCTION generate_tracking_code() RETURNS VARCHAR(20) AS $$
DECLARE
    chars VARCHAR(62) := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(8) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * 62 + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
