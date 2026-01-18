# Inline Admin Editing Components

Created admin components for inline editing in the classroom UI.

## Components

### InlineEditWrapper
- Wraps any element with admin controls
- Shows edit/delete/add buttons on hover (admin only)
- Subtle, non-intrusive design with cyan accents
- Located: `src/app/dashboard/components/classroom/admin/InlineEditWrapper.tsx`

### EditableTitle
- Makes any title editable inline
- Double-click or click edit icon to enter edit mode
- Save/cancel buttons with keyboard shortcuts (Enter/Escape)
- Located: `src/app/dashboard/components/classroom/admin/EditableTitle.tsx`

### DragHandle
- 6-dot grip icon for reordering
- Only visible to admins
- Changes color on hover (gray → cyan)
- Located: `src/app/dashboard/components/classroom/admin/DragHandle.tsx`

## Usage Example

```tsx
import { InlineEditWrapper } from './admin/InlineEditWrapper'
import { EditableTitle } from './admin/EditableTitle'
import { DragHandle } from './admin/DragHandle'
import { useAdmin } from '@/lib/hooks/useAdmin'

function ModuleCard({ module, affiliate }) {
  const isAdmin = useAdmin(affiliate)

  return (
    <InlineEditWrapper
      isAdmin={isAdmin}
      onEdit={() => console.log('Edit module')}
      onDelete={() => console.log('Delete module')}
      onAdd={() => console.log('Add lesson')}
    >
      <div className="flex items-center gap-2">
        <DragHandle isAdmin={isAdmin} />
        <EditableTitle
          value={module.title}
          isAdmin={isAdmin}
          onSave={async (newTitle) => {
            // API call to update title
            console.log('Saving:', newTitle)
          }}
        />
      </div>
    </InlineEditWrapper>
  )
}
```

## Next Steps

To integrate into MindsetModuleList and DreamJobModuleList:

1. Import the admin components
2. Wrap module cards with `InlineEditWrapper`
3. Replace module titles with `EditableTitle`
4. Add `DragHandle` to the left of modules/lessons
5. Add "+ Add Module" button at bottom (admin only)
6. Add "+ Add Lesson" button in each module (admin only)
7. Wire up API calls for save/delete/add operations

## Design
- Dark theme with subtle hover states
- Cyan/teal accents matching existing UI
- Controls appear only on hover
- Confirmation dialog for delete actions
- Non-intrusive, doesn't interfere with normal viewing

