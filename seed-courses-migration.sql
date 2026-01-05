-- Seed Courses Migration
-- Migrates hardcoded course data to database structure
-- Run this after course-management-migration.sql

-- ============================================
-- SEED MINDSET COURSE DATA
-- ============================================

DO $$
DECLARE
  starthere_cat_id UUID;
  mindset_cat_id UUID;
  lifedesign_cat_id UUID;
  thinkingtools_cat_id UUID;
  section_id_var UUID;
BEGIN
  -- Insert Categories
  INSERT INTO course_categories (course_type, category_id, title, is_start_here, display_order) VALUES
  ('mindset', 'starthere', 'START HERE SO YOU KNOW WHAT TO DO', true, 0),
  ('mindset', 'mindset', 'Mindset', false, 1),
  ('mindset', 'lifedesign', 'Life Design System', false, 2),
  ('mindset', 'thinkingtools', 'Thinking Tools/Models', false, 3)
  ON CONFLICT (course_type, category_id) DO UPDATE SET
    title = EXCLUDED.title,
    is_start_here = EXCLUDED.is_start_here,
    display_order = EXCLUDED.display_order
  RETURNING id INTO starthere_cat_id WHERE category_id = 'starthere';

  SELECT id INTO starthere_cat_id FROM course_categories WHERE course_type = 'mindset' AND category_id = 'starthere';
  SELECT id INTO mindset_cat_id FROM course_categories WHERE course_type = 'mindset' AND category_id = 'mindset';
  SELECT id INTO lifedesign_cat_id FROM course_categories WHERE course_type = 'mindset' AND category_id = 'lifedesign';
  SELECT id INTO thinkingtools_cat_id FROM course_categories WHERE course_type = 'mindset' AND category_id = 'thinkingtools';

  -- START HERE Section
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (starthere_cat_id, 0, 0, 'Getting Started', 'Watch this first to understand how to navigate and use the Mindset course.', 0)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v0-1', 'How to Use This Course', NULL, '', 0)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- MINDSET Category Sections
  -- Section 1: Core Re-Frames
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (mindset_cat_id, 1, 1, 'Core Re-Frames', 'Fundamental mindset shifts to transform how you see yourself and your potential.', 0)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v1-1', 'You can change your life', NULL, '9424ea6ec43e415d87ac9ee1383c404c', 0),
  (section_id_var, 'v1-2', 'Every problem is a personal power problem', NULL, '1d55647b1c7f4953a7718465dc2747c5', 1),
  (section_id_var, 'v1-3', 'No such thing as wasted time', NULL, '7388824c447b4b139be63d8cb55e8636', 2),
  (section_id_var, 'v1-4', 'You are a problem solver', NULL, '00b9923a57064b4bbcac9e032ce5564f', 3),
  (section_id_var, 'v1-5', 'Balance is a lie. Obsession wins', NULL, 'ec745026fb254f548c9535bd5f4d1e46', 4),
  (section_id_var, 'v1-6', 'You are the authority of your life', NULL, '0207f161adaa4cd0a8a777189167425b', 5),
  (section_id_var, 'v1-7', 'Your dreams are not distant fantasies', NULL, 'e455e6f78ca94b9db8f3bc1d6af6906e', 6),
  (section_id_var, 'v1-8', 'Mind-based system to feel-based system', NULL, '876677b2bbe14a4d9721ee8e3df71ac8', 7),
  (section_id_var, 'v1-9', 'What is life directionality?', NULL, 'cad4c4eea34f4ab1936f2433d9a3dc38', 8),
  (section_id_var, 'v1-10', 'Can''t do anything, but can do exactly what you want', NULL, '81c618ea1c604e65938eb368bde61e49', 9)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Section 2: Operational Foundations
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (mindset_cat_id, 2, 2, 'Operational Foundations', 'Core principles for building a strong foundation in your life and decision-making.', 1)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v2-1', 'Being okay with being alone', NULL, '76bd1113ec39482abebe847a1db35016', 0),
  (section_id_var, 'v2-2', 'Removing "right vs wrong" thinking', NULL, 'ebcb5ea388004ee185b1039c2a4d3fbc', 1),
  (section_id_var, 'v2-3', 'The idea of "creating space"', NULL, 'c296a736abff425f864dcf736c9654ac', 2),
  (section_id_var, 'v2-4', 'God-given niche', NULL, 'c9b1777f7965493683b341682899a27c', 3),
  (section_id_var, 'v2-5', 'Removing the victim mindset', NULL, '3206285ebbf64733b7d04f49713b8d44', 4),
  (section_id_var, 'v2-6', 'Taking monstrous & absurd personal responsibility', NULL, 'aa72270f27394f46aca6181d89efb140', 5),
  (section_id_var, 'v2-7', 'Scarcity vs abundance mindset', NULL, 'f1de5d422bf94c42be2d68b436a5fcf6', 6)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Section 10: Fixing Normie Thinking Errors
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (mindset_cat_id, 10, 3, 'Fixing Normie Thinking Errors', 'Identify and eliminate common thinking patterns that hold you back.', 2)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v10-1', 'The secret formula', NULL, '3e6f7267f80d42d28bffe1ca8637a365', 0),
  (section_id_var, 'v10-2', 'Stats don''t apply to you', NULL, '3dcabbb3fd5d4b52a0dbd6878f5dc099', 1),
  (section_id_var, 'v10-3', 'Kill entitlement', NULL, '785eb5383e414d5cafb5ca0f98e436da', 2),
  (section_id_var, 'v10-4', 'How the world works', NULL, '1fbd32dbd2cd4c6db9af2a7756166872', 3),
  (section_id_var, 'v10-5', 'Actually understanding things', NULL, '67a971fa679249cfac13dcb187449bdd', 4),
  (section_id_var, 'v10-6', 'Forbidden normie errors', NULL, '4641d3510463447ca18b08c2237aae2b', 5)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- LIFE DESIGN Category Sections
  -- Section 3: The Life Design Process
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (lifedesign_cat_id, 3, 1, 'The Life Design Process', 'The systematic approach to designing and building the life you want.', 0)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v3-1', 'Step 1 - Diagnosis process', 'V2u6MtzHjlw', NULL, 0),
  (section_id_var, 'v3-2', 'Step 2 - survival income', 'EwaYBchD43k', NULL, 1),
  (section_id_var, 'v3-3', '3 - running the diagnosis process', 'mqRRHfwdeNw', NULL, 2),
  (section_id_var, 'v3-4', '4 - Analyzing your data points + rough buildout live', 'lNhzBOMaW0k', NULL, 3),
  (section_id_var, 'v3-5', '5- reverse engineer + research next steps', 'Tw_0QfukYuE', NULL, 4),
  (section_id_var, 'v3-6', '6 - design your day system', 'lHw76uDbdRE', NULL, 5),
  (section_id_var, 'v3-7', 'Researching + finding people that know', '8s3bzEd162c', NULL, 6)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Section 7: The Game of Capitalism
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (lifedesign_cat_id, 7, 2, 'The Game of Capitalism', 'Understand how money works and how to play the game to win.', 1)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v7-1', 'The game + its current problems', NULL, '5166d05c5b7a45858c98ef13ff9bbfa5', 0),
  (section_id_var, 'v7-2', 'How money works and how to get it', NULL, '474596192262401084262de5bde6f6b9', 1),
  (section_id_var, 'v7-3', 'The 7 levels of capitalism', NULL, '4805508f33f548458f75cae4a1feb447', 2),
  (section_id_var, 'v7-4', 'Skill pack + skill-pack systems', NULL, '9d2179b1ba554276958a2c10d273a569', 3),
  (section_id_var, 'v7-5', 'Stored leverage', NULL, '2a0213ed5e9346338940380504588c6b', 4),
  (section_id_var, 'v7-6', 'Expense management', NULL, '250cf2c657d9416495a120d4473bf822', 5)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Section 9: Life Directionality
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (lifedesign_cat_id, 9, 3, 'Life Directionality', 'Discover and align with your true life direction and purpose.', 2)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v9-1', 'Reality/life directionality', NULL, 'aa35407c3bee4ede8791a9772331b986', 0),
  (section_id_var, 'v9-2', 'Signal is simple, noise isn''t', NULL, '667e9a2769d740e0a46e83d89f6052f4', 1),
  (section_id_var, 'v9-3', 'Barrier to life alignment', NULL, 'f129a45dbcf04f10a44a8e13fa05a66c', 2),
  (section_id_var, 'v9-4', 'Strengthen conviction in self', NULL, 'c569894df2d448b19ab4b2de14f2e2b5', 3),
  (section_id_var, 'v9-5', 'I will get better', NULL, '5c3e982f1f98437e8e43e9ffde2407e2', 4),
  (section_id_var, 'v9-6', 'Managing your energy', NULL, 'b91a491bc6334ed8960c5ffe83fc81fa', 5)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Section 8: Life Design Starter Packs
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (lifedesign_cat_id, 8, 4, 'Life Design Starter Packs', 'Pre-built templates and systems to jumpstart your life design journey.', 3)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v8-1', 'Life Design Starter Pack Overview', NULL, '6d20be7d84bb4a38b01d9638f6334d3f', 0),
  (section_id_var, 'v8-2', 'Youngblood grinder template', NULL, '19c4a63fd79c49be882966e5394cfe0c', 1),
  (section_id_var, 'v8-3', 'Rando-job lifefloater', NULL, '59a52110a4a340e7aa9ede851ac56255', 2),
  (section_id_var, 'v8-4', 'Corporate sidehustler', NULL, 'c2b99ffd662c49f995c3e67ed65f5870', 3),
  (section_id_var, 'v8-5', 'Remote dreamor', NULL, 'daacdb14a75643d2a4816887dd932e87', 4),
  (section_id_var, 'v8-6', 'Corporate lifemaxxer', NULL, '9a5168e5cab441f090b8f74e41505555', 5),
  (section_id_var, 'v8-7', 'Future worldwide entrepreneur', NULL, '349c724bfb1a45459904ce439aac9225', 6),
  (section_id_var, 'v8-8', 'Entrepreneurial lifemaxxr', NULL, 'd6fa514553be452fb6367e2d4032c621', 7)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- THINKING TOOLS Category Sections
  -- Section 4: Reverse Engineering
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (thinkingtools_cat_id, 4, 1, 'Reverse Engineering', 'Learn to work backwards from your goals to create actionable steps.', 0)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v4-1', 'Reverse engineering the steps of your life', NULL, '693655ad78a147d6b139d55a653aa00b', 0),
  (section_id_var, 'v4-2', 'The DESIGN YOUR DAY system', NULL, 'bfd58023e63d448392b86074f35c41d6', 1),
  (section_id_var, 'v4-3', 'Research/finding ppl that know (hardest part)', NULL, '9971245dfd424125a5b3c648e7fdf18f', 2),
  (section_id_var, 'v4-4', 'ADDITIONAL reverse engineering (use as extra examples)', NULL, 'e10e99531f87484c8fa47e184a83e525', 3),
  (section_id_var, 'v4-5', '"Don''t know moment" = good', NULL, '363eec37084d4650934bfb375f4c7196', 4)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Section 6: Decision-Making
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (thinkingtools_cat_id, 6, 2, 'Decision-Making', 'Master the art of making confident decisions and trusting your choices.', 1)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v6-1', 'Decision-making overview', NULL, 'c544dd89a60a456c8d20f71263fd1e93', 0),
  (section_id_var, 'v6-2', 'Decision-making mental model', NULL, '4dc358afda54482893b7ca73faf855c4', 1),
  (section_id_var, 'v6-3', 'There is no ''right decision''', NULL, '5733ab6af0464cd5ba6b9d3c7d822da1', 2),
  (section_id_var, 'v6-4', 'Additional decision-making idea', NULL, '183a85dad7f24755aa2549b8c65217b0', 3)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Section 5: Procrastination
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (thinkingtools_cat_id, 5, 3, 'Procrastination', 'Systems and strategies to overcome procrastination and build consistent action.', 2)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v5-1', 'Anti procrastination module', NULL, '00d9d44d3dae4b1a9a612ec7c4f0559f', 0),
  (section_id_var, 'v5-2', 'Procrastination destruction system', NULL, 'b85982d48967474c9c0882e35aca5424', 1)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

END $$;

-- ============================================
-- SEED DREAM JOB COURSE DATA
-- ============================================

DO $$
DECLARE
  dreamjob_cat_id UUID;
  section_id_var UUID;
BEGIN
  -- DreamJob doesn't have categories, just sections (modules)
  -- We'll create a single category for DreamJob
  INSERT INTO course_categories (course_type, category_id, title, is_start_here, display_order) VALUES
  ('dreamjob', 'main', 'Dream Job Course', false, 0)
  ON CONFLICT (course_type, category_id) DO UPDATE SET
    title = EXCLUDED.title,
    display_order = EXCLUDED.display_order
  RETURNING id INTO dreamjob_cat_id;

  SELECT id INTO dreamjob_cat_id FROM course_categories WHERE course_type = 'dreamjob' AND category_id = 'main';

  -- Module 1: INTRO
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (dreamjob_cat_id, 1, 1, 'INTRO', 'Get started with the Dream Job program', 0)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v1-1', 'House Rules', 'tKCQuBJcOJI', NULL, 0)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Module 2: THE GREAT UNLEARNING
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (dreamjob_cat_id, 2, 2, 'THE GREAT UNLEARNING', 'Unlearn the broken job search advice', 1)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v2-1', 'The great unlearning lesson 1', 'PfgsbC2OQ3w', NULL, 0),
  (section_id_var, 'v2-2', 'The great unlearning lesson 2', '9AK-qoJ4QD0', NULL, 1),
  (section_id_var, 'v2-3', 'Great unlearning lesson 3', 'MZZ1gnfA1Uc', NULL, 2),
  (section_id_var, 'v2-4', 'Lesson 4', 'a6oT475-bNA', NULL, 3),
  (section_id_var, 'v2-5', 'Lesson 5', 'M_IYaTtr0F0', NULL, 4),
  (section_id_var, 'v2-6', 'Lesson 6', '7npWIycpkfE', NULL, 5),
  (section_id_var, 'v2-7', 'Lesson 7', 'll75o_cW0uo', NULL, 6),
  (section_id_var, 'v2-8', 'Lesson 8', '', NULL, 7)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Module 3: KNOW THYSELF
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (dreamjob_cat_id, 3, 3, 'KNOW THYSELF', 'Discover your unique strengths and values', 2)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v3-1', 'Know thyself: Lesson 1', 'm7SE3iT41ZU', NULL, 0),
  (section_id_var, 'v3-2', 'Lesson 2', 'cMp3D7etkeQ', NULL, 1),
  (section_id_var, 'v3-3', 'Lesson 3', '-K3KsXLHARw', NULL, 2)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Module 4: RESEARCH LIKE HEAVEN
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (dreamjob_cat_id, 4, 4, 'RESEARCH LIKE HEAVEN', 'Master the art of company and role research', 3)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v4-1', 'Research like heaven: Lesson 1', 'AJf9LB2Le3Y', NULL, 0),
  (section_id_var, 'v4-2', 'Lesson 2', 'ilL-E1ks8XU', NULL, 1),
  (section_id_var, 'v4-3', '3', 'U1RAtTAwNxA', NULL, 2),
  (section_id_var, 'v4-4', '3 part 2', 'QxKkCazV2NY', NULL, 3)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Module 5: TRIAL PROJECT
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (dreamjob_cat_id, 5, 5, 'TRIAL PROJECT', 'Create work samples that prove your value', 4)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v5-1', 'Trial Project: Lesson 1', 'z3IX2ACDXNs', NULL, 0),
  (section_id_var, 'v5-2', 'Lesson 2', 'E9sBYsPmhw8', NULL, 1),
  (section_id_var, 'v5-3', 'Lesson 3', 'jd3wQ3k7Nlk', NULL, 2),
  (section_id_var, 'v5-4', 'Lesson 4', 'xpcpLPdDU_A', NULL, 3),
  (section_id_var, 'v5-5', 'Lesson 5', 'tbWygenb3iI', NULL, 4),
  (section_id_var, 'v5-6', 'Lesson 6', 'GRVoPEB9yBI', NULL, 5)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Module 6: REACH ANYONE IN THE WORLD
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (dreamjob_cat_id, 6, 6, 'REACH ANYONE IN THE WORLD', 'Learn how to connect with decision makers', 5)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v6-1', 'Reach Anyone In The World: Lesson 1', 'aK45c5bjEms', NULL, 0),
  (section_id_var, 'v6-2', 'Lesson 2', 'FPb7qVArelg', NULL, 1),
  (section_id_var, 'v6-3', 'Lesson 3', '1ehr1fk9sY8', NULL, 2)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Module 7: ACING EVERY INTERVIEW
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (dreamjob_cat_id, 7, 7, 'ACING EVERY INTERVIEW', 'Turn interviews into conversations and job offers', 6)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v7-1', 'Acing Every Interview: Lesson 1 (master lesson)', 'fyeoO8EzD6w', NULL, 0)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

  -- Module 8: FINAL FIRST IMPRESSION
  INSERT INTO course_sections (category_id, section_id, number, title, description, display_order) VALUES
  (dreamjob_cat_id, 8, 8, 'FINAL FIRST IMPRESSION', 'Close the deal and start your dream job', 7)
  ON CONFLICT (category_id, section_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order
  RETURNING id INTO section_id_var;

  INSERT INTO course_videos (section_id, video_id, title, youtube_id, loom_id, display_order) VALUES
  (section_id_var, 'v8-1', 'Final First Impression: Master lesson', 'AkF6LvlvroY', NULL, 0),
  (section_id_var, 'v8-2', 'Lesson 6 final adjustment Bonus video', 'qXjuyco6RQw', NULL, 1)
  ON CONFLICT (section_id, video_id) DO UPDATE SET
    title = EXCLUDED.title,
    youtube_id = EXCLUDED.youtube_id,
    loom_id = EXCLUDED.loom_id,
    display_order = EXCLUDED.display_order;

END $$;

