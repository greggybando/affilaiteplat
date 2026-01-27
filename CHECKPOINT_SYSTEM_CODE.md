# Checkpoint System Code Overview

## Architecture

The checkpoint system has two main flows:
1. **Checkpoint Submission** - Users submit checkpoints, AI reviews them, status is saved
2. **Unlock Logic** - Determines which modules are locked/unlocked based on checkpoint approval

---

## 1. Checkpoint Submission Flow

### Frontend Component: `CheckpointSubmission.tsx`

**Location:** `src/components/CheckpointSubmission.tsx`

**Key Features:**
- User enters submission text (min 50 chars)
- Optional screenshot upload
- Calls `/api/checkpoints/submit/${checkpointId}` on submit
- Shows status: `approved`, `denied`, `needs_review`, `pending`
- Calls `onSuccess` callback immediately after submission

**Key Code:**
```typescript
const res = await fetch(`/api/checkpoints/submit/${checkpointId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    submission_text: submissionText.trim(),
    screenshot_url: screenshotUrl || null
  })
})

// Update status IMMEDIATELY
setSubmissionStatus(data.status)

// Call onSuccess callback IMMEDIATELY to refresh unlock status
if (onSuccess) {
  onSuccess(data.status)
}
```

---

### API Endpoint: `/api/checkpoints/submit/[checkpointId]/route.ts`

**Location:** `src/app/api/checkpoints/submit/[checkpointId]/route.ts`

**Flow:**
1. Validates submission (min 50 chars)
2. Gets checkpoint details from database
3. Creates/updates `user_checkpoints` entry:
   - If `requires_manual_review = true` → status = `needs_review`
   - Otherwise → status = `pending`
4. If `ai_review_enabled = true`:
   - Calls Claude Vision API with submission text + screenshot
   - Parses AI response (approved/denied/needs_review)
   - Updates `user_checkpoints` with AI results
   - Returns status immediately
5. If AI review not enabled → returns `pending` status

**Status Values:**
- `approved` - Checkpoint passed, unlocks next module
- `denied` - Checkpoint failed, user can resubmit
- `needs_review` - Requires manual admin review
- `pending` - Awaiting review

**Key Code:**
```typescript
// Create/update user_checkpoint entry
const { data: newSubmission } = await supabaseAdmin
  .from('user_checkpoints')
  .insert({
    user_id: affiliate.id,
    checkpoint_id: params.checkpointId,
    submission_text: submission_text.trim(),
    screenshot_url: screenshot_url || null,
    status: initialStatus // 'pending' or 'needs_review'
  })

// If AI review enabled, call Claude API
if (checkpointData.ai_review_enabled) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [/* prompt with submission text + screenshot */]
  })
  
  // Parse AI response and update status
  await supabaseAdmin
    .from('user_checkpoints')
    .update({
      status: finalStatus, // 'approved', 'denied', or 'needs_review'
      ai_review_passed: finalStatus === 'approved',
      ai_review_notes: aiResult.reason,
      ai_confidence: aiResult.confidence
    })
}
```

---

## 2. Unlock Logic Flow

### API Endpoint: `/api/courses/[courseId]/unlock-status/route.ts`

**Location:** `src/app/api/courses/[courseId]/unlock-status/route.ts`

**Purpose:** Determines which modules are locked/unlocked for a user

**Flow:**
1. Gets course info (including `globally_unlocked` flag)
2. Gets all modules for course (ordered by `sort_order`)
3. Gets user-specific unlocks (`user_course_unlocks`, `user_module_unlocks`)
4. Gets all checkpoints for modules
5. Gets user checkpoint statuses (`user_checkpoints`)
6. For each module, determines lock status based on priority:

**Unlock Priority (in order):**
1. **Course `globally_unlocked = true`** → All modules unlocked
2. **Module `globally_unlocked = false`** → Module locked (admin locked it)
3. **Module `globally_unlocked = true`** → Module unlocked (admin unlocked it)
4. **User-specific unlock** → Module unlocked for this user
5. **First module** (`sort_order = 0`) → Always unlocked
6. **Explicit unlock rule** → Check if required checkpoint is approved
7. **Sequential logic** → Find previous module with checkpoint, check if approved

**Sequential Unlock Logic:**
```typescript
// Find the previous section that HAS a checkpoint
for (let i = index - 1; i >= 0; i--) {
  const prevModule = modules[i]
  const prevCheckpoint = checkpointMap.get(prevModule.id)
  if (prevCheckpoint) {
    previousCheckpointSection = prevModule
    previousCheckpoint = prevCheckpoint
    break
  }
}

// Check if previous checkpoint is approved
const previousStatus = userCheckpointStatusMap.get(previousCheckpoint.id) || 'not_started'

if (previousStatus === 'approved') {
  // Previous checkpoint approved - unlock this section
  isLocked = false
  wouldBeLocked = false
} else {
  // Previous checkpoint not approved - lock this section
  isLocked = true
  wouldBeLocked = true
  lockReason = `Complete "${previousCheckpoint.title}" to unlock this module`
}
```

**Response Format:**
```typescript
{
  courseId: string,
  modules: [
    {
      id: string,
      title: string,
      sort_order: number,
      isLocked: boolean,        // Actual access (false for admins)
      wouldBeLocked: boolean,  // Visual state (for admins to see lock symbol)
      lockReason: string | null,
      globally_unlocked: boolean | null | undefined,
      checkpoint: {
        id: string,
        title: string,
        status: 'none' | 'not_started' | 'pending' | 'approved' | 'denied' | 'needs_review'
      } | null
    }
  ]
}
```

**Key Debugging Logs:**
- `[Unlock Status] User checkpoint statuses:` - Lists all checkpoints and their statuses
- `[Unlock Status] Module "X": Previous checkpoint "Y" status="Z"` - Shows unlock evaluation
- `[Unlock Status] FINAL RESPONSE - Module globally_unlocked values:` - Shows final state

---

## 3. Database Schema

### `user_checkpoints` Table
- `id` - UUID
- `user_id` - UUID (affiliate.id)
- `checkpoint_id` - UUID
- `submission_text` - TEXT
- `screenshot_url` - TEXT (nullable)
- `status` - ENUM: `'pending' | 'approved' | 'denied' | 'needs_review'`
- `ai_review_passed` - BOOLEAN (nullable)
- `ai_review_notes` - TEXT (nullable)
- `ai_confidence` - INTEGER (nullable)
- `admin_feedback` - TEXT (nullable)
- `submitted_at` - TIMESTAMP
- `reviewed_at` - TIMESTAMP (nullable)

### `checkpoints` Table
- `id` - UUID
- `module_id` - UUID (references `course_modules.id`)
- `title` - TEXT
- `requirements` - TEXT
- `ai_review_enabled` - BOOLEAN
- `requires_manual_review` - BOOLEAN
- `ai_grading_prompt` - TEXT (nullable)

### `course_modules` Table
- `id` - UUID
- `course_id` - UUID
- `title` - TEXT
- `sort_order` - INTEGER
- `globally_unlocked` - BOOLEAN (nullable) - Admin override flag

---

## 4. Unlock Flow Summary

**When a checkpoint is approved:**

1. **Submission API** (`/api/checkpoints/submit/[checkpointId]`):
   - Updates `user_checkpoints.status = 'approved'`
   - Returns `{ status: 'approved' }` to frontend

2. **Frontend** (`CheckpointSubmission.tsx`):
   - Receives `approved` status
   - Calls `onSuccess('approved')` callback
   - Parent component should refresh unlock status

3. **Unlock Status API** (`/api/courses/[courseId]/unlock-status`):
   - Fetches `user_checkpoints` for user
   - Finds previous module with checkpoint
   - Checks if `status = 'approved'`
   - If approved → unlocks next module (`isLocked = false`)

4. **Frontend** (`SkillBankCourseView.tsx`):
   - Calls `/api/courses/[courseId]/unlock-status`
   - Updates `unlockStatus` state
   - Next module shows as unlocked

---

## 5. Common Issues & Debugging

### Issue: Checkpoint approved but next module not unlocking

**Check:**
1. Is checkpoint status `approved` in database?
   ```sql
   SELECT checkpoint_id, status FROM user_checkpoints 
   WHERE checkpoint_id = 'xxx' AND user_id = 'yyy'
   ```

2. Is unlock-status API finding the checkpoint?
   - Look for `[Unlock Status] User checkpoint statuses:` log
   - Should show checkpoint with `status: 'approved'`

3. Is unlock-status API checking the correct previous checkpoint?
   - Look for `[Unlock Status] Module "X": Previous checkpoint "Y"` log
   - Should show the checkpoint being checked

4. Is the checkpoint ID matching?
   - Check `checkpointMap.get(prevModule.id)` returns the checkpoint
   - Check `userCheckpointStatusMap.get(previousCheckpoint.id)` returns `'approved'`

### Issue: Module stays locked after checkpoint approval

**Possible Causes:**
1. Checkpoint not found in `userCheckpointStatusMap` (wrong checkpoint_id)
2. Status not `'approved'` (might be `'pending'` or `'needs_review'`)
3. Wrong previous module being checked (check `sort_order` values)
4. Module has `globally_unlocked = false` (admin override)

---

## 6. Key Files Reference

| File | Purpose |
|------|---------|
| `src/components/CheckpointSubmission.tsx` | Frontend checkpoint submission UI |
| `src/app/api/checkpoints/submit/[checkpointId]/route.ts` | Checkpoint submission API (with AI review) |
| `src/app/api/courses/[courseId]/unlock-status/route.ts` | Unlock status calculation API |
| `src/app/dashboard/components/classroom/SkillBankCourseView.tsx` | Course view component (uses unlock status) |
| `src/lib/types/courses.ts` | TypeScript type definitions |

---

## 7. Testing Checklist

- [ ] Submit checkpoint → Status updates to `pending` or `approved`
- [ ] If AI review enabled → Status updates based on AI response
- [ ] If `approved` → Next module unlocks (check unlock-status API logs)
- [ ] If `denied` → User can resubmit
- [ ] If `needs_review` → Status shows "Under Review"
- [ ] Admin toggle → Module `globally_unlocked` flag updates
- [ ] First module → Always unlocked regardless of checkpoints
- [ ] Sequential unlock → Previous checkpoint approval unlocks next module

