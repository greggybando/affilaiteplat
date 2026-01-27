# Current State: Admin Module Lock/Unlock Toggle

## GOAL
Admin users should be able to click a toggle button next to each module to lock/unlock it globally. The button should:
1. Show a **lock icon (gray)** when the module is locked
2. Show an **unlock icon (green)** when the module is unlocked
3. Update **immediately** on click (optimistic update)
4. Confirm with API and update if needed
5. Work in **real-time** - clicking lock should lock it, clicking unlock should unlock it

## CURRENT IMPLEMENTATION

### Frontend Component: `SkillBankCourseView.tsx`

**State Management:**
```typescript
const [unlockStatus, setUnlockStatus] = useState<Record<string, { 
  isLocked: boolean; 
  wouldBeLocked?: boolean; 
  lockReason: string | null; 
  checkpoint: any 
}>>({})
const [togglingModuleId, setTogglingModuleId] = useState<string | null>(null)
const [unlockStatusVersion, setUnlockStatusVersion] = useState(0) // Force re-render trigger
```

**Lock Status Calculation (line 1432):**
```typescript
const moduleStatus = unlockStatus[section.id]
const wouldBeLocked = isAdmin ? (moduleStatus?.wouldBeLocked ?? true) : (moduleStatus?.isLocked ?? true)
const isLocked = isAdmin ? false : (moduleStatus?.isLocked ?? true) // Admins always have access
```

**Toggle Button (lines 1473-1710):**
- Located next to each module header
- On click:
  1. Calculates `newUnlockedState = !wouldBeLocked` (opposite of current state)
  2. Optimistically updates `unlockStatus` state immediately
  3. Calls API `/api/courses/${courseId}/modules/${moduleId}/toggle-unlock`
  4. Waits 500ms, then reloads unlock status from `/api/courses/${courseId}/unlock-status`
  5. Updates state with API response

**Icon Rendering (lines 1703-1709):**
```typescript
{togglingModuleId === section.id ? (
  <Loader2 size={18} className="text-slate-400 animate-spin" />
) : wouldBeLocked ? (
  <Lock size={18} className="text-slate-500" />  // Gray lock = locked
) : (
  <Unlock size={18} className="text-emerald-400" />  // Green unlock = unlocked
)}
```

**Key Logic:**
- `wouldBeLocked = true` → Show gray Lock icon → Clicking should UNLOCK → Set `globally_unlocked = true`
- `wouldBeLocked = false` → Show green Unlock icon → Clicking should LOCK → Set `globally_unlocked = false`

### Backend API: `/api/courses/[courseId]/modules/[moduleId]/toggle-unlock/route.ts`

**Endpoint:** `POST /api/courses/:courseId/modules/:moduleId/toggle-unlock`

**Request Body:**
```json
{ "unlocked": boolean }
```

**Logic:**
- Updates `course_modules.globally_unlocked` column directly
- `unlocked: true` → Sets `globally_unlocked = true` (unlocks for all users)
- `unlocked: false` → Sets `globally_unlocked = false` (locks for all users)

**Response:**
```json
{
  "success": true,
  "unlocked": boolean,
  "moduleId": string,
  "moduleTitle": string
}
```

### Backend API: `/api/courses/[courseId]/unlock-status/route.ts`

**Endpoint:** `GET /api/courses/:courseId/unlock-status`

**Logic:**
1. Fetches `course_modules` with `globally_unlocked` column
2. For each module, determines lock status based on priority:
   - Course `globally_unlocked = true` → All modules unlocked
   - Module `globally_unlocked = false` → Module locked (explicitly locked by admin)
   - Module `globally_unlocked = true` → Module unlocked (explicitly unlocked by admin)
   - Module `globally_unlocked = null/undefined` → Use sequential checkpoint logic
3. Returns `wouldBeLocked` for admins (what it would be for regular users)
4. Returns `isLocked = false` for admins (they always have access)

**Response:**
```json
{
  "courseId": string,
  "modules": [
    {
      "id": string,
      "title": string,
      "isLocked": boolean,
      "wouldBeLocked": boolean,
      "globally_unlocked": boolean | null | undefined,
      "lockReason": string | null,
      "checkpoint": object | null
    }
  ]
}
```

**Important:** The API now preserves `null`/`undefined` for `globally_unlocked` to distinguish:
- `globally_unlocked = true` → Explicitly unlocked
- `globally_unlocked = false` → Explicitly locked
- `globally_unlocked = null/undefined` → Not set, use sequential logic

### Frontend Processing of API Response

**In toggle handler (lines 1614-1637):**
```typescript
unlockData.modules?.forEach((module: any) => {
  let wouldBeLockedValue: boolean
  
  if (module.globally_unlocked === true) {
    wouldBeLockedValue = false  // Unlocked
  } else if (module.globally_unlocked === false) {
    wouldBeLockedValue = true   // Locked
  } else {
    // Not explicitly set, use API's calculation
    wouldBeLockedValue = module.wouldBeLocked ?? true
  }
  
  statusMap[module.id] = {
    isLocked: module.isLocked,
    wouldBeLocked: wouldBeLockedValue,
    lockReason: module.lockReason,
    checkpoint: module.checkpoint
  }
})
```

**In `loadUnlockStatus` function (lines 270-293):**
Same logic as above - processes the unlock status response and updates state.

## PROBLEM

The toggle button is not updating the visual state correctly. Based on console logs:
- API calls are succeeding (status 200)
- `toggle-unlock` API returns correct `unlocked` value
- `unlock-status` API is being called
- But the icon is not updating to reflect the new state

## SUSPECTED ISSUES

1. **State Update Not Triggering Re-render**: Even though we're updating `unlockStatus` and incrementing `unlockStatusVersion`, React might not be detecting the change
2. **Closure Issue**: The `wouldBeLocked` variable is calculated from `unlockStatus[section.id]` at render time, but might be capturing stale values
3. **API Response Processing**: The `globally_unlocked` value from the API might not match what we expect
4. **Race Condition**: The optimistic update might be overwritten by stale data from `loadUnlockStatus`

## DEBUGGING LOGS

The code includes extensive console logging:
- `[Frontend] Button clicked!` - When button is clicked
- `[Frontend] Toggle calculation:` - Shows current state and what it should toggle to
- `[Frontend] Optimistic update` - Shows optimistic state update
- `[Frontend] Toggle response:` - API response from toggle-unlock
- `[Frontend] Unlock status response:` - Response from unlock-status API
- `[Frontend] Processing module` - Shows how each module is processed
- `[Frontend] Module state change:` - Shows before/after state comparison

## VISUAL FLOW

```
User clicks button
  ↓
Calculate: newUnlockedState = !wouldBeLocked
  ↓
Optimistic Update: setUnlockStatus({ ...prevStatus, [moduleId]: { wouldBeLocked: !wouldBeLocked } })
  ↓
Increment: setUnlockStatusVersion(v => v + 1)
  ↓
API Call: POST /api/courses/:courseId/modules/:moduleId/toggle-unlock { unlocked: newUnlockedState }
  ↓
Wait 500ms
  ↓
API Call: GET /api/courses/:courseId/unlock-status
  ↓
Process Response: Calculate wouldBeLockedValue from globally_unlocked
  ↓
Update State: setUnlockStatus(statusMap)
  ↓
Increment: setUnlockStatusVersion(v => v + 1)
  ↓
React Re-renders → wouldBeLocked recalculated → Icon updates
```

## EXPECTED BEHAVIOR

1. **Initial State**: Module locked → `wouldBeLocked = true` → Shows gray Lock icon
2. **Click Lock Icon**: 
   - Optimistic: `wouldBeLocked = false` → Shows green Unlock icon immediately
   - API: Sets `globally_unlocked = true` in database
   - Confirm: Reload status → `wouldBeLocked = false` → Stays green Unlock icon
3. **Click Unlock Icon**:
   - Optimistic: `wouldBeLocked = true` → Shows gray Lock icon immediately
   - API: Sets `globally_unlocked = false` in database
   - Confirm: Reload status → `wouldBeLocked = true` → Stays gray Lock icon

## ACTUAL BEHAVIOR (Based on User Report)

- Button click is registered (logs show API calls)
- API calls succeed (status 200)
- But icon does NOT update visually
- User sees same icon before and after click

## FILES INVOLVED

1. `src/app/dashboard/components/classroom/SkillBankCourseView.tsx` - Main component (lines 124-126, 1424-1435, 1473-1730)
2. `src/app/api/courses/[courseId]/modules/[moduleId]/toggle-unlock/route.ts` - Toggle API
3. `src/app/api/courses/[courseId]/unlock-status/route.ts` - Status API (lines 220-245, 359-374)
4. Database: `course_modules.globally_unlocked` column (BOOLEAN, can be NULL)

## KEY CODE SECTIONS

**Button Key (line 1719):**
```typescript
key={`unlock-toggle-${section.id}-${unlockStatusVersion}`}
```
This should force React to re-render the button when `unlockStatusVersion` changes.

**Icon Rendering (lines 1725-1731):**
```typescript
{togglingModuleId === section.id ? (
  <Loader2 size={18} className="text-slate-400 animate-spin" />
) : wouldBeLocked ? (
  <Lock size={18} className="text-slate-500" />
) : (
  <Unlock size={18} className="text-emerald-400" />
)}
```

**wouldBeLocked Calculation (line 1432):**
```typescript
const wouldBeLocked = isAdmin ? (moduleStatus?.wouldBeLocked ?? true) : (moduleStatus?.isLocked ?? true)
```

This reads from `unlockStatus[section.id]`, which should update when state changes.

