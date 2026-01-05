-- Fix course_attachments table to accept string video IDs
-- The hardcoded courses use string IDs like 'v1-1', not UUIDs

-- Change parent_id from UUID to TEXT to support string video IDs
ALTER TABLE course_attachments 
ALTER COLUMN parent_id TYPE TEXT;

-- Update the index to work with TEXT
DROP INDEX IF EXISTS idx_course_attachments_parent;
CREATE INDEX idx_course_attachments_parent ON course_attachments(parent_id, parent_type);

