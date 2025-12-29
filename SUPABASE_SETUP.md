# Supabase Setup Instructions

## 1. Database Migration

Run the SQL in `database-migrations.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the contents of `database-migrations.sql`
4. Run the query

This will create:
- `avatar_name` and `avatar_url` columns on `affiliates` table
- `pods` table
- `pod_members` table
- `watch_lists` table
- All necessary indexes

## 2. Storage Bucket for Avatars

Create a storage bucket for avatar images:

1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `avatars`
4. Public bucket: **Yes** (checked)
5. File size limit: 5MB (or your preference)
6. Allowed MIME types: `image/*`
7. Click "Create bucket"

## 3. Storage Policies (Optional but Recommended)

Set up RLS policies for the `avatars` bucket:

```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to avatars
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

Note: The current implementation uses the service role key for uploads, so these policies are optional. However, they're recommended for better security if you want to allow direct client uploads in the future.




