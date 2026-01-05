# Course Attachments System - Setup Guide

## Overview

This system allows you to upload and attach documents/files (PDFs, Word docs, images, etc.) to any course content (videos, sections, or categories) in the Dream Job, Mindset, or Affiliate courses.

## Setup Steps

### 1. Run Database Migration

Run this SQL in Supabase:

```sql
-- See course-attachments-migration.sql
```

This creates the `course_attachments` table to store file metadata.

### 2. Create Supabase Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `course-files`
4. Make it **Public** (so files can be accessed via URL)
5. Click "Create bucket"

### 3. Set Storage Policies (Important!)

Run this SQL in Supabase to allow file uploads:

```sql
-- Allow authenticated admins/moderators to upload
CREATE POLICY "Admins can upload course files"
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
CREATE POLICY "Admins can delete course files"
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

-- Allow public read access
CREATE POLICY "Public can read course files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-files');
```

**Note:** Since we're using the service role key in the API, these policies may not be strictly necessary, but they're good for security.

## How to Use

### 1. Save Course Structure First

Before you can attach files, you need to:
1. Go to `/admin/courses`
2. Create/edit your course structure (categories, sections, videos)
3. Click **"Save Changes"** - this creates database records with UUIDs

### 2. Attach Files

Once items are saved:
1. You'll see a **📎 (paperclip) icon** next to each category, section, and video
2. Click the paperclip icon to open the attachment manager
3. Click "Choose File" and select your document
4. Optionally set a custom display name
5. Click "Upload File"
6. Files will appear in the list below

### 3. View Attachments

Attachments are stored and can be:
- Downloaded by clicking the download icon
- Deleted by clicking the trash icon
- Displayed in the course viewer (we'll add this next)

## Supported File Types

- **Documents:** PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Text (.txt), CSV
- **Images:** PNG, JPEG, GIF, WebP
- **Archives:** ZIP
- **Max Size:** 50MB per file

## File Storage Structure

Files are stored in Supabase Storage at:
```
course-files/
  {courseType}/
    {parentType}/
      {parentId}/
        {timestamp}-{filename}
```

Example:
```
course-files/
  dreamjob/
    video_id/
      abc123-uuid/
        1234567890-resume_template.pdf
```

## API Endpoints

- `GET /api/admin/courses/attachments?parentId={id}&parentType={type}&courseType={type}` - List attachments
- `POST /api/admin/courses/attachments` - Upload file (multipart/form-data)
- `DELETE /api/admin/courses/attachments` - Delete attachment

## Next Steps

To display attachments in the course viewer:
1. Fetch attachments when loading course content
2. Display download links/icons next to videos/sections
3. Add a "Resources" or "Downloads" section

Would you like me to implement the display of attachments in the course viewer as well?

