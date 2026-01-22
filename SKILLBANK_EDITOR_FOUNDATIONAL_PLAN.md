# Enable Skillbank Editor for Foundational Courses

## Current State

### Filters Preventing Foundational Courses:

1. **`CourseSelector.tsx` line 62**:
   ```typescript
   const skillbankCourses = courses.filter(c => !['mindset', 'dream-job', 'side-income'].includes(c.slug))
   ```
   - Filters out foundational courses from SkillBank section

2. **`ClassroomTab.tsx` lines 889-891**:
   ```typescript
   const foundationSlugs = ['mindset', 'dream-job', 'side-income']
   const isSkillBankCourse = !foundationSlugs.includes(selectedCourse.slug)
   ```
   - Prevents foundational courses from using `SkillBankCourseView`

### Current Flow:
- Foundational courses: Click button → `selectedWorld` → Old UI (MindsetModuleList/DreamJobModuleList)
- SkillBank courses: Click card → `selectedCourse` → `SkillBankCourseView`

## Changes Needed

### 1. Update `CourseSelector.tsx`
- **Option A**: Add foundational courses to SkillBank section (simpler)
- **Option B**: Create separate "Foundational" section with course cards (more organized)

**Decision**: Option A - Add foundational courses to SkillBank section with a label

### 2. Update `ClassroomTab.tsx`
- Remove filter that prevents foundational courses from using `SkillBankCourseView`
- Allow `selectedCourse` (not just `selectedWorld`) to work for foundational courses

## Implementation Plan

1. **Update CourseSelector.tsx**:
   - Remove filter on line 62
   - Add foundational courses to SkillBank section
   - Maybe add a visual indicator (badge/label) for foundational courses

2. **Update ClassroomTab.tsx**:
   - Remove the check on lines 889-891
   - Allow all courses (including foundational) to use `SkillBankCourseView`
   - Keep `selectedWorld` logic for backward compatibility (if someone clicks the old buttons)

3. **Verify**:
   - Mindset course appears in SkillBank section
   - DreamJob course appears in SkillBank section
   - Clicking them opens `SkillBankCourseView`
   - Admin can edit modules, lessons, video URLs
   - All editing features work

