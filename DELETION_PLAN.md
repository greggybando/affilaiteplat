# Admin Section Deletion Plan

## Files to DELETE

### 1. Admin Pages (src/app/admin/)
- `src/app/admin/page.tsx` - Admin dashboard homepage
- `src/app/admin/layout.tsx` - Admin layout wrapper
- `src/app/admin/bounties/BountiesClient.tsx`
- `src/app/admin/bounties/page.tsx`
- `src/app/admin/checkpoints/CheckpointsManagementClient.tsx`
- `src/app/admin/checkpoints/page.tsx`
- `src/app/admin/checkpoints/review/CheckpointReviewClient.tsx`
- `src/app/admin/checkpoints/review/page.tsx`
- `src/app/admin/courses/CourseManagementClient.tsx`
- `src/app/admin/courses/page.tsx`
- `src/app/admin/courses/components/AttachmentManager.tsx`
- `src/app/admin/courses-v2/CourseListClient.tsx`
- `src/app/admin/courses-v2/page.tsx`
- `src/app/admin/courses-v2/[courseId]/CourseBuilderClient.tsx`
- `src/app/admin/courses-v2/[courseId]/page.tsx`
- `src/app/admin/pages/page.tsx`
- `src/app/admin/pages/PageCreator.tsx`
- `src/app/admin/payouts/page.tsx`
- `src/app/admin/payouts/PayoutProcessor.tsx`
- `src/app/admin/unlock-rules/page.tsx`
- `src/app/admin/unlock-rules/UnlockRulesManagementClient.tsx`

**Total: 20 files**

---

### 2. Admin-Only API Routes (src/app/api/admin/)

**DELETE these routes (only used by admin pages):**
- `src/app/api/admin/bounties/route.ts`
- `src/app/api/admin/checkpoints/review/route.ts`
- `src/app/api/admin/checkpoints/update-great-unlearning/route.ts`
- `src/app/api/admin/payouts/process/route.ts`
- `src/app/api/admin/pages/route.ts`
- `src/app/api/admin/unlock-rules/route.ts`
- `src/app/api/admin/set-role/route.ts`
- `src/app/api/admin/setup-storage/route.ts`
- `src/app/api/admin/fraud-queue/route.ts` (if exists)
- `src/app/api/admin/fix-video-order/route.ts`
- `src/app/api/admin/add-lifedesign-checkpoint/route.ts`
- `src/app/api/admin/cleanup-duplicates/route.ts`

**KEEP these routes (used by main classroom UI):**
- `src/app/api/admin/courses-v2/route.ts` ✅ - Used by DashboardClient for SkillBank courses
- `src/app/api/admin/courses-v2/[courseId]/sections/route.ts` ✅ - Used by DashboardClient
- `src/app/api/admin/courses-v2/[courseId]/sections/[sectionId]/lessons/route.ts` ✅ - Used by DashboardClient
- `src/app/api/admin/courses-v2/reorder/route.ts` ✅ - Used by DashboardClient
- `src/app/api/admin/courses/reorder/route.ts` ✅ - Used by MindsetModuleList & DreamJobModuleList
- `src/app/api/admin/courses/update/route.ts` ✅ - Used by MindsetModuleList & DreamJobModuleList
- `src/app/api/admin/courses/module/route.ts` ✅ - Used by training page
- `src/app/api/admin/courses/lesson/route.ts` ✅ - Used by training page
- `src/app/api/admin/courses/attachments/route.ts` ✅ - Used by AttachmentManager
- `src/app/api/admin/checkpoints/route.ts` ✅ - Used by MindsetModuleList (line 1141)

**Total API routes to DELETE: ~12 routes**

---

### 3. Navigation Links to Remove

**Files to update:**

1. **src/components/AdminDropdown.tsx**
   - Remove all `/admin/*` links (lines 84-156)
   - Keep only `/community/admin` link if needed
   - Or delete entire component if not needed

2. **src/app/dashboard/DashboardClient.tsx**
   - Remove admin navigation links (lines 910, 1774)
   - Remove redirect to `/admin/courses-v2/${course.id}` (line 1688, 2250)
   - Keep API calls to `/api/admin/courses-v2/*` (these are needed)

3. **src/middleware.ts**
   - Remove `/admin` and `/admin/:path*` from matcher (lines 33, 68)

4. **src/app/dashboard/components/GroupChatTab.tsx**
   - Remove admin link (line 557)

---

## Summary

### Files to DELETE: ~32 files
- 20 admin page files
- ~12 admin-only API route files

### Files to MODIFY: 4 files
- `src/components/AdminDropdown.tsx` - Remove admin links
- `src/app/dashboard/DashboardClient.tsx` - Remove admin navigation
- `src/middleware.ts` - Remove admin routes
- `src/app/dashboard/components/GroupChatTab.tsx` - Remove admin link

### API Routes to KEEP: 10 routes
All routes under `/api/admin/courses-v2/*`, `/api/admin/courses/*`, and `/api/admin/checkpoints` (main route) are used by the main classroom UI.

---

## Confirmation Required

Please confirm:
1. ✅ Delete all admin pages?
2. ✅ Delete admin-only API routes listed above?
3. ✅ Keep API routes used by main classroom UI?
4. ✅ Remove AdminDropdown component entirely, or just remove admin links?

