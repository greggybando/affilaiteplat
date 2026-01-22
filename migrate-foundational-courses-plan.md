# Migration Plan: Foundational Courses to New Structure

## Table Schema Comparison

### OLD SYSTEM (Foundational Courses)
```sql
-- course_categories
- id (UUID)
- course_type (VARCHAR) -- 'mindset', 'dreamjob'
- category_id (VARCHAR) -- 'starthere', 'mindset', 'lifedesign', etc.
- title (VARCHAR)
- is_start_here (BOOLEAN)
- display_order (INTEGER)
- created_at, updated_at

-- course_sections
- id (UUID)
- category_id (UUID) → course_categories.id
- section_id (INTEGER) -- unique per category
- number (INTEGER)
- title (VARCHAR)
- description (TEXT)
- display_order (INTEGER)
- created_at, updated_at

-- course_videos
- id (UUID)
- section_id (UUID) → course_sections.id
- video_id (VARCHAR) -- e.g., 'v1-1', 'v2-1'
- title (VARCHAR)
- youtube_id (VARCHAR)
- loom_id (VARCHAR)
- display_order (INTEGER)
- created_at, updated_at
```

### NEW SYSTEM (SkillBank)
```sql
-- courses
- id (UUID)
- slug (TEXT UNIQUE) -- e.g., 'mindset', 'dream-job'
- title (TEXT)
- description (TEXT)
- emoji (TEXT)
- thumbnail_url (TEXT)
- color (TEXT)
- icon (TEXT)
- sort_order (INTEGER)
- is_published (BOOLEAN)
- created_at, updated_at

-- course_modules
- id (UUID)
- course_id (UUID) → courses.id
- title (TEXT)
- slug (TEXT) -- unique per course
- description (TEXT)
- sort_order (INTEGER)
- is_published (BOOLEAN)
- created_at (TIMESTAMPTZ)

-- course_lessons
- id (UUID)
- module_id (UUID) → course_modules.id
- title (TEXT)
- slug (TEXT) -- unique per module
- description (TEXT)
- video_url (TEXT) -- YouTube ID or Loom ID
- video_type (TEXT) -- 'youtube' or 'loom'
- content (TEXT)
- duration_minutes (INTEGER)
- sort_order (INTEGER)
- is_published (BOOLEAN)
- is_free_preview (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

## Field Mapping Strategy

### Course Level
- `course_categories.course_type` → `courses.slug` ('mindset' → 'mindset', 'dreamjob' → 'dream-job')
- `course_categories.title` → `courses.title` (use main category title or course_type)
- `courses.description` → Set from course metadata
- `courses.emoji` → '🧠' for mindset, '💼' for dreamjob
- `courses.color` → '#8B5CF6' for mindset, '#06B6D4' for dreamjob
- `courses.sort_order` → Based on course_type order
- `courses.is_published` → true

### Module Level
- `course_sections` → `course_modules`
- `course_sections.title` → `course_modules.title`
- `course_sections.description` → `course_modules.description`
- `course_sections.display_order` → `course_modules.sort_order`
- `course_modules.slug` → Generate from title (lowercase, hyphenated)
- `course_modules.course_id` → Link to new course UUID
- `course_modules.is_published` → true

### Lesson Level
- `course_videos` → `course_lessons`
- `course_videos.title` → `course_lessons.title`
- `course_videos.youtube_id` OR `course_videos.loom_id` → `course_lessons.video_url`
- Determine `course_lessons.video_type` from which field has value
- `course_videos.display_order` → `course_lessons.sort_order`
- `course_lessons.slug` → Generate from title (lowercase, hyphenated)
- `course_lessons.module_id` → Link to new module UUID
- `course_lessons.is_published` → true

## Special Considerations

### Mindset Course Structure
- Mindset has multiple categories: 'starthere', 'mindset', 'lifedesign', 'thinkingtools'
- Each category becomes a separate module in the new system
- All modules belong to the same course (slug: 'mindset')

### DreamJob Course Structure
- DreamJob has a single category: 'main'
- All sections become modules directly under the course

### User Progress Migration
- Old system: No direct progress table (uses checkpoints/unlocks)
- New system: `user_lesson_progress` table exists
- **Action**: Create progress entries for users who have approved checkpoints
- Map: If user has approved checkpoint for a section → mark all videos in that section as completed

### Checkpoint Migration
- Checkpoints reference `course_sections.id` (old) or `course_modules.id` (new)
- Need to update checkpoint `section_id` to point to new `course_modules.id`
- Video-level checkpoints reference `course_videos.id` → need to update to `course_lessons.id`

## Migration Steps

1. **Create Course Entries**
   - Insert into `courses` for 'mindset' and 'dream-job'
   - Store UUIDs for later reference

2. **Migrate Modules (from course_sections)**
   - For Mindset: Group by category, create modules preserving order
   - For DreamJob: Create modules directly from sections
   - Generate slugs from titles
   - Preserve sort_order

3. **Migrate Lessons (from course_videos)**
   - Map each video to a lesson
   - Extract video_url from youtube_id or loom_id
   - Set video_type appropriately
   - Generate slugs
   - Preserve sort_order

4. **Update Checkpoints**
   - Find checkpoints referencing old section_ids
   - Update `section_id` to new module UUIDs
   - Find video-level checkpoints
   - Update `video_id` to new lesson UUIDs

5. **Migrate User Progress** (Optional)
   - For users with approved section checkpoints, mark all lessons in that module as completed
   - Create entries in `user_lesson_progress`

6. **Preserve Old Tables**
   - Keep all old tables intact as backup
   - Add comment noting migration date

## Migration Script Structure

```sql
-- Step 1: Create courses
-- Step 2: Migrate modules (sections → modules)
-- Step 3: Migrate lessons (videos → lessons)
-- Step 4: Update checkpoints
-- Step 5: Migrate user progress (optional)
-- Step 6: Add migration metadata
```

## Rollback Plan

- Old tables remain untouched
- Can revert by:
  1. Deleting new course entries
  2. Reverting checkpoint updates
  3. Old system continues to work independently

