-- Fix module order for Mindset course
-- "The Life Design Process" should be right after "Operational Foundations"

-- First, check current order
SELECT id, title, sort_order 
FROM course_modules 
WHERE course_id = (SELECT id FROM courses WHERE slug = 'mindset' OR slug = 'lifedesign' LIMIT 1)
ORDER BY sort_order;

-- Update "The Life Design Process" to be right after "Operational Foundations"
-- Assuming Operational Foundations has sort_order = X, Life Design Process should be X+1
-- We'll need to shift other modules down

-- Step 1: Find Operational Foundations sort_order
-- Step 2: Set Life Design Process to Operational Foundations + 1
-- Step 3: Shift everything after Operational Foundations up by 1 (except Life Design Process)

DO $$
DECLARE
  course_uuid UUID;
  operational_foundations_order INTEGER;
  life_design_process_id UUID;
  life_design_process_order INTEGER;
BEGIN
  -- Get course ID
  SELECT id INTO course_uuid FROM courses WHERE slug IN ('mindset', 'lifedesign') LIMIT 1;
  
  -- Get Operational Foundations sort_order
  SELECT sort_order INTO operational_foundations_order
  FROM course_modules
  WHERE course_id = course_uuid
    AND (title ILIKE '%Operational Foundations%' OR title ILIKE '%Core Foundations%')
  LIMIT 1;
  
  -- Get Life Design Process ID and current order
  SELECT id, sort_order INTO life_design_process_id, life_design_process_order
  FROM course_modules
  WHERE course_id = course_uuid
    AND title ILIKE '%Life Design Process%'
  LIMIT 1;
  
  IF operational_foundations_order IS NOT NULL AND life_design_process_id IS NOT NULL THEN
    -- If Life Design Process is already after Operational Foundations, no change needed
    IF life_design_process_order > operational_foundations_order THEN
      RAISE NOTICE 'Life Design Process is already after Operational Foundations';
    ELSE
      -- Shift modules between Operational Foundations and Life Design Process up by 1
      UPDATE course_modules
      SET sort_order = sort_order - 1
      WHERE course_id = course_uuid
        AND sort_order > operational_foundations_order
        AND sort_order < life_design_process_order;
      
      -- Set Life Design Process to be right after Operational Foundations
      UPDATE course_modules
      SET sort_order = operational_foundations_order + 1
      WHERE id = life_design_process_id;
      
      RAISE NOTICE 'Updated Life Design Process to be right after Operational Foundations';
    END IF;
  ELSE
    RAISE NOTICE 'Could not find modules - check course ID and module titles';
  END IF;
END $$;

-- Verify the new order
SELECT id, title, sort_order 
FROM course_modules 
WHERE course_id = (SELECT id FROM courses WHERE slug IN ('mindset', 'lifedesign') LIMIT 1)
ORDER BY sort_order;

