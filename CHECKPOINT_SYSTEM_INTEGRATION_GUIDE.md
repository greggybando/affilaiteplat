# Checkpoint System - Integration Guide

## ✅ COMPLETED COMPONENTS

### Backend (100% Complete)
- ✅ Database migration (`checkpoint-system-migration.sql`)
- ✅ All API routes (AI review, submission, admin CRUD, unlock rules)
- ✅ Admin UI pages (checkpoint management, unlock rules, review queue)
- ✅ User-facing checkpoint submission component (`CheckpointSubmission.tsx`)

### Files Created:
1. `checkpoint-system-migration.sql` - Database schema
2. `src/app/api/checkpoints/ai-review/route.ts` - AI auto-review
3. `src/app/api/checkpoints/submit/route.ts` - User submission
4. `src/app/api/user/unlocks/route.ts` - Unlock status checks
5. `src/app/api/admin/checkpoints/route.ts` - Checkpoint CRUD
6. `src/app/api/admin/checkpoints/review/route.ts` - Review queue
7. `src/app/api/admin/unlock-rules/route.ts` - Unlock rules CRUD
8. `src/app/admin/checkpoints/page.tsx` + `CheckpointsManagementClient.tsx`
9. `src/app/admin/unlock-rules/page.tsx` + `UnlockRulesManagementClient.tsx`
10. `src/app/admin/checkpoints/review/page.tsx` + `CheckpointReviewClient.tsx`
11. `src/components/CheckpointSubmission.tsx` - User submission form

## 🔧 INTEGRATION STEPS

### Step 1: Add Unlock Status to Course UI

**File:** `src/app/mindset/components/MindsetModuleList.tsx`

Add unlock status fetching:
```typescript
// Add to component state
const [unlockStatus, setUnlockStatus] = useState<Record<string, boolean>>({})
const [checkpointStatus, setCheckpointStatus] = useState<Record<string, string>>({})

// Fetch unlock status on mount
useEffect(() => {
  const fetchUnlockStatus = async () => {
    const res = await fetch(`/api/user/unlocks?courseType=mindset`)
    const data = await res.json()
    if (data.sections) {
      const unlocks: Record<string, boolean> = {}
      const checkpoints: Record<string, string> = {}
      data.sections.forEach((s: any) => {
        unlocks[s.id] = s.unlocked
        if (s.checkpointId) {
          checkpoints[s.checkpointId] = s.checkpointStatus
        }
      })
      setUnlockStatus(unlocks)
      setCheckpointStatus(checkpoints)
    }
  }
  fetchUnlockStatus()
}, [])
```

### Step 2: Show Lock Icons on Locked Sections

**File:** `src/app/mindset/components/MindsetModuleList.tsx`

In `SortableSectionItem`, add lock icon:
```typescript
import { Lock } from 'lucide-react'

// In section header, add:
{!unlockStatus[section.id] && (
  <Lock className="w-4 h-4 text-slate-500" />
)}
```

### Step 3: Add Checkpoint Status Badges

**File:** `src/app/mindset/components/MindsetModuleList.tsx`

Add checkpoint status display:
```typescript
// Get checkpoint for this section
const checkpoint = checkpoints?.find(cp => cp.section_id === section.id)
const checkpointStatus = checkpoint ? checkpointStatus[checkpoint.id] : null

// Add badge after section title:
{checkpoint && (
  <div className="text-[10px] mt-1">
    {checkpointStatus === 'approved' && (
      <span className="text-green-400">✓ Approved</span>
    )}
    {checkpointStatus === 'denied' && (
      <span className="text-red-400">✗ Denied</span>
    )}
    {checkpointStatus === 'needs_review' && (
      <span className="text-yellow-400">⏳ Reviewing</span>
    )}
    {checkpointStatus === 'not_started' && (
      <span className="text-slate-500">○ Not Started</span>
    )}
  </div>
)}
```

### Step 4: Add Checkpoint Submission to Right Panel

**File:** `src/app/mindset/components/MindsetModuleList.tsx`

In the right content area, add checkpoint submission:
```typescript
import { CheckpointSubmission } from '@/components/CheckpointSubmission'

// After video player, add:
{selectedVideo && (
  // Get section for selected video
  const section = /* find section containing selectedVideo */
  const checkpoint = checkpoints?.find(cp => cp.section_id === section.id)
  
  {checkpoint && (
    <div className="mt-6">
      <CheckpointSubmission
        checkpointId={checkpoint.id}
        checkpointTitle={checkpoint.title}
        requirements={checkpoint.requirements}
        onSuccess={() => {
          // Reload unlock status
          fetchUnlockStatus()
        }}
      />
    </div>
  )}
)}
```

### Step 5: Show Progress Bar

**File:** `src/app/mindset/components/MindsetModuleList.tsx`

Add progress display:
```typescript
// Get progress from unlock status API
const progress = data.progress // { completed: 3, total: 6 }

// Display in header:
<div className="mb-4">
  <div className="text-sm text-slate-400 mb-2">
    Progress: {progress.completed}/{progress.total} Sections
  </div>
  <div className="w-full bg-slate-800 rounded-full h-2">
    <div
      className="bg-cyan-500 h-2 rounded-full transition-all"
      style={{ width: `${(progress.completed / progress.total) * 100}%` }}
    />
  </div>
</div>
```

## 📝 NOTES

### Lock-In Integration
- The `lockin_id` field is ready in `user_checkpoints` table
- When lock-in system is built, add logic in lock-in submission to:
  1. Ask user: "Submit this toward your section checkpoint?"
  2. If yes, call `/api/checkpoints/submit` with `lockinId` parameter
  3. Same AI review process applies

### Performance
- Unlock status is cached per user per course
- Database functions handle unlock checks efficiently
- Consider adding Redis cache for high-traffic scenarios

### Testing Checklist
- [ ] Create checkpoint for a section via admin
- [ ] Set unlock rule (e.g., Section B unlocks after Section A checkpoint)
- [ ] User submits checkpoint
- [ ] AI auto-approves/denies
- [ ] Admin reviews "needs_review" submissions
- [ ] Next section unlocks after approval
- [ ] Progress bar updates correctly

## 🚀 DEPLOYMENT

1. ✅ SQL migration run in Supabase
2. ⏳ Deploy API routes (already created)
3. ⏳ Deploy admin pages (already created)
4. ⏳ Integrate into course UI (steps above)
5. ⏳ Test end-to-end flow

