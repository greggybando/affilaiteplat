-- ============================================
-- FIX: is_section_unlocked to handle video checkpoints correctly
-- ============================================
-- Problem: The function treats all checkpoints equally, but video checkpoints
-- should only unlock the next VIDEO, not the next SECTION.
--
-- Rule: Section checkpoints unlock sections. Video checkpoints unlock videos.
-- ============================================

-- Drop and recreate the function with proper video checkpoint handling
CREATE OR REPLACE FUNCTION is_section_unlocked(
  p_user_id UUID,
  p_section_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_section_order INTEGER;
  v_category_id UUID;
  v_previous_section_id UUID;
  v_has_unlock_rule BOOLEAN;
  v_required_checkpoint_id UUID;
  v_prev_has_video_checkpoints BOOLEAN;
  v_prev_has_section_checkpoint BOOLEAN;
  v_prev_section_checkpoint_approved BOOLEAN;
BEGIN
  -- Get section's order and category
  SELECT display_order, category_id INTO v_section_order, v_category_id
  FROM course_sections
  WHERE id = p_section_id;

  -- Check if there's a specific unlock rule for this section
  SELECT EXISTS (
    SELECT 1 FROM unlock_rules
    WHERE target_type = 'section'
      AND target_id::UUID = p_section_id
  ) INTO v_has_unlock_rule;

  IF v_has_unlock_rule THEN
    -- Get required checkpoint from unlock rule
    SELECT required_checkpoint_id INTO v_required_checkpoint_id
    FROM unlock_rules
    WHERE target_type = 'section'
      AND target_id::UUID = p_section_id
    LIMIT 1;

    -- Check if user has approved that checkpoint
    RETURN user_has_approved_checkpoint(p_user_id, v_required_checkpoint_id);
  ELSE
    -- Default: sequential unlock based on previous section
    -- Find previous section in same category
    SELECT id INTO v_previous_section_id
    FROM course_sections
    WHERE category_id = v_category_id
      AND display_order < v_section_order
    ORDER BY display_order DESC
    LIMIT 1;

    -- If no previous section, first section is always unlocked
    IF v_previous_section_id IS NULL THEN
      RETURN true;
    END IF;

    -- Check if previous section uses VIDEO-LEVEL checkpoints
    SELECT EXISTS (
      SELECT 1 FROM checkpoints
      WHERE section_id = v_previous_section_id
        AND video_id IS NOT NULL
    ) INTO v_prev_has_video_checkpoints;

    -- Check if previous section has a SECTION-LEVEL checkpoint
    SELECT EXISTS (
      SELECT 1 FROM checkpoints
      WHERE section_id = v_previous_section_id
        AND video_id IS NULL
    ) INTO v_prev_has_section_checkpoint;

    -- If previous section uses video checkpoints, DO NOT auto-unlock
    -- Video checkpoints only unlock the next video, not the next section
    IF v_prev_has_video_checkpoints THEN
      -- Only unlock if there's ALSO a section-level checkpoint that's approved
      IF v_prev_has_section_checkpoint THEN
        SELECT EXISTS (
          SELECT 1 FROM checkpoints c
          JOIN user_checkpoints uc ON uc.checkpoint_id = c.id
          WHERE c.section_id = v_previous_section_id
            AND c.video_id IS NULL  -- SECTION-level only
            AND uc.user_id = p_user_id
            AND uc.status = 'approved'
        ) INTO v_prev_section_checkpoint_approved;
        
        RETURN v_prev_section_checkpoint_approved;
      ELSE
        -- Has video checkpoints but no section checkpoint = video-locked section
        -- This section cannot be unlocked via checkpoints (video checkpoints don't unlock sections)
        RETURN false;
      END IF;
    END IF;

    -- Previous section has no video checkpoints
    -- Check if it has a section checkpoint
    IF NOT v_prev_has_section_checkpoint THEN
      -- No checkpoint at all = auto-unlock
      RETURN true;
    END IF;

    -- Previous section has a section-level checkpoint
    -- Check if it's approved (original logic, but explicitly for section-level only)
    RETURN EXISTS (
      SELECT 1 FROM checkpoints c
      JOIN user_checkpoints uc ON uc.checkpoint_id = c.id
      WHERE c.section_id = v_previous_section_id
        AND c.video_id IS NULL  -- SECTION-level checkpoints only
        AND uc.user_id = p_user_id
        AND uc.status = 'approved'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Verify the function was created
SELECT 'is_section_unlocked function updated successfully' as status;


