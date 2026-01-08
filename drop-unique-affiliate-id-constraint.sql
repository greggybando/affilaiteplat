-- Drop old UNIQUE(affiliate_id) constraint from group_chat_participants
-- This allows users to be in multiple group chats

-- Step 1: Find and drop the old unique constraint on affiliate_id
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'group_chat_participants'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
          SELECT attnum
          FROM pg_attribute
          WHERE attrelid = 'group_chat_participants'::regclass
            AND attname = 'affiliate_id'
      );

    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE group_chat_participants DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No unique constraint on affiliate_id found';
    END IF;
END $$;

-- Step 2: Verify the new unique index on (affiliate_id, group_chat_id) exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_chat_participants_unique 
ON group_chat_participants(affiliate_id, group_chat_id);


