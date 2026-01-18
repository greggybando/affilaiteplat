# Hardcoded Course Content Arrays - Complete Search Results

## Summary
This document lists ALL hardcoded arrays/objects containing course content (courses, modules, lessons, videos) found directly in code files (excluding SQL seed files and database queries).

---

## 1. HARDCODED ARRAYS WITH COURSE CONTENT

### src/app/mindset/forum/ForumClient.tsx

**Line 26-72**: `mockPosts` array containing hardcoded forum posts with course content references

```typescript
const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      name: 'Alex Thompson',
      avatar: null,
      avatarGradient: 'from-violet-500 to-purple-600',
      badge: 'Module 2',
      badgeType: 'module'
    },
    content: 'The "creating space" concept from Operational Foundations completely changed how I approach my day. Instead of filling every minute, I now intentionally leave gaps for reflection and new opportunities.',
    timestamp: '2h ago',
    likes: 24,
    replies: 8,
    liked: false
  },
  {
    id: '2',
    author: {
      name: 'Sarah Chen',
      avatar: null,
      avatarGradient: 'from-emerald-500 to-teal-600',
      badge: 'Module 5',
      badgeType: 'module'
    },
    content: 'Just finished the procrastination destruction system. Already implemented it and my productivity has doubled. The key was understanding that procrastination is just fear in disguise.',
    timestamp: '5h ago',
    likes: 89,
    replies: 23,
    liked: true
  },
  {
    id: '3',
    author: {
      name: 'Marcus Johnson',
      avatar: null,
      avatarGradient: 'from-amber-500 to-orange-600',
      badge: 'Module 3',
      badgeType: 'module'
    },
    content: 'Question: How do you know when you\'ve found your "God-given niche"? I feel like I\'m close but not quite there yet.',
    timestamp: '8h ago',
    likes: 12,
    replies: 15,
    liked: false
  },
]
```

**Hardcoded Course Content References:**
- Line 36: `"Operational Foundations"` - Section title from Mindset course
- Line 51: `"procrastination destruction system"` - Lesson content from Thinking Tools section
- Line 66: `"God-given niche"` - Concept from Operational Foundations section

---

### src/app/dashboard/components/CommunityFeed.tsx

**Line 118**: Hardcoded categories array

```typescript
const categories = ['All', 'Discussion', 'dreamjob questions', 'lifedesign questions', 'make money questions', 'Wins']
```

**Hardcoded Course References:**
- `'dreamjob questions'` - References DreamJob course
- `'lifedesign questions'` - References LifeDesign course

---

## 2. HARDCODED STRING REFERENCES (Not Arrays, but Course Content)

### src/app/admin/checkpoints/CheckpointsManagementClient.tsx

**Line 274-279**: Hardcoded section title check

```typescript
// Find "THE GREAT UNLEARNING" section to show quick update button
s.title === 'THE GREAT UNLEARNING' || s.title.includes('GREAT UNLEARNING')
```

**Hardcoded Value:** `'THE GREAT UNLEARNING'` - DreamJob module title

---

### src/app/api/admin/checkpoints/update-great-unlearning/route.ts

**Line 33, 43, 59**: Hardcoded section title references

```typescript
// Find "THE GREAT UNLEARNING" section (section_id = 2)
{ error: 'THE GREAT UNLEARNING section not found', details: secError?.message },
{ error: 'Checkpoint not found for THE GREAT UNLEARNING section', details: cpError?.message },
```

**Hardcoded Value:** `'THE GREAT UNLEARNING'` - DreamJob module title

---

### src/app/api/admin/add-lifedesign-checkpoint/route.ts

**Line 15, 19**: Hardcoded section title

```typescript
// Find The Life Design Process section
.eq('title', 'The Life Design Process')
```

**Hardcoded Value:** `'The Life Design Process'` - LifeDesign section title

---

### src/app/api/debug/checkpoints-by-course/route.ts

**Line 74-75**: Hardcoded section title

```typescript
// Find Life Design Process section specifically
const lifeDesignSection = sections.find((s: any) => s.title === 'The Life Design Process')
```

**Hardcoded Value:** `'The Life Design Process'` - LifeDesign section title

---

### src/app/api/admin/fix-video-order/route.ts

**Line 7, 24, 28**: Hardcoded section title

```typescript
// Fix video order for Life Design Process section
// Find the "Life Design Process" section
.eq('title', 'The Life Design Process')
```

**Hardcoded Value:** `'The Life Design Process'` - LifeDesign section title

---

### src/app/api/debug/add-video-checkpoint/route.ts

**Line 6, 9, 24, 29**: Hardcoded section title

```typescript
// Debug endpoint to add a video checkpoint for Life Design Process first video
// Find The Life Design Process section
s.category_id === lifeDesignCat.id && s.title === 'The Life Design Process'
{ error: 'The Life Design Process section not found', }
```

**Hardcoded Value:** `'The Life Design Process'` - LifeDesign section title

---

### scripts/update-great-unlearning.js

**Line 32-33, 42, 56**: Hardcoded section title

```javascript
console.log('Finding THE GREAT UNLEARNING section...')
// Find "THE GREAT UNLEARNING" section (section_id = 2)
console.error('THE GREAT UNLEARNING section not found:', secError)
console.error('Checkpoint not found for THE GREAT UNLEARNING section:', cpError)
```

**Hardcoded Value:** `'THE GREAT UNLEARNING'` - DreamJob module title

---

## 3. FILES WITH NO HARDCODED COURSE ARRAYS

The following files were checked but contain NO hardcoded course content arrays:
- `src/app/dashboard/DashboardClient.tsx` - Contains `mockPosts` but they are forum posts, not course content
- `src/app/mindset/components/MindsetModuleList.tsx` - Uses database-fetched data
- `src/app/dreamjob/components/DreamJobModuleList.tsx` - Uses database-fetched data
- `src/app/admin/courses-v2/[courseId]/CourseBuilderClient.tsx` - Uses database-fetched data
- All API routes - Only contain database queries, no hardcoded arrays

---

## SUMMARY

### Total Hardcoded Arrays Found: 2

1. **src/app/mindset/forum/ForumClient.tsx** (Line 26-72)
   - `mockPosts` array with 3 forum posts
   - Contains references to: "Operational Foundations", "procrastination destruction system", "God-given niche"

2. **src/app/dashboard/components/CommunityFeed.tsx** (Line 118)
   - `categories` array with course-related category names
   - Contains: `'dreamjob questions'`, `'lifedesign questions'`

### Hardcoded String References: 7 files

Files that check for specific hardcoded course titles (not arrays, but hardcoded values):
- `src/app/admin/checkpoints/CheckpointsManagementClient.tsx` - Checks for "THE GREAT UNLEARNING"
- `src/app/api/admin/checkpoints/update-great-unlearning/route.ts` - References "THE GREAT UNLEARNING"
- `src/app/api/admin/add-lifedesign-checkpoint/route.ts` - References "The Life Design Process"
- `src/app/api/debug/checkpoints-by-course/route.ts` - References "The Life Design Process"
- `src/app/api/admin/fix-video-order/route.ts` - References "The Life Design Process"
- `src/app/api/debug/add-video-checkpoint/route.ts` - References "The Life Design Process"
- `scripts/update-great-unlearning.js` - References "THE GREAT UNLEARNING"

---

## NOTES

- **SQL seed files** (`seed-courses-migration.sql`, `dynamic-courses-migration.sql`) contain hardcoded course content but are database migrations, not runtime code
- **Database queries** that fetch course content are NOT considered hardcoded arrays
- **Mock data** for forum posts contains course content references but is demo/test data
- Most course content is properly fetched from the database via API routes

