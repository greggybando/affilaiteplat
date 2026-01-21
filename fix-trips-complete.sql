-- COMPLETE FIX: Disable RLS on trips table
-- This fixes "jwt failed verification" error caused by RLS policies using auth.uid()

-- Step 1: Drop ALL policies
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'trips' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trips CASCADE', pol.policyname);
  END LOOP;
END $$;

-- Step 2: Disable RLS
ALTER TABLE IF EXISTS trips DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify (should show rowsecurity = false)
SELECT 
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '❌ STILL ENABLED' ELSE '✅ DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'trips';

-- Step 4: Verify no policies (should return 0)
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'trips';

