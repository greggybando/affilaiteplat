# Frontend Migration Plan: Foundational Courses to New Tables

## Files That Need Changes

### 1. **`src/app/api/courses/structure/route.ts`** (PRIMARY FILE)
   - **Current**: Reads from `course_categories` → `course_sections` → `course_videos`
   - **Change**: For foundational courses (mindset/dreamjob), read from `courses` → `course_modules` → `course_lessons`
   - **Keep**: Backward compatibility - check new tables first, fallback to old if not found

### 2. **No changes needed** (these files consume the API and will work automatically):
   - `src/app/dashboard/components/ClassroomTab.tsx` - Already calls `/api/courses/structure`
   - `src/app/mindset/content/MindsetContentClient.tsx` - Already calls `/api/courses/structure`
   - `src/app/dreamjob/content/DreamJobContentClient.tsx` - Already calls `/api/courses/structure`

## Data Mapping

### Old Structure → New Structure

**Mindset:**
- `course_categories` (4 categories) → `course_modules` (4 modules)
- `course_sections` (sections within categories) → Not used (categories become modules directly)
- `course_videos` → `course_lessons`

**DreamJob:**
- `course_categories` (1 category) → `courses` (1 course)
- `course_sections` (sections) → `course_modules` (modules)
- `course_videos` → `course_lessons`

### Response Format Mapping

**Current API Response Format:**
```json
// Mindset
{
  "courseType": "mindset",
  "categories": [
    {
      "id": "category_id",
      "title": "Category Title",
      "isStartHere": false,
      "sections": [
        {
          "id": "section_id",
          "uuid": "section_uuid",
          "number": 1,
          "title": "Section Title",
          "description": "...",
          "videos": [
            {
              "id": "video_id",
              "uuid": "video_uuid",
              "title": "Video Title",
              "youtubeId": "...",
              "loomId": "..."
            }
          ]
        }
      ]
    }
  ]
}

// DreamJob
{
  "modules": [
    {
      "id": "section_id",
      "uuid": "section_uuid",
      "number": 1,
      "title": "Module Title",
      "description": "...",
      "videos": [
        {
          "id": "video_id",
          "title": "Video Title",
          "youtubeId": "..."
        }
      ]
    }
  ]
}
```

**New Table Structure:**
- `courses.slug` = 'mindset' or 'dream-job'
- `course_modules` = modules (for Mindset: categories become modules; for DreamJob: sections become modules)
- `course_lessons.video_url` = YouTube ID or Loom ID
- `course_lessons.video_type` = 'youtube' or 'loom'

## Implementation Strategy

1. **Check if foundational course exists in new tables**:
   - Query `courses` WHERE `slug IN ('mindset', 'dream-job')`
   - If found, use new tables
   - If not found, fallback to old tables (backward compatibility)

2. **For Mindset (new tables)**:
   - Fetch course WHERE slug = 'mindset'
   - Fetch modules WHERE course_id = course.id, ORDER BY sort_order
   - Fetch lessons WHERE module_id IN (module_ids), ORDER BY sort_order
   - Map to format: modules → categories, lessons → videos

3. **For DreamJob (new tables)**:
   - Fetch course WHERE slug = 'dream-job'
   - Fetch modules WHERE course_id = course.id, ORDER BY sort_order
   - Fetch lessons WHERE module_id IN (module_ids), ORDER BY sort_order
   - Map to format: modules → modules array, lessons → videos

4. **Video URL Mapping**:
   - `course_lessons.video_url` contains YouTube ID or Loom ID
   - `course_lessons.video_type` tells us which one ('youtube' or 'loom')
   - Map to: `youtubeId` or `loomId` in response

## Updated Query Logic

```typescript
// Pseudo-code for new logic
if (courseType === 'mindset' || courseType === 'dreamjob') {
  // Check new tables first
  const course = await fetchCourseBySlug(courseType === 'mindset' ? 'mindset' : 'dream-job')
  
  if (course) {
    // Use new tables
    const modules = await fetchModules(course.id)
    const lessons = await fetchLessons(moduleIds)
    
    // Map to old format
    return formatResponse(course, modules, lessons)
  }
}

// Fallback to old tables
return fetchFromOldTables(courseType)
```

