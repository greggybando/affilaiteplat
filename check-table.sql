-- Run this in Supabase SQL Editor to verify the table is correct

-- Check if table exists and get its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_attachments'
ORDER BY ordinal_position;

-- Check RLS status
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'course_attachments';

-- Check if any attachments exist
SELECT COUNT(*) as attachment_count FROM course_attachments;

-- List all attachments
SELECT * FROM course_attachments LIMIT 5;

