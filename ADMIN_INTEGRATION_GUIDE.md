# Inline Admin Editing Integration Guide

## Status
✅ Admin components created
✅ Handler functions added to MindsetModuleList
🔄 UI integration in progress

## Integration Pattern for All Course Lists

### 1. SortableVideoItem (Lessons)
Currently at line 71-177 in MindsetModuleList.tsx

**Wrap with InlineEditWrapper:**
```tsx
function SortableVideoItem({ video, sectionId, isAdmin, onVideoSelect, handleUpdateLessonTitle, handleDeleteLesson }) {
  // ... existing code ...
  
  return (
    <InlineEditWrapper
      isAdmin={isAdmin}
      onEdit={() => {
        // Enable inline edit mode for lesson title
        // The EditableTitle component handles this
      }}
      onDelete={() => handleDeleteLesson(video.id)}
    >
      <div ref={setNodeRef} style={...}>
        {/* Drag handle (already exists) */}
        {isAdmin && <GripVertical ... />}
        
        {/* Replace static title with EditableTitle */}
        <button onClick={() => onVideoSelect(sectionId, video)}>
          <EditableTitle
            value={displayTitle}
            isAdmin={isAdmin}
            onSave={(newTitle) => handleUpdateLessonTitle(video.id, newTitle)}
            className="text-xs"
          />
        </button>
      </div>
    </InlineEditWrapper>
  )
}
```

### 2. SortableSectionItem (Modules)
Currently at line 408-567 in MindsetModuleList.tsx

**Wrap with InlineEditWrapper:**
```tsx
function SortableSectionItem({ section, isAdmin, handleUpdateModuleTitle, handleDeleteModule, handleAddLesson }) {
  return (
    <InlineEditWrapper
      isAdmin={isAdmin}
      onEdit={() => {
        // Enable inline edit for module title
      }}
      onDelete={() => handleDeleteModule(section.id)}
      onAdd={() => handleAddLesson(section.id)}
    >
      <div className="module-card">
        {/* Drag handle */}
        <AdminDragHandle isAdmin={isAdmin} />
        
        {/* Replace module title with EditableTitle */}
        <EditableTitle
          value={section.title}
          isAdmin={isAdmin}
          onSave={(newTitle) => handleUpdateModuleTitle(section.id, newTitle)}
          className="text-sm font-semibold"
        />
        
        {/* Module content */}
        {/* ... rest of module UI ... */}
      </div>
    </InlineEditWrapper>
  )
}
```

### 3. SortableCategoryItem (Categories)
Currently at line 571-729 in MindsetModuleList.tsx

**Wrap with InlineEditWrapper:**
```tsx
function SortableCategoryItem({ category, isAdmin, handleUpdateCategoryTitle, handleDeleteCategory, handleAddSectionToCategory }) {
  return (
    <InlineEditWrapper
      isAdmin={isAdmin}
      onEdit={() => {
        // Enable inline edit for category title
      }}
      onDelete={() => handleDeleteCategory(category.id)}
      onAdd={() => handleAddSectionToCategory(category.id)}
    >
      <div className="category-card">
        {/* Replace category title with EditableTitle */}
        <EditableTitle
          value={category.title}
          isAdmin={isAdmin}
          onSave={(newTitle) => handleUpdateCategoryTitle(category.id, newTitle)}
          className="text-xs font-semibold uppercase"
        />
        
        {/* Category sections */}
        {/* ... rest of category UI ... */}
      </div>
    </InlineEditWrapper>
  )
}
```

### 4. Add "+ Add Module" Button
At the end of the module list (around line 1720):

```tsx
{/* After the module list */}
{isAdmin && (
  <button
    onClick={handleAddModule}
    className="w-full px-4 py-3 text-left text-sm text-cyan-400 hover:bg-slate-800/50 transition-colors border-t border-slate-700/30 flex items-center gap-2"
  >
    <Plus className="w-4 h-4" />
    Add Module
  </button>
)}
```

### 5. Add "+ Add Category" Button
At the end of the category list:

```tsx
{isAdmin && (
  <button
    onClick={handleAddCategory}
    className="w-full px-4 py-3 text-left text-sm text-emerald-400 hover:bg-slate-800/50 transition-colors border-t border-slate-700/30 flex items-center gap-2"
  >
    <Plus className="w-4 h-4" />
    Add Category
  </button>
)}
```

## Integration Steps

1. ✅ Add imports and handler functions
2. Update `SortableVideoItem` component (lines 71-177)
   - Add handler props to function signature
   - Wrap return with `InlineEditWrapper`
   - Replace title text with `EditableTitle`
3. Update `SortableSectionItem` component (lines 408-567)
   - Add handler props
   - Wrap with `InlineEditWrapper`
   - Replace title with `EditableTitle`
   - Add `AdminDragHandle` if not already visible
4. Update `SortableCategoryItem` component (lines 571-729)
   - Add handler props
   - Wrap with `InlineEditWrapper`
   - Replace title with `EditableTitle`
5. Add "+ Add Module" button at end of module list
6. Add "+ Add Category" button at end of category list
7. Pass handler functions through component tree

## Repeat for DreamJobModuleList.tsx

Follow the exact same pattern for DreamJobModuleList.tsx

## For SkillBank Courses

SkillBank courses are rendered via the dynamic course system. Need to:
1. Find where SkillBank courses are rendered
2. Apply the same InlineEditWrapper + EditableTitle pattern
3. Ensure consistent behavior across all course types

## Next: Wire Up APIs

After UI integration is complete, we'll connect these handlers to actual API endpoints:
- UPDATE `/api/courses/module` - Update module title
- DELETE `/api/courses/module` - Delete module
- POST `/api/courses/module` - Add module
- UPDATE `/api/courses/lesson` - Update lesson title
- DELETE `/api/courses/lesson` - Delete lesson
- POST `/api/courses/lesson` - Add lesson

