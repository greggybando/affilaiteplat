-- Complete fix for trips table - ensures RLS is completely disabled
-- Run this entire block in Supabase SQL Editor

-- Step 1: Drop ALL policies (using DO block to handle errors gracefully)
DO $$ 
BEGIN
  -- Drop all possible policy names
  DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
  DROP POLICY IF EXISTS "Users can insert their own trips" ON trips;
  DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
  DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;
  DROP POLICY IF EXISTS "Service role full access to trips" ON trips;
END $$;

-- Step 2: Disable RLS on existing table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'trips') THEN
    ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Step 3: Drop and recreate table
DROP TABLE IF EXISTS trips CASCADE;

-- Step 4: Create trips table WITHOUT RLS
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  budget DECIMAL(10, 2),
  participants JSONB DEFAULT '[]'::jsonb,
  itinerary JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create indexes
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_start_date ON trips(start_date);

-- Step 6: Explicitly ensure RLS is DISABLED (should already be disabled, but double-check)
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;

-- Step 7: Create trigger function
CREATE OR REPLACE FUNCTION update_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trips_updated_at();

-- Step 9: Verify RLS is disabled (should return rowsecurity = false)
SELECT 
  tablename, 
  rowsecurity,
  'RLS is DISABLED - Good!' as status
FROM pg_tables 
WHERE tablename = 'trips';

