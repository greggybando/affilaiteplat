-- Create grindhouses table WITHOUT RLS (to avoid JWT verification errors)
-- API routes use supabaseAdmin (service role) and handle authentication via getCurrentAffiliate() middleware
-- RLS would cause "jwt failed verification" errors because it tries to use auth.uid()
-- which doesn't exist in our custom auth system

CREATE TABLE IF NOT EXISTS grindhouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  max_participants INTEGER,
  participants JSONB DEFAULT '[]'::jsonb,
  goals JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_grindhouses_user_id ON grindhouses(user_id);
CREATE INDEX IF NOT EXISTS idx_grindhouses_start_date ON grindhouses(start_date);

-- IMPORTANT: Do NOT enable RLS - API routes use supabaseAdmin (service role)
-- and handle authentication via getCurrentAffiliate() middleware
-- RLS would cause "jwt failed verification" errors because it tries to use auth.uid()
-- which doesn't exist in our custom auth system
ALTER TABLE grindhouses DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_grindhouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_grindhouses_updated_at ON grindhouses;
CREATE TRIGGER update_grindhouses_updated_at
  BEFORE UPDATE ON grindhouses
  FOR EACH ROW
  EXECUTE FUNCTION update_grindhouses_updated_at();

-- Verify RLS is disabled (should show rowsecurity = false)
SELECT
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '❌ RLS ENABLED' ELSE '✅ RLS DISABLED' END as status
FROM pg_tables
WHERE tablename = 'grindhouses';

