-- ============================================
-- CHECKPOINT & GATING SYSTEM MIGRATION
-- ============================================
-- Creates tables for checkpoints, user submissions, and unlock rules
-- Compatible with existing course_categories, course_sections, course_videos tables

-- CHECKPOINTS TABLE
-- One checkpoint per section (the deliverable/outcome for that section)
CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  requirements TEXT NOT NULL, -- What user must submit/complete
  ai_review_enabled BOOLEAN DEFAULT true,
  ai_review_prompt TEXT, -- Optional custom prompt for AI review
  requires_manual_review BOOLEAN DEFAULT false, -- Override AI, always require admin review
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section_id) -- One checkpoint per section
);

-- USER CHECKPOINT SUBMISSIONS
-- Tracks user submissions, AI reviews, and admin decisions
CREATE TABLE IF NOT EXISTS user_checkpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  submission_text TEXT NOT NULL, -- Min 50 chars
  submission_url TEXT, -- Optional URL submission
  screenshot_url TEXT, -- Screenshot/image URL from Supabase Storage
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'needs_review')),
  ai_status VARCHAR(20), -- 'approved', 'denied', 'needs_review'
  ai_reason TEXT, -- AI's explanation
  ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100), -- 0-100
  admin_feedback TEXT, -- Admin's feedback/notes
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  lockin_id UUID, -- Future: link to lock-in system if submission came from lock-in
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UNLOCK RULES
-- Defines what checkpoints unlock which courses/sections
CREATE TABLE IF NOT EXISTS unlock_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('course', 'section')),
  target_id TEXT NOT NULL, -- For 'course': course_type string (e.g., 'mindset'), For 'section': UUID of course_sections
  required_checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_checkpoints_section ON checkpoints(section_id);
CREATE INDEX IF NOT EXISTS idx_user_checkpoints_user ON user_checkpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_user_checkpoints_checkpoint ON user_checkpoints(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_user_checkpoints_status ON user_checkpoints(status);
CREATE INDEX IF NOT EXISTS idx_user_checkpoints_user_checkpoint ON user_checkpoints(user_id, checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_unlock_rules_target ON unlock_rules(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_unlock_rules_checkpoint ON unlock_rules(required_checkpoint_id);

-- FUNCTION: Check if user has approved checkpoint
CREATE OR REPLACE FUNCTION user_has_approved_checkpoint(
  p_user_id UUID,
  p_checkpoint_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_checkpoints
    WHERE user_id = p_user_id
      AND checkpoint_id = p_checkpoint_id
      AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Check if section is unlocked for user
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
    -- Default: sequential unlock (section unlocks after previous section's checkpoint is approved)
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

    -- Check if previous section has a checkpoint and if it's approved
    RETURN EXISTS (
      SELECT 1 FROM checkpoints c
      JOIN user_checkpoints uc ON uc.checkpoint_id = c.id
      WHERE c.section_id = v_previous_section_id
        AND uc.user_id = p_user_id
        AND uc.status = 'approved'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Check if course is unlocked for user
CREATE OR REPLACE FUNCTION is_course_unlocked(
  p_user_id UUID,
  p_course_type VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  v_required_checkpoint_id UUID;
BEGIN
  -- Check if there's an unlock rule for this course
  SELECT required_checkpoint_id INTO v_required_checkpoint_id
  FROM unlock_rules
  WHERE target_type = 'course'
    AND target_id = p_course_type
  LIMIT 1;

  -- If no rule, course is unlocked by default
  IF v_required_checkpoint_id IS NULL THEN
    RETURN true;
  END IF;

  -- Check if user has approved the required checkpoint
  RETURN user_has_approved_checkpoint(p_user_id, v_required_checkpoint_id);
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_checkpoints_updated_at
  BEFORE UPDATE ON checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_checkpoints_updated_at
  BEFORE UPDATE ON user_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unlock_rules_updated_at
  BEFORE UPDATE ON unlock_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

