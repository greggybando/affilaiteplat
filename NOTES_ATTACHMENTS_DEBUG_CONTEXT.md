# Notes & Attachments Not Showing for Normal Users - Debug Context

## Problem Summary
- **Issue**: Admins can save notes and upload attachments for SkillBank course lessons, and they appear correctly in the admin view. However, normal (non-admin) users cannot see these notes or attachments.
- **Status**: Notes/attachments save successfully (visible to admins), but don't display for normal users.

## Architecture Overview

### Data Flow
1. **Admin saves notes**: `SkillBankCourseView.tsx` → `PUT /api/courses-v2/lesson-notes` → `lesson_notes` table
2. **Admin uploads attachments**: `SkillBankCourseView.tsx` → `POST /api/courses-v2/lesson-attachments` → `course_attachments` table
3. **Normal user views**: `SkillBankCourseView.tsx` → `GET /api/courses-v2/lesson-notes` + `GET /api/courses-v2/lesson-attachments` → Should display notes/attachments

### Key Components
- **Admin View**: `src/app/dashboard/components/classroom/SkillBankCourseView.tsx` (same component, `isAdmin=true`)
- **Normal User View**: Same component (`isAdmin=false`) OR `src/app/courses/[slug]/CourseDetailClient.tsx` (different route)
- **API Routes**: 
  - `src/app/api/courses-v2/lesson-notes/route.ts`
  - `src/app/api/courses-v2/lesson-attachments/route.ts`

## What We've Fixed So Far

1. ✅ Added authentication requirement to GET endpoints (both notes and attachments)
2. ✅ Added `credentials: 'include'` to all fetch calls
3. ✅ Added comprehensive logging throughout
4. ✅ Fixed Notes section rendering logic to always show when lesson is selected
5. ✅ Changed `.single()` to `.maybeSingle()` to handle missing notes gracefully

## Current Code State

### API Endpoints

**`/api/courses-v2/lesson-notes` GET:**
- Requires authentication (all authenticated users)
- Uses `supabaseAdmin` to query `lesson_notes` table
- Returns `{ notes: string, updatedAt: string | null }`
- Has logging: `[lesson-notes GET] Fetched notes: { lessonId, hasNote, notesLength, affiliateId }`

**`/api/courses-v2/lesson-attachments` GET:**
- Requires authentication (all authenticated users)
- Uses `supabaseAdmin` to query `course_attachments` table
- Returns `{ attachments: array }`
- Has logging: `[lesson-attachments GET] Found attachments: { lessonId, count }`

### Client-Side Loading

**`SkillBankCourseView.tsx` - `loadNotes()`:**
```typescript
const loadNotes = async () => {
  if (!selectedLesson) return
  console.log('[SkillBankCourseView] Loading notes for lesson:', selectedLesson.id)
  const res = await fetch(`/api/courses-v2/lesson-notes?lessonId=${selectedLesson.id}`, {
    credentials: 'include'
  })
  // ... handles response and sets state
}
```

**`SkillBankCourseView.tsx` - `loadLessonAttachments()`:**
```typescript
const loadLessonAttachments = async () => {
  if (!selectedLesson) return
  console.log('[SkillBankCourseView] Loading attachments for lesson:', selectedLesson.id)
  const res = await fetch(`/api/courses-v2/lesson-attachments?lessonId=${selectedLesson.id}`, {
    credentials: 'include'
  })
  // ... handles response and sets state
}
```

### Rendering Logic

**Notes Section** (lines 1482-1592):
- Always renders when `selectedLesson` exists
- Shows "No notes available" if empty
- For normal users: shows read-only div with notes content
- Has debug logging: `[SkillBankCourseView] Notes section render: { lessonId, hasNotes, notesLength, isExpanded, shouldAutoExpand, isAdmin }`

**Attachments Section** (lines 1594-1663):
- Always renders when `selectedLesson` exists
- Shows "No course materials available" if empty
- Maps through `lessonAttachments` array
- Has debug logging: `[SkillBankCourseView] Attachments section render: { lessonId, attachmentsCount, attachments }`

## Database Schema

**`lesson_notes` table:**
- `id` (UUID, primary key)
- `lesson_id` (UUID, foreign key to `course_lessons.id`, UNIQUE)
- `notes` (TEXT)
- `created_by` (UUID, foreign key to `affiliates.id`)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**`course_attachments` table:**
- `id` (UUID, primary key)
- `lesson_id` (UUID, foreign key to `course_lessons.id`)
- `title` (text)
- `file_url` (text)
- `file_name` (text)
- `display_name` (text, nullable)
- `file_type` (text)
- `file_size` (integer)
- `sort_order` (integer)
- `created_at` (timestamp)

## Debugging Checklist

### 1. Check Browser Console
Look for logs starting with:
- `[SkillBankCourseView] Loading notes for lesson:`
- `[SkillBankCourseView] Notes loaded:`
- `[SkillBankCourseView] Loading attachments for lesson:`
- `[SkillBankCourseView] Attachments loaded:`
- `[SkillBankCourseView] Notes section render:`
- `[SkillBankCourseView] Attachments section render:`

### 2. Check Network Tab
Filter for:
- `lesson-notes` - Check request/response
- `lesson-attachments` - Check request/response

**What to verify:**
- Are requests being made? (Status: pending/success/failed)
- What status codes? (200 = success, 401 = auth error, 404 = not found, 500 = server error)
- What's in the response body?
- Are `lessonId` values matching between save and load?

### 3. Verify Lesson IDs Match
**Critical**: The `lessonId` used when admin saves must match the `lessonId` used when normal user loads.

**Check:**
- When admin saves notes: What `lessonId` is logged?
- When normal user loads: What `lessonId` is logged?
- Do they match?

### 4. Check Authentication
- Are normal users authenticated? (Check if `getCurrentAffiliate()` returns a user)
- Are cookies being sent? (Check Network tab → Request Headers → Cookie)

### 5. Check Database
- Do notes/attachments exist in the database for the lesson?
- Query: `SELECT * FROM lesson_notes WHERE lesson_id = '<lesson-id>'`
- Query: `SELECT * FROM course_attachments WHERE lesson_id = '<lesson-id>'`

## Potential Issues to Investigate

1. **Lesson ID Mismatch**: Admin saves with one `lessonId`, normal user loads with different `lessonId`
2. **Authentication Failure**: Normal users not authenticated, causing 401 errors
3. **Database Query Issue**: Notes/attachments exist but query isn't finding them
4. **State Not Updating**: Data loads but React state doesn't update
5. **Rendering Issue**: Data in state but UI doesn't render it
6. **Different Component**: Normal users might be using `CourseDetailClient.tsx` instead of `SkillBankCourseView.tsx`

## Key Files to Check

1. `src/app/dashboard/components/classroom/SkillBankCourseView.tsx` - Main component
2. `src/app/courses/[slug]/CourseDetailClient.tsx` - Alternative route for normal users?
3. `src/app/api/courses-v2/lesson-notes/route.ts` - Notes API
4. `src/app/api/courses-v2/lesson-attachments/route.ts` - Attachments API
5. `src/lib/auth.ts` - Authentication helper (`getCurrentAffiliate`)

## Next Steps

1. **Get console logs** from normal user session
2. **Get network requests** from normal user session
3. **Verify lesson IDs** match between admin save and normal user load
4. **Check if normal users use different component** (`CourseDetailClient.tsx` vs `SkillBankCourseView.tsx`)
5. **Verify database** has the data for the correct lesson IDs

## Questions to Answer

1. Are the API calls being made? (Check Network tab)
2. What status codes are returned? (200, 401, 404, 500?)
3. What data is in the response? (Empty array? Error message?)
4. What `lessonId` values are being used? (Do they match?)
5. Are normal users authenticated? (Check `getCurrentAffiliate()`)
6. Which component are normal users using? (`SkillBankCourseView` or `CourseDetailClient`?)

