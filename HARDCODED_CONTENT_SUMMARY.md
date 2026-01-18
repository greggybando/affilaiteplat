# Hardcoded Course Content - Copy-Paste Summary

## 1. HARDCODED COURSE SLUGS

### DashboardClient.tsx (Line 2185)
```typescript
allCourses.filter(c => !['mindset', 'dream-job', 'side-income'].includes(c.slug))
```
**Location**: Filters out 3 core courses from SkillBank display
**Hardcoded Values**: `'mindset'`, `'dream-job'`, `'side-income'`

---

## 2. HARDCODED UI STRINGS

### DashboardClient.tsx - Section Headers

**Line 2098**: Main section title
```
"Building Your Financial Foundation"
```

**Line 2112**: Course card title
```
"Mindset & Foundations"
```

**Line 2131**: Course card title
```
"Get Your Dream Job"
```

**Line 2150**: Course card title
```
"Build Your Side Income"
```

**Line 2165**: SkillBank section title
```
"SkillBank"
```

**Line 2167**: SkillBank description
```
"Learn the micro-skills you need to continue balling hard IRL"
```

**Line 2114**: Course description
```
"Build your mental foundation for success"
```

**Line 2133**: Course description
```
"Land the career you've always wanted"
```

**Line 2152**: Course description
```
"grab our done-for-you products & begin printing ASAP!"
```

**Line 2345**: Hardcoded progress text
```
"Complete all 8 modules to master the Dream Job method"
```

---

## 3. HARDCODED COURSE TYPE STRINGS

### DashboardClient.tsx (Line 1282)
```typescript
const [selectedWorld, setSelectedWorld] = useState<'mindset' | 'dreamjob' | 'affiliate' | null>(null)
```
**Hardcoded Types**: `'mindset'`, `'dreamjob'`, `'affiliate'`

### DashboardClient.tsx (Lines 1616, 1625)
```typescript
const mindsetRes = await fetch('/api/courses/structure?courseType=mindset')
const dreamJobRes = await fetch('/api/courses/structure?courseType=dreamjob')
```
**Hardcoded API Calls**: `'mindset'`, `'dreamjob'`

### DashboardClient.tsx (Lines 2104, 2123)
```typescript
onClick={() => setSelectedWorld('mindset')}
onClick={() => setSelectedWorld('dreamjob')}
```
**Hardcoded Click Handlers**: `'mindset'`, `'dreamjob'`

### DashboardClient.tsx (Lines 2303, 2338, 2389)
```typescript
selectedWorld === 'mindset' ? (
selectedWorld === 'dreamjob' ? (
selectedWorld === 'affiliate' ? (
```
**Hardcoded Conditionals**: `'mindset'`, `'dreamjob'`, `'affiliate'`

### DashboardClient.tsx (Lines 2326, 2377)
```typescript
const res = await fetch('/api/courses/structure?courseType=mindset')
const res = await fetch('/api/courses/structure?courseType=dreamjob')
```
**Hardcoded Refetch Calls**: `'mindset'`, `'dreamjob'`

---

## 4. API ROUTE HARDCODED VALUES

### /api/courses/structure/route.ts (Line 75)
```typescript
const courseType = searchParams.get('courseType') as 'mindset' | 'lifedesign' | 'dreamjob' | null
```
**Hardcoded Type**: `'mindset' | 'lifedesign' | 'dreamjob'`

### /api/courses/structure/route.ts (Lines 82-83)
```typescript
const isMindsetWorld = courseType === 'mindset' || courseType === 'lifedesign'
const courseTypesToFetch = isMindsetWorld ? ['mindset'] : [courseType]
```
**Hardcoded Logic**: Checks for `'mindset'` or `'lifedesign'`

### /api/courses/structure/route.ts (Line 216)
```typescript
if (courseType === 'dreamjob' && categoriesWithSections.length > 0) {
```
**Hardcoded Conditional**: `'dreamjob'`

### /api/courses/config/route.ts (Line 15)
```typescript
let courseType = request.nextUrl.searchParams.get('course') || 'dreamjob'
```
**Hardcoded Default**: `'dreamjob'`

### /api/courses/config/route.ts (Lines 25, 37)
```typescript
if (!category && courseType === 'mindset') {
if (!category && courseType === 'lifedesign') {
```
**Hardcoded Fallbacks**: `'mindset'`, `'lifedesign'`

---

## 5. HARDCODED EMOJIS AND COLORS

### DashboardClient.tsx (Line 2111)
```
🧠
```

### DashboardClient.tsx (Line 2130)
```
💼
```

### DashboardClient.tsx (Line 2149)
```
💰
```

### DashboardClient.tsx (Line 2105)
```typescript
border-emerald-500
```

### DashboardClient.tsx (Line 2124)
```typescript
border-cyan-500
```

### DashboardClient.tsx (Line 2143)
```typescript
border-yellow-500
```

---

## 6. DATABASE SEED DATA (Hardcoded in SQL Files)

### dynamic-courses-migration.sql (Lines 84-88)
```sql
INSERT INTO courses (slug, title, emoji, description, color, sort_order) VALUES
('mindset', 'Mindset & Foundations', '🧠', 'Rewire your brain. Kill limiting beliefs. Become unstoppable.', 'purple', 1),
('dream-job', 'Get Your Dream Job', '💼', 'Stop applying to 100 jobs. Land the ONE you actually want.', 'cyan', 2),
('side-income', 'Build Your Side Income', '💰', 'Create passive income streams through our affiliate system.', 'green', 3)
```

### seed-courses-migration.sql
**Contains ALL hardcoded course content:**
- Mindset categories (lines 23-27)
- Mindset sections and videos (lines 58-278)
- DreamJob sections and videos (lines 303-456)
- All video titles, YouTube IDs, Loom IDs

---

## 7. COMPONENT IMPORTS (Hardcoded Dependencies)

### DashboardClient.tsx (Lines 15-16)
```typescript
import { MindsetModuleList } from '../mindset/components/MindsetModuleList'
import { DreamJobModuleList } from '../dreamjob/components/DreamJobModuleList'
```
**Hardcoded Components**: Specific components for `mindset` and `dreamjob` courses

---

## SUMMARY BY FILE

### src/app/dashboard/DashboardClient.tsx
- **Line 15-16**: Hardcoded component imports
- **Line 1282**: Hardcoded TypeScript union type
- **Line 1616**: Hardcoded API call with `'mindset'`
- **Line 1625**: Hardcoded API call with `'dreamjob'`
- **Line 2098**: Hardcoded title "Building Your Financial Foundation"
- **Line 2104**: Hardcoded `setSelectedWorld('mindset')`
- **Line 2111**: Hardcoded emoji 🧠
- **Line 2112**: Hardcoded title "Mindset & Foundations"
- **Line 2114**: Hardcoded description
- **Line 2123**: Hardcoded `setSelectedWorld('dreamjob')`
- **Line 2130**: Hardcoded emoji 💼
- **Line 2131**: Hardcoded title "Get Your Dream Job"
- **Line 2133**: Hardcoded description
- **Line 2149**: Hardcoded emoji 💰
- **Line 2150**: Hardcoded title "Build Your Side Income"
- **Line 2152**: Hardcoded description
- **Line 2165**: Hardcoded title "SkillBank"
- **Line 2167**: Hardcoded description
- **Line 2185**: Hardcoded slug filter `['mindset', 'dream-job', 'side-income']`
- **Line 2303**: Hardcoded conditional `selectedWorld === 'mindset'`
- **Line 2326**: Hardcoded API call `'mindset'`
- **Line 2338**: Hardcoded conditional `selectedWorld === 'dreamjob'`
- **Line 2345**: Hardcoded text "Complete all 8 modules..."
- **Line 2377**: Hardcoded API call `'dreamjob'`
- **Line 2389**: Hardcoded conditional `selectedWorld === 'affiliate'`

### src/app/api/courses/structure/route.ts
- **Line 75**: Hardcoded type `'mindset' | 'lifedesign' | 'dreamjob'`
- **Line 82-83**: Hardcoded logic checking for `'mindset'` or `'lifedesign'`
- **Line 216**: Hardcoded conditional `courseType === 'dreamjob'`

### src/app/api/courses/config/route.ts
- **Line 15**: Hardcoded default `'dreamjob'`
- **Line 25**: Hardcoded fallback `courseType === 'mindset'`
- **Line 37**: Hardcoded fallback `courseType === 'lifedesign'`

### dynamic-courses-migration.sql
- **Lines 84-88**: Hardcoded course seeds with slugs, titles, emojis, descriptions, colors

### seed-courses-migration.sql
- **Entire file**: All course content (categories, sections, videos) hardcoded

---

## TOTAL COUNT

- **Hardcoded Slugs**: 3 (`mindset`, `dream-job`, `side-income`)
- **Hardcoded UI Strings**: 10+ titles and descriptions
- **Hardcoded Course Types**: 3 (`mindset`, `dreamjob`, `affiliate`)
- **Hardcoded API Calls**: 4+ instances
- **Hardcoded Emojis**: 3 (🧠, 💼, 💰)
- **Hardcoded Colors**: 3 (emerald, cyan, yellow)
- **Hardcoded SQL Seeds**: 2 files with all course content

