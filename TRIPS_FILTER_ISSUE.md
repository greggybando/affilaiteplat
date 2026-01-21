# Issue: "Trips" Filter Button Not Appearing in Community Tab

## Goal
Add "Trips" as a category filter button in the Community tab, next to "Wins", "Discussion", etc. When clicked, it should show the TripsTab component (trip planning interface) instead of posts.

## Problem
The "Trips" category is added to the `categories` array in `CommunityFeed.tsx` (line 123), but it's not appearing in the UI filter buttons bar.

## Current State

### Categories Array (CommunityFeed.tsx line 123)
```typescript
const categories = ['All', 'Discussion', 'dreamjob questions', 'lifedesign questions', 'make money questions', 'Wins', 'Trips']
```

### Filter Buttons Rendering (CommunityFeed.tsx lines 969-991)
```typescript
<div className="flex gap-2 overflow-x-auto flex-nowrap" style={{ scrollbarWidth: 'thin', minWidth: 'max-content' }}>
  {categories.map((cat, index) => {
    console.log(`[CommunityFeed] Rendering category ${index}:`, cat)
    return (
    <button
      key={cat}
      onClick={() => setSelectedCategory(cat)}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
        selectedCategory === cat
          ? 'text-white'
          : 'text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
      }`}
      style={selectedCategory === cat ? {
        background: 'linear-gradient(135deg, #fde047, #facc15)',
        color: '#0f0f1a',
        boxShadow: glowShadow('0 0 20px rgba(253,224,71,0.7), 0 0 40px rgba(253,224,71,0.5), 0 8px 30px rgba(253,224,71,0.4)', glowIntensity)
      } : {}}
    >
      {cat}
    </button>
    )
  })}
</div>
```

### Conditional Rendering for TripsTab (CommunityFeed.tsx lines 994-1005)
```typescript
{/* Show TripsTab when Trips category is selected */}
{selectedCategory === 'Trips' ? (
  <TripsTab 
    affiliate={{
      id: currentUser.id,
      name: currentUser.name,
      avatar_name: currentUser.name,
      avatar_url: currentUser.avatar
    }}
    glowIntensity={glowIntensity}
  />
) : (
  <>
    {/* Posts Feed */}
    {/* ... posts rendering ... */}
  </>
)}
```

## What's Been Tried
1. ✅ Added "Trips" to categories array
2. ✅ Added conditional rendering to show TripsTab when selected
3. ✅ Added `flex-nowrap` and `overflow-x-auto` to prevent wrapping
4. ✅ Added console.logs to debug
5. ✅ Cleared Next.js cache (.next folder)
6. ✅ Verified no other CommunityFeed files exist
7. ✅ Verified no filters excluding "Trips"

## Files Involved
- `src/app/dashboard/components/CommunityFeed.tsx` - Main component with filter buttons
- `src/app/dashboard/components/TripsTab.tsx` - Trips planning component (already created)
- `src/app/dashboard/DashboardClient.tsx` - Renders CommunityTab which uses CommunityFeed

## Expected Behavior
When user clicks Community tab, they should see filter buttons:
- "All" | "Discussion" | "dreamjob questions" | "lifedesign questions" | "make money questions" | "Wins" | **"Trips"**

Clicking "Trips" should show the TripsTab component instead of posts.

## Current Behavior
Only seeing: "All" | "Discussion" | "dreamjob questions" | "lifedesign questions" | "make money questions" | "Wins"
"Trips" button is missing.

## Debugging Steps Needed
1. Check browser console for `[CommunityFeed] Categories:` log - does it include "Trips"?
2. Check browser console for `[CommunityFeed] Rendering category` logs - is "Trips" being rendered?
3. Inspect the DOM - is the "Trips" button element present but hidden?
4. Check if there's a CSS issue hiding it (overflow, z-index, width constraints)
5. Verify the component is actually using the updated code (not cached)

## Architecture Context
- Next.js app with TypeScript
- Uses React hooks (useState, useEffect)
- CommunityFeed is a client component ('use client')
- Categories are defined as a const array inside the component
- Filter buttons are rendered via `.map()` over categories array

