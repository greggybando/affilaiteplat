-- COMPLETE FIX: Remove all RLS policies and disable RLS on trips table
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies (catch all possible names)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'trips'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trips', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Step 2: Disable RLS
ALTER TABLE IF EXISTS trips DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT 
  'trips' as table_name,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '❌ RLS IS STILL ENABLED - PROBLEM!'
    ELSE '✅ RLS IS DISABLED - GOOD!'
  END as status
FROM pg_tables 
WHERE tablename = 'trips';

-- Step 4: Verify no policies exist
SELECT 
  COUNT(*) as remaining_policies,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO POLICIES - GOOD!'
    ELSE '❌ POLICIES STILL EXIST - PROBLEM!'
  END as status
FROM pg_policies 
WHERE tablename = 'trips';

