-- Setup Storage Bucket and Policies for Course Attachments
-- Run this in Supabase SQL Editor after creating the bucket manually

-- Note: You need to create the bucket first in Supabase Dashboard:
-- 1. Go to Storage → Create bucket
-- 2. Name: course-files
-- 3. Make it Public
-- 4. Then run the policies below

-- Storage Policies for course-files bucket

-- Allow authenticated admins/moderators to upload
CREATE POLICY IF NOT EXISTS "Admins can upload course files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-files' AND
  EXISTS (
    SELECT 1 FROM affiliates 
    WHERE affiliates.id = auth.uid() 
    AND affiliates.role IN ('admin', 'moderator')
  )
);

-- Allow authenticated admins/moderators to delete
CREATE POLICY IF NOT EXISTS "Admins can delete course files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files' AND
  EXISTS (
    SELECT 1 FROM affiliates 
    WHERE affiliates.id = auth.uid() 
    AND affiliates.role IN ('admin', 'moderator')
  )
);

-- Allow public read access (so students can download files)
CREATE POLICY IF NOT EXISTS "Public can read course files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-files');

-- Allow authenticated admins/moderators to update
CREATE POLICY IF NOT EXISTS "Admins can update course files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files' AND
  EXISTS (
    SELECT 1 FROM affiliates 
    WHERE affiliates.id = auth.uid() 
    AND affiliates.role IN ('admin', 'moderator')
  )
);


