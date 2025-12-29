-- Add signature column to affiliates table
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS signature TEXT;




