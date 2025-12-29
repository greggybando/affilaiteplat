-- Add avatar fields to affiliates table
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS avatar_name VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);

-- Create pods table
CREATE TABLE IF NOT EXISTS pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_by UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pod_members table
CREATE TABLE IF NOT EXISTS pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(pod_id, affiliate_id)
);

-- Create watch_lists table
CREATE TABLE IF NOT EXISTS watch_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  watched_affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(affiliate_id, watched_affiliate_id),
  CHECK (affiliate_id != watched_affiliate_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pod_members_affiliate ON pod_members(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_pod ON pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_status ON pod_members(status);
CREATE INDEX IF NOT EXISTS idx_watch_lists_affiliate ON watch_lists(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_watch_lists_watched ON watch_lists(watched_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_avatar_name ON affiliates(avatar_name);

-- Add commission boost and protection fields to affiliates
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS commission_boost_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_boost_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS steal_protection_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pod_joined_at TIMESTAMPTZ;

-- Add contract expiration to pod_members
ALTER TABLE pod_members
ADD COLUMN IF NOT EXISTS contract_expires_at TIMESTAMPTZ;

-- Create pod_battles table
CREATE TABLE IF NOT EXISTS pod_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  defender_pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'active', 'completed')),
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 14, 30, 60)),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  winner_pod_id UUID REFERENCES pods(id) ON DELETE SET NULL,
  prize_type VARCHAR(20) NOT NULL CHECK (prize_type IN ('bragging_rights', 'commission_boost', 'member_steal')),
  win_margin_percent DECIMAL(5,2),
  trash_talk_message TEXT,
  is_rematch BOOLEAN DEFAULT FALSE,
  original_battle_id UUID REFERENCES pod_battles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pod_battle_stats table
CREATE TABLE IF NOT EXISTS pod_battle_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES pod_battles(id) ON DELETE CASCADE,
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  sales_per_member DECIMAL(10,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(battle_id, pod_id)
);

-- Create bounties table
CREATE TABLE IF NOT EXISTS bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reward_amount_cents INTEGER NOT NULL DEFAULT 0,
  reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('cash', 'commission_boost')),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired')),
  claimed_by_pod_id UUID REFERENCES pods(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create affiliate_titles table
CREATE TABLE IF NOT EXISTS affiliate_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  title_slug VARCHAR(50) NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_permanent BOOLEAN DEFAULT FALSE,
  UNIQUE(affiliate_id, title_slug)
);

-- Create indexes for pod battles
CREATE INDEX IF NOT EXISTS idx_pod_battles_challenger ON pod_battles(challenger_pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_battles_defender ON pod_battles(defender_pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_battles_status ON pod_battles(status);
CREATE INDEX IF NOT EXISTS idx_pod_battles_product ON pod_battles(product_id);
CREATE INDEX IF NOT EXISTS idx_pod_battle_stats_battle ON pod_battle_stats(battle_id);
CREATE INDEX IF NOT EXISTS idx_pod_battle_stats_pod ON pod_battle_stats(pod_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_boost_expires ON affiliates(commission_boost_expires_at);
CREATE INDEX IF NOT EXISTS idx_bounties_target ON bounties(target_pod_id);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_titles_affiliate ON affiliate_titles(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_pod_battles_rematch ON pod_battles(original_battle_id);

