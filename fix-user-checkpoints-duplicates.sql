-- ============================================
-- FIX DUPLICATE USER_CHECKPOINTS BEFORE ADDING UNIQUE CONSTRAINT
-- ============================================

-- STEP 1: Identify duplicates
-- This query shows all duplicates (user_id, checkpoint_id pairs with multiple rows)
SELECT 
    user_id, 
    checkpoint_id, 
    COUNT(*) as duplicate_count
FROM user_checkpoints
GROUP BY user_id, checkpoint_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- STEP 2: Keep the most recent submission for each (user_id, checkpoint_id) pair
-- Priority: approved > denied > needs_review > pending (by status)
-- Then: most recent submitted_at
-- Delete older duplicates

DELETE FROM user_checkpoints
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY user_id, checkpoint_id 
                ORDER BY 
                    CASE status
                        WHEN 'approved' THEN 1
                        WHEN 'denied' THEN 2
                        WHEN 'needs_review' THEN 3
                        WHEN 'pending' THEN 4
                        ELSE 5
                    END,
                    submitted_at DESC,
                    created_at DESC
            ) as rn
        FROM user_checkpoints
    ) ranked
    WHERE rn > 1
);

-- STEP 3: Verify no duplicates remain
SELECT 
    user_id, 
    checkpoint_id, 
    COUNT(*) as count
FROM user_checkpoints
GROUP BY user_id, checkpoint_id
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- STEP 4: Now add the unique constraint (run this after verifying no duplicates)
ALTER TABLE user_checkpoints
ADD CONSTRAINT user_checkpoints_user_checkpoint_unique 
UNIQUE (user_id, checkpoint_id);

