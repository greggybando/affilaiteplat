-- Add forfeit fields to pod_battles table
ALTER TABLE pod_battles 
ADD COLUMN IF NOT EXISTS forfeit_requested_by_pod_id UUID REFERENCES pods(id),
ADD COLUMN IF NOT EXISTS forfeit_status VARCHAR(20) CHECK (forfeit_status IN ('requested', 'accepted', 'declined', NULL));




