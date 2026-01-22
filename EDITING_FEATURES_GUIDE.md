# SkillBank Course Editor - Editing Features Guide

## How to Verify You're an Admin

1. **Check the top bar** - You should see "👑 Admin Mode - Double-click to edit" badge
2. **Check browser console** - Look for: `[SkillBankCourseView] Admin status: { isAdmin: true }`
3. **Check your role** - Your `affiliate.role` should be `'admin'` or `'moderator'`

## All Available Editing Features (Admin Only)

### 1. **Course Title** (Top of sidebar)
- **How**: Click the course title in the sidebar header
- **What**: Edit the course title inline

### 2. **Section/Module Title** (Left sidebar)
- **How**: Double-click any section title
- **What**: Edit section title inline
- **Visual**: Grip icon (⋮⋮) appears on hover

### 3. **Delete Section** (Left sidebar)
- **How**: Click trash icon (🗑️) next to section title
- **What**: Deletes section and all its lessons
- **Visual**: Trash icon appears next to section title

### 4. **Add Section** (Bottom of sidebar)
- **How**: Click "+ Add Section" button at bottom
- **What**: Creates a new section/module

### 5. **Lesson Title** (Left sidebar)
- **How**: Double-click any lesson title
- **What**: Edit lesson title inline
- **Visual**: Grip icon (⋮⋮) appears next to lesson

### 6. **Delete Lesson** (Left sidebar)
- **How**: Click trash icon (🗑️) next to lesson title
- **What**: Deletes the lesson
- **Visual**: Trash icon appears next to lesson title

### 7. **Add Lesson** (Left sidebar, inside each section)
- **How**: Click "+ Add Lesson" button at bottom of section
- **What**: Creates a new lesson in that section

### 8. **Video URL** (Right panel, when lesson selected)
- **How**: Click a lesson → Edit "YouTube ID/URL" field
- **What**: Change the video URL/ID
- **Visual**: Input field appears below video player

### 9. **Import Course** (Top bar)
- **How**: Click "Import Course" button
- **What**: Import course from Google Docs

### 10. **Publish Course** (Top bar, if draft)
- **How**: Click "Publish Course" button
- **What**: Makes course visible to all users

## Troubleshooting

### If you don't see "Admin Mode" badge:
- Check your `affiliate.role` in database - should be `'admin'` or `'moderator'`
- Check browser console for admin status logs
- Verify you're logged in as an admin user

### If editing doesn't work:
- Make sure you see "Admin Mode" badge
- Try double-clicking (not single click)
- Check browser console for errors
- Verify the course is loaded correctly

### If controls are too subtle:
- Controls are now more visible (opacity increased)
- Grip icons (⋮⋮) should be visible next to sections/lessons
- Trash icons (🗑️) should be visible next to sections/lessons
- Hover over items to see controls more clearly

