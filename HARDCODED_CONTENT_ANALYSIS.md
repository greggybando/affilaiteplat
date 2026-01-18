# Hardcoded Content Analysis

## ✅ ROUTING RESTORED

**Fixed:** Mindset and DreamJob courses now route to separate pages:
- `/mindset/content` → Renders `MindsetModuleList` component
- `/dreamjob/content` → Renders `DreamJobModuleList` component

**Changes Made:**
1. Created `src/app/mindset/content/MindsetContentClient.tsx` - Fetches data from API and renders component
2. Created `src/app/dreamjob/content/DreamJobContentClient.tsx` - Fetches data from API and renders component
3. Updated `CourseSelector.tsx` - Changed buttons to `Link` components that navigate to routes
4. Removed `onSelectMindset` and `onSelectDreamJob` props (no longer needed)

---

## ⚠️ HARDCODED CONTENT FOUND

### 1. **Course Slugs** (Hardcoded in multiple places)
- `'mindset'`, `'dream-job'`, `'side-income'` - Hardcoded in:
  - `CourseSelector.tsx` line 37: Filter logic
  - `dynamic-courses-migration.sql` lines 84-88: Database seeds
  - `HARDCODED_CONTENT_SUMMARY.md`: Documentation

**Impact:** If you rename courses in the database, these filters will break.

**Recommendation:** Fetch foundation courses from database instead of hardcoding slugs.

---

### 2. **UI Strings** (Hardcoded in CourseSelector.tsx)
- **Line 47:** `"Building Your Financial Foundation"` - Section title
- **Line 65:** `"Mindset & Foundations"` - Course card title
- **Line 66:** `"Build your mental foundation for success"` - Description
- **Line 89:** `"Get Your Dream Job"` - Course card title
- **Line 91:** `"Land the career you've always wanted"` - Description
- **Line 108:** `"Build Your Side Income"` - Course card title
- **Line 110:** `"grab our done-for-you products & begin printing ASAP!"` - Description
- **Line 130:** `"SkillBank"` - Section title
- **Line 131:** `"Learn the micro-skills you need to continue balling hard IRL"` - Description

**Impact:** These strings are hardcoded and won't update if course titles/descriptions change in the database.

**Recommendation:** Fetch foundation courses from database and use their `title` and `description` fields.

---

### 3. **Emojis & Colors** (Hardcoded in CourseSelector.tsx)
- **Line 64:** `🧠` - Mindset emoji
- **Line 52:** `border-emerald-500` - Mindset border color
- **Line 89:** `💼` - DreamJob emoji
- **Line 77:** `border-cyan-500` - DreamJob border color
- **Line 108:** `💰` - Side Income emoji
- **Line 102:** `border-yellow-500` - Side Income border color

**Impact:** Emojis and colors are hardcoded and won't match database values.

**Recommendation:** Fetch foundation courses from database and use their `emoji` and `color` fields.

---

### 4. **API Route Hardcoded Values**
- `/api/courses/structure/route.ts`:
  - Line 75: `'mindset' | 'lifedesign' | 'dreamjob'` - Hardcoded type union
  - Line 82-83: Checks for `'mindset'` or `'lifedesign'`
  - Line 216: Checks for `'dreamjob'`

- `/api/courses/config/route.ts`:
  - Line 15: Default `'dreamjob'`
  - Line 25: Fallback `courseType === 'mindset'`
  - Line 37: Fallback `courseType === 'lifedesign'`

**Impact:** API routes have hardcoded course type strings.

**Recommendation:** These are less critical since they're backend logic, but could be made more dynamic.

---

### 5. **Database Seed Data** (Hardcoded in SQL files)
- `dynamic-courses-migration.sql` lines 84-88: Seeds foundation courses with hardcoded values
- `seed-courses-migration.sql`: Contains ALL course content (categories, sections, videos)

**Impact:** Initial data is hardcoded, but this is expected for migrations.

**Recommendation:** Keep as-is (migrations need initial data).

---

### 6. **Component Props** (No hardcoded content)
- `MindsetModuleList` and `DreamJobModuleList` fetch data from `/api/courses/structure`
- They use API responses, not hardcoded arrays ✅

---

## 📋 SUMMARY

### ✅ **NOT Hardcoded (Good):**
- Course modules/lessons content - Fetched from API
- Video data - Fetched from API
- Checkpoints - Fetched from API
- User progress - Fetched from API

### ⚠️ **Hardcoded (Needs Fixing):**
1. **Course slugs** in filter logic (`CourseSelector.tsx` line 37)
2. **UI strings** (titles, descriptions) in `CourseSelector.tsx`
3. **Emojis & colors** in `CourseSelector.tsx`
4. **API route type strings** (less critical)

---

## 🔧 RECOMMENDED FIXES

### Priority 1: Make CourseSelector Dynamic
Instead of hardcoding foundation course cards, fetch them from the database:

```typescript
// In CourseSelector.tsx
const foundationCourses = courses.filter(c => 
  ['mindset', 'dream-job', 'side-income'].includes(c.slug)
)

// Then render dynamically:
{foundationCourses.map(course => (
  <Link
    key={course.slug}
    href={course.slug === 'mindset' ? '/mindset/content' : 
          course.slug === 'dream-job' ? '/dreamjob/content' : 
          '/affiliate'}
    // Use course.title, course.description, course.emoji, course.color
  />
))}
```

### Priority 2: Create Route Mapping
Create a mapping function to convert course slugs to routes:

```typescript
function getCourseRoute(slug: string): string {
  const routeMap: Record<string, string> = {
    'mindset': '/mindset/content',
    'dream-job': '/dreamjob/content',
    'side-income': '/affiliate'
  }
  return routeMap[slug] || `/courses/${slug}`
}
```

---

## ✅ CURRENT STATUS

**Routing:** ✅ Fixed - Courses route to separate pages
**Data Fetching:** ✅ Good - Components fetch from API
**Hardcoded Content:** ⚠️ Found in UI strings, emojis, colors, and filter logic

