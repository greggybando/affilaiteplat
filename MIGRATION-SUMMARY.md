# Foundational Courses Migration Summary

## Table Schemas

### OLD SYSTEM (course_categories → course_sections → course_videos)

**course_categories**
```sql
- id (UUID PRIMARY KEY)
- course_type (VARCHAR) -- 'mindset', 'dreamjob'
- category_id (VARCHAR) -- 'starthere', 'mindset', 'lifedesign', etc.
- title (VARCHAR)
- is_start_here (BOOLEAN)
- display_order (INTEGER)
- created_at, updated_at (TIMESTAMPTZ)
UNIQUE(course_type, category_id)
```

**course_sections**
```sql
- id (UUID PRIMARY KEY)
- category_id (UUID) → course_categories.id
- section_id (INTEGER) -- unique per category
- number (INTEGER)
- title (VARCHAR)
- description (TEXT)
- display_order (INTEGER)
- created_at, updated_at (TIMESTAMPTZ)
UNIQUE(category_id, section_id)
```

**course_videos**
```sql
- id (UUID PRIMARY KEY)
- section_id (UUID) → course_sections.id
- video_id (VARCHAR) -- e.g., 'v1-1', 'v2-1'
- title (VARCHAR)
- youtube_id (VARCHAR)
- loom_id (VARCHAR)
- display_order (INTEGER)
- created_at, updated_at (TIMESTAMPTZ)
UNIQUE(section_id, video_id)
```

### NEW SYSTEM (courses → course_modules → course_lessons)

**courses**
```sql
- id (UUID PRIMARY KEY)
- slug (TEXT UNIQUE) -- e.g., 'mindset', 'dream-job'
- title (TEXT)
- description (TEXT)
- emoji (TEXT)
- thumbnail_url (TEXT)
- color (TEXT)
- icon (TEXT)
- sort_order (INTEGER)
- is_published (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```

**course_modules**
```sql
- id (UUID PRIMARY KEY)
- course_id (UUID) → courses.id
- title (TEXT)
- slug (TEXT) -- unique per course
- description (TEXT)
- sort_order (INTEGER)
- is_published (BOOLEAN)
- created_at (TIMESTAMPTZ)
UNIQUE(course_id, slug)
```

**course_lessons**
```sql
- id (UUID PRIMARY KEY)
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
UNIQUE(module_id, slug)
```

## Migration Mapping

### Course Level
- `course_categories.course_type` → `courses.slug`
  - 'mindset' → 'mindset'
  - 'dreamjob' → 'dream-job'
- `course_categories.title` → `courses.title` (for main course title)
- Metadata: emoji, color, description set manually

### Module Level
- **Mindset**: Each `course_categories` entry → `course_modules` (4 modules)
- **DreamJob**: Each `course_sections` entry → `course_modules` (sections become modules)
- `course_sections.title` → `course_modules.title`
- `course_sections.display_order` → `course_modules.sort_order`
- `course_modules.slug` → Generated from title

### Lesson Level
- `course_videos` → `course_lessons`
- `course_videos.title` → `course_lessons.title`
- `course_videos.youtube_id` OR `loom_id` → `course_lessons.video_url`
- `course_videos.display_order` → `course_lessons.sort_order`
- `course_lessons.slug` → Generated from title + video_id for uniqueness

## Important Notes

### Checkpoint Migration Limitation
- **Checkpoints table** has foreign keys to `course_sections.id` and `course_videos.id`
- Cannot directly update checkpoints to point to new tables due to FK constraints
- **Solution**: Checkpoint system will need to be updated in unlock system rewrite to:
  1. Add new columns: `module_id` (UUID → course_modules) and `lesson_id` (UUID → course_lessons)
  2. Populate these columns during migration
  3. Update unlock logic to use new columns

### User Progress Migration
- Migrates users with **approved section-level checkpoints**
- Marks all lessons in that module as completed
- Uses `user_lesson_progress` table (new system)

### Data Preservation
- **Old tables are NOT deleted** - kept as backup
- Migration is **idempotent** - safe to run multiple times
- Uses `ON CONFLICT DO UPDATE` to handle duplicates

## Migration Script Location

`migrate-foundational-courses.sql`

## Next Steps After Migration

1. **Update Checkpoint System** (separate task)
   - Add `module_id` and `lesson_id` columns to checkpoints
   - Migrate checkpoint references
   - Update unlock API to use new structure

2. **Update Frontend** (separate task)
   - Point DreamJob/Mindset UI to new course structure
   - Use course slugs instead of course_type strings

3. **Test Migration**
   - Verify all modules and lessons migrated
   - Check user progress preserved
   - Test course navigation

4. **Deprecate Old System** (future)
   - After confirming new system works, can archive old tables

