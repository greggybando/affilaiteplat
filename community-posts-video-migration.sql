-- Add video_url column to community_posts table
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS video_url TEXT;





