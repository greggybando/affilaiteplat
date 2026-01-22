# Frontend Migration Summary: Foundational Courses

## ✅ Changes Made

### File Updated: `src/app/api/courses/structure/route.ts`

**What Changed:**
1. Added `fetchFromNewTables()` function that reads from new tables (`courses`, `course_modules`, `course_lessons`)
2. Modified `GET()` function to check new tables first for foundational courses, then fallback to old tables
3. Maintains backward compatibility - if new tables don't have data, uses old tables

**How It Works:**
1. When `courseType` is 'mindset', 'lifedesign', or 'dreamjob':
   - First tries to fetch from new tables (`courses` → `course_modules` → `course_lessons`)
   - If found, returns data in same format as old API
   - If not found, falls back to old tables (`course_categories` → `course_sections` → `course_videos`)

**Data Mapping:**
- **Mindset**: 
  - `course_modules` → categories (each module becomes a category)
  - Each category has 1 section containing all lessons
  - `course_lessons` → videos
  
- **DreamJob**:
  - `course_modules` → modules array
  - `course_lessons` → videos

**Video ID Extraction:**
- Extracts video ID from lesson slug (format: "title-video_id")
- Looks for pattern "-v" followed by video ID (e.g., "v0-1", "v1-1")
- Falls back to last part of slug if pattern not found

**Video URL Mapping:**
- `course_lessons.video_type` = 'youtube' → maps to `youtubeId`
- `course_lessons.video_type` = 'loom' → maps to `loomId`
- `course_lessons.video_url` contains the actual ID

## ✅ Files That DON'T Need Changes

These files automatically work because they consume `/api/courses/structure`:
- `src/app/dashboard/components/ClassroomTab.tsx`
- `src/app/mindset/content/MindsetContentClient.tsx`
- `src/app/dreamjob/content/DreamJobContentClient.tsx`

## 🧪 Testing Checklist

- [ ] Mindset course loads with all modules/categories
- [ ] DreamJob course loads with all modules
- [ ] Video URLs work (YouTube and Loom)
- [ ] Lesson content displays correctly
- [ ] User can navigate between lessons
- [ ] Response format matches old API format exactly
- [ ] Fallback to old tables works if new tables don't have data

## 📝 Notes

- **Backward Compatible**: If new tables don't have data, automatically falls back to old tables
- **Same Response Format**: Returns data in exact same format as old API, so UI doesn't need changes
- **Video IDs**: Extracted from lesson slugs (format: "title-video_id")
- **Section Structure**: For Mindset, each module (category) has 1 section containing all its lessons

