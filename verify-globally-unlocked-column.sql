-- Step 1: Verify the globally_unlocked column exists in course_modules table
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_modules' 
  AND column_name = 'globally_unlocked';

-- Also check a sample of actual data to see current values
SELECT 
  id,
  title,
  globally_unlocked,
  course_id
FROM course_modules
LIMIT 10;

