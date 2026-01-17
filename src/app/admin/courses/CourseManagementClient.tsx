'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Edit2, GripVertical, X, Check, Youtube, Video, Paperclip } from 'lucide-react'
import { AttachmentManager } from './components/AttachmentManager'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Video {
  id?: string
  video_id: string
  title: string
  youtube_id?: string
  loom_id?: string
  display_order: number
}

interface Section {
  id?: string
  section_id: number
  number: number
  title: string
  description?: string
  display_order: number
  videos: Video[]
}

interface Category {
  id?: string
  category_id: string
  title: string
  is_start_here: boolean
  display_order: number
  sections: Section[]
}

interface CourseManagementClientProps {
  affiliate: {
    id: string
    role: string
  }
}

// Sortable Video Item
function SortableVideoItem({ 
  video, 
  catIndex, 
  secIndex, 
  vidIndex,
  editing,
  editValues,
  setEditValues,
  startEdit,
  saveEdit,
  setEditing,
  deleteItem,
  setAttachmentManager,
  extractYouTubeId,
  extractLoomId
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `video-${catIndex}-${secIndex}-${vidIndex}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isEditing = editing?.type === 'video' && editing.categoryIndex === catIndex && editing.sectionIndex === secIndex && editing.videoIndex === vidIndex

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-600/50 rounded border border-slate-500 p-2 flex items-center gap-2"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3 h-3 text-slate-500" />
      </div>
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editValues.title}
            onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
            className="flex-1 px-2 py-1 bg-slate-500 text-white rounded border border-slate-400 text-sm"
            placeholder="Video title"
          />
          <input
            type="text"
            value={editValues.youtube_id || ''}
            onChange={(e) => {
              const value = e.target.value
              const id = extractYouTubeId(value)
              setEditValues({ ...editValues, youtube_id: id || value })
            }}
            className="flex-1 px-2 py-1 bg-slate-500 text-white rounded border border-slate-400 text-sm"
            placeholder="YouTube URL or ID"
          />
          <input
            type="text"
            value={editValues.loom_id || ''}
            onChange={(e) => {
              const value = e.target.value
              const id = extractLoomId(value)
              setEditValues({ ...editValues, loom_id: id || value })
            }}
            className="flex-1 px-2 py-1 bg-slate-500 text-white rounded border border-slate-400 text-sm"
            placeholder="Loom URL or ID"
          />
          <button onClick={saveEdit} className="p-1 text-emerald-400">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={() => setEditing(null)} className="p-1 text-red-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm text-slate-300">{video.title}</span>
            {video.youtube_id && <Youtube className="w-3 h-3 text-red-500" />}
            {video.loom_id && <Video className="w-3 h-3 text-purple-500" />}
          </div>
          <button onClick={() => startEdit('video', catIndex, secIndex, vidIndex)} className="p-1 text-slate-400 hover:text-white">
            <Edit2 className="w-3 h-3" />
          </button>
          {video.id && (
            <button 
              onClick={() => setAttachmentManager({ parentId: video.id!, parentType: 'video_id' })} 
              className="p-1 text-slate-400 hover:text-blue-400"
              title="Manage attachments"
            >
              <Paperclip className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => deleteItem('video', catIndex, secIndex, vidIndex)} className="p-1 text-slate-400 hover:text-red-400">
            <Trash2 className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  )
}

// Sortable Section Item
function SortableSectionItem({
  section,
  catIndex,
  secIndex,
  editing,
  editValues,
  setEditValues,
  startEdit,
  saveEdit,
  setEditing,
  deleteItem,
  addVideo,
  setAttachmentManager,
  onVideoReorder,
  extractYouTubeId,
  extractLoomId
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `section-${catIndex}-${secIndex}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isEditing = editing?.type === 'section' && editing.categoryIndex === catIndex && editing.sectionIndex === secIndex

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleVideoDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)
    
    const activeIndex = parseInt(activeId.split('-')[3])
    const overIndex = parseInt(overId.split('-')[3])
    
    onVideoReorder(catIndex, secIndex, activeIndex, overIndex)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-700/50 rounded border border-slate-600 p-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-slate-500" />
        </div>
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editValues.title}
              onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
              className="flex-1 px-3 py-1 bg-slate-600 text-white rounded border border-slate-500"
              placeholder="Section title"
            />
            <input
              type="text"
              value={editValues.description || ''}
              onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
              className="flex-1 px-3 py-1 bg-slate-600 text-white rounded border border-slate-500"
              placeholder="Description"
            />
            <button onClick={saveEdit} className="p-1 text-emerald-400">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(null)} className="p-1 text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-medium text-slate-200 flex-1">{section.title}</h3>
            <button onClick={() => startEdit('section', catIndex, secIndex)} className="p-1 text-slate-400 hover:text-white">
              <Edit2 className="w-3 h-3" />
            </button>
            {section.id && (
              <button 
                onClick={() => setAttachmentManager({ parentId: section.id!, parentType: 'section_id' })} 
                className="p-1 text-slate-400 hover:text-blue-400"
                title="Manage attachments"
              >
                <Paperclip className="w-3 h-3" />
              </button>
            )}
            <button onClick={() => addVideo(catIndex, secIndex)} className="p-1 text-slate-400 hover:text-emerald-400">
              <Plus className="w-3 h-3" />
            </button>
            <button onClick={() => deleteItem('section', catIndex, secIndex)} className="p-1 text-slate-400 hover:text-red-400">
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      <div className="ml-6 space-y-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleVideoDragEnd}
        >
          <SortableContext
            items={section.videos.map((_: any, idx: number) => `video-${catIndex}-${secIndex}-${idx}`)}
            strategy={verticalListSortingStrategy}
          >
            {section.videos.map((video: Video, vidIndex: number) => (
              <SortableVideoItem
                key={video.video_id}
                video={video}
                catIndex={catIndex}
                secIndex={secIndex}
                vidIndex={vidIndex}
                editing={editing}
                editValues={editValues}
                setEditValues={setEditValues}
                startEdit={startEdit}
                saveEdit={saveEdit}
                setEditing={setEditing}
                deleteItem={deleteItem}
                setAttachmentManager={setAttachmentManager}
                extractYouTubeId={extractYouTubeId}
                extractLoomId={extractLoomId}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

// Sortable Category Item
function SortableCategoryItem({
  category,
  catIndex,
  editing,
  editValues,
  setEditValues,
  startEdit,
  saveEdit,
  setEditing,
  deleteItem,
  addSection,
  addVideo,
  setAttachmentManager,
  onSectionReorder,
  onVideoReorder,
  extractYouTubeId,
  extractLoomId
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `category-${catIndex}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isEditing = editing?.type === 'category' && editing.categoryIndex === catIndex

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)
    
    const activeIndex = parseInt(activeId.split('-')[2])
    const overIndex = parseInt(overId.split('-')[2])
    
    onSectionReorder(catIndex, activeIndex, overIndex)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-800 rounded-lg border border-slate-700 p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-slate-500" />
        </div>
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editValues.title}
              onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
              className="flex-1 px-3 py-1 bg-slate-700 text-white rounded border border-slate-600"
              placeholder="Category title"
            />
            <label className="flex items-center gap-2 text-slate-300 text-sm">
              <input
                type="checkbox"
                checked={editValues.is_start_here}
                onChange={(e) => setEditValues({ ...editValues, is_start_here: e.target.checked })}
                className="rounded"
              />
              Start Here
            </label>
            <button onClick={saveEdit} className="p-1 text-emerald-400 hover:text-emerald-300">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(null)} className="p-1 text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white flex-1">
              {category.title}
              {category.is_start_here && <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">START HERE</span>}
            </h2>
            <button onClick={() => startEdit('category', catIndex)} className="p-2 text-slate-400 hover:text-white">
              <Edit2 className="w-4 h-4" />
            </button>
            {category.id && (
              <button 
                onClick={() => setAttachmentManager({ parentId: category.id!, parentType: 'category_id' })} 
                className="p-2 text-slate-400 hover:text-blue-400"
                title="Manage attachments"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => addSection(catIndex)} className="p-2 text-slate-400 hover:text-emerald-400">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => deleteItem('category', catIndex)} className="p-2 text-slate-400 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className="ml-8 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext
            items={category.sections.map((_: any, idx: number) => `section-${catIndex}-${idx}`)}
            strategy={verticalListSortingStrategy}
          >
            {category.sections.map((section: Section, secIndex: number) => (
              <SortableSectionItem
                key={section.id || section.section_id}
                section={section}
                catIndex={catIndex}
                secIndex={secIndex}
                editing={editing}
                editValues={editValues}
                setEditValues={setEditValues}
                startEdit={startEdit}
                saveEdit={saveEdit}
                setEditing={setEditing}
                deleteItem={deleteItem}
                addVideo={addVideo}
                setAttachmentManager={setAttachmentManager}
                onVideoReorder={onVideoReorder}
                extractYouTubeId={extractYouTubeId}
                extractLoomId={extractLoomId}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

export function CourseManagementClient({ affiliate }: CourseManagementClientProps) {
  const [courseType, setCourseType] = useState<'mindset' | 'dreamjob' | 'affiliate'>('mindset')
  const [structure, setStructure] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<{ type: 'category' | 'section' | 'video', categoryIndex: number, sectionIndex?: number, videoIndex?: number } | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [attachmentManager, setAttachmentManager] = useState<{ parentId: string, parentType: 'video_id' | 'section_id' | 'category_id' } | null>(null)
  
  // New course management
  const [allCourses, setAllCourses] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCourse, setNewCourse] = useState({
    title: '',
    slug: '',
    description: '',
    emoji: '',
    color: '#06B6D4'
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Extract YouTube ID from URL
  const extractYouTubeId = (url: string): string => {
    if (!url) return ''
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0].split('&')[0]
    if (url.includes('youtube.com/watch?v=')) return url.split('youtube.com/watch?v=')[1].split('&')[0]
    if (url.includes('youtube.com/embed/')) return url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0]
    return url
  }

  // Extract Loom ID from URL
  const extractLoomId = (url: string): string => {
    if (!url) return ''
    const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
    return match ? match[1] : ''
  }

  useEffect(() => {
    loadStructure()
    loadAllCourses()
  }, [courseType])

  const loadAllCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses-v2?all=true')
      const data = await res.json()
      if (data.courses) {
        setAllCourses(data.courses.sort((a: any, b: any) => a.sort_order - b.sort_order))
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    }
  }

  const handleCreateCourse = async () => {
    if (!newCourse.title) {
      alert('Title is required')
      return
    }

    // Auto-generate slug from title with timestamp
    const baseSlug = newCourse.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const slug = `${baseSlug}-${Date.now()}`

    try {
      const res = await fetch('/api/admin/courses-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCourse,
          slug
        })
      })

      const data = await res.json()

      if (data.error) {
        alert('Error: ' + data.error)
        return
      }

      setShowCreateModal(false)
      setNewCourse({ title: '', slug: '', description: '', emoji: '', color: '#06B6D4' })
      loadAllCourses()
      alert('Course created as draft! Redirecting to course builder...')
      
      // Redirect to course builder
      if (data.id) {
        setTimeout(() => {
          window.location.href = `/admin/courses-v2/${data.id}`
        }, 500)
      }
    } catch (error) {
      console.error('Error creating course:', error)
      alert('Error creating course')
    }
  }

  const loadStructure = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/courses?courseType=${courseType}`)
      const data = await res.json()
      if (data.structure) {
        setStructure(data.structure)
      } else {
        setStructure([])
      }
    } catch (error) {
      console.error('Error loading structure:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveStructure = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseType, structure })
      })
      const data = await res.json()
      if (data.success) {
        alert('Course structure saved successfully!')
        // Reload to get fresh data with IDs
        await loadStructure()
      } else {
        alert('Error saving: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving course structure')
    } finally {
      setSaving(false)
    }
  }

  // Auto-save structure (silent, no alerts)
  const autoSaveStructure = async (newStructure: Category[]) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseType, structure: newStructure })
      })
      const data = await res.json()
      if (!data.success) {
        console.error('Auto-save failed:', data.error)
      } else {
        console.log('Auto-saved successfully')
      }
    } catch (error) {
      console.error('Auto-save error:', error)
    } finally {
      setSaving(false)
    }
  }

  // Handle category reordering
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)
    
    const activeIndex = parseInt(activeId.split('-')[1])
    const overIndex = parseInt(overId.split('-')[1])
    
    setStructure(prev => {
      const newStructure = arrayMove(prev, activeIndex, overIndex)
      newStructure.forEach((cat, idx) => { cat.display_order = idx })
      // Auto-save after reorder
      autoSaveStructure(newStructure)
      return newStructure
    })
  }

  // Handle section reordering within a category
  const handleSectionReorder = (catIndex: number, fromIndex: number, toIndex: number) => {
    setStructure(prev => {
      const newStructure = [...prev]
      const category = { ...newStructure[catIndex] }
      category.sections = arrayMove(category.sections, fromIndex, toIndex)
      category.sections.forEach((sec, idx) => { sec.display_order = idx })
      newStructure[catIndex] = category
      // Auto-save after reorder
      autoSaveStructure(newStructure)
      return newStructure
    })
  }

  // Handle video reordering within a section
  const handleVideoReorder = (catIndex: number, secIndex: number, fromIndex: number, toIndex: number) => {
    setStructure(prev => {
      const newStructure = [...prev]
      const category = { ...newStructure[catIndex] }
      category.sections = [...category.sections]
      const section = { ...category.sections[secIndex] }
      section.videos = arrayMove(section.videos, fromIndex, toIndex)
      section.videos.forEach((vid, idx) => { vid.display_order = idx })
      category.sections[secIndex] = section
      newStructure[catIndex] = category
      // Auto-save after reorder
      autoSaveStructure(newStructure)
      return newStructure
    })
  }

  const startEdit = (type: 'category' | 'section' | 'video', categoryIndex: number, sectionIndex?: number, videoIndex?: number) => {
    let item: any
    if (type === 'category') {
      item = structure[categoryIndex]
      setEditValues({ title: item.title, is_start_here: item.is_start_here })
    } else if (type === 'section') {
      item = structure[categoryIndex].sections[sectionIndex!]
      setEditValues({ title: item.title, description: item.description })
    } else {
      item = structure[categoryIndex].sections[sectionIndex!].videos[videoIndex!]
      setEditValues({ title: item.title, youtube_id: item.youtube_id || '', loom_id: item.loom_id || '' })
    }
    setEditing({ type, categoryIndex, sectionIndex, videoIndex })
  }

  const saveEdit = () => {
    if (!editing) return

    const newStructure = [...structure]
    if (editing.type === 'category') {
      newStructure[editing.categoryIndex].title = editValues.title
      newStructure[editing.categoryIndex].is_start_here = editValues.is_start_here || false
    } else if (editing.type === 'section') {
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].title = editValues.title
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].description = editValues.description
    } else {
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].videos[editing.videoIndex!].title = editValues.title
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].videos[editing.videoIndex!].youtube_id = editValues.youtube_id || undefined
      newStructure[editing.categoryIndex].sections[editing.sectionIndex!].videos[editing.videoIndex!].loom_id = editValues.loom_id || undefined
    }

    setStructure(newStructure)
    setEditing(null)
    setEditValues({})
  }

  const addCategory = () => {
    const newCategory: Category = {
      category_id: `category-${Date.now()}`,
      title: 'New Category',
      is_start_here: false,
      display_order: structure.length,
      sections: []
    }
    setStructure([...structure, newCategory])
  }

  const addSection = (categoryIndex: number) => {
    const newStructure = [...structure]
    const category = newStructure[categoryIndex]
    const newSection: Section = {
      section_id: Date.now(),
      number: category.sections.length + 1,
      title: 'New Section',
      display_order: category.sections.length,
      videos: []
    }
    category.sections.push(newSection)
    setStructure(newStructure)
  }

  const addVideo = (categoryIndex: number, sectionIndex: number) => {
    const newStructure = [...structure]
    const section = newStructure[categoryIndex].sections[sectionIndex]
    const newVideo: Video = {
      video_id: `v-${Date.now()}`,
      title: 'New Video',
      display_order: section.videos.length
    }
    section.videos.push(newVideo)
    setStructure(newStructure)
  }

  const deleteItem = (type: 'category' | 'section' | 'video', categoryIndex: number, sectionIndex?: number, videoIndex?: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    const newStructure = [...structure]
    if (type === 'category') {
      newStructure.splice(categoryIndex, 1)
      newStructure.forEach((cat, idx) => { cat.display_order = idx })
    } else if (type === 'section') {
      newStructure[categoryIndex].sections.splice(sectionIndex!, 1)
      newStructure[categoryIndex].sections.forEach((sec, idx) => { sec.display_order = idx })
    } else {
      newStructure[categoryIndex].sections[sectionIndex!].videos.splice(videoIndex!, 1)
      newStructure[categoryIndex].sections[sectionIndex!].videos.forEach((vid, idx) => { vid.display_order = idx })
    }
    setStructure(newStructure)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="text-white text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Courses</h1>
          {saving && (
            <span className="text-sm text-emerald-400 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          )}
        </div>

        {/* Course Tabs - Scrollable with + Button */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {allCourses.map((course) => (
            <button
              key={course.id}
              onClick={() => {
                // Map course slug to courseType for existing courses
                const typeMap: any = {
                  'mindset': 'mindset',
                  'dream-job': 'dreamjob',
                  'side-income': 'affiliate'
                }
                if (typeMap[course.slug]) {
                  setCourseType(typeMap[course.slug])
                } else {
                  // For new courses, open in new tab
                  window.open(`/admin/courses-v2/${course.id}`, '_blank')
                }
              }}
              className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center gap-2 transition-colors ${
                (courseType === 'mindset' && course.slug === 'mindset') ||
                (courseType === 'dreamjob' && course.slug === 'dream-job') ||
                (courseType === 'affiliate' && course.slug === 'side-income')
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {course.emoji && <span>{course.emoji}</span>}
              <span className="text-sm font-medium">{course.title}</span>
            </button>
          ))}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            title="Create New Course"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-semibold">New Course</span>
          </button>
        </div>

        {/* Course Editor - Existing structure for the 3 old courses */}
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {courseType === 'mindset' && 'Mindset / LD World'}
              {courseType === 'dreamjob' && 'Dream Job'}
              {courseType === 'affiliate' && 'Affiliate'}
            </h2>
            <button
              onClick={saveStructure}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 text-sm"
            >
              <Save className="w-3 h-3" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoryDragEnd}
        >
          <SortableContext
            items={structure.map((_, idx) => `category-${idx}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {structure.map((category, catIndex) => (
                <SortableCategoryItem
                  key={category.id || category.category_id}
                  category={category}
                  catIndex={catIndex}
                  editing={editing}
                  editValues={editValues}
                  setEditValues={setEditValues}
                  startEdit={startEdit}
                  saveEdit={saveEdit}
                  setEditing={setEditing}
                  deleteItem={deleteItem}
                  addSection={addSection}
                  addVideo={addVideo}
                  setAttachmentManager={setAttachmentManager}
                  onSectionReorder={handleSectionReorder}
                  onVideoReorder={handleVideoReorder}
                  extractYouTubeId={extractYouTubeId}
                  extractLoomId={extractLoomId}
                />
              ))}

              <button
                onClick={addCategory}
                className="w-full py-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            </div>
          </SortableContext>
        </DndContext>
        </div>

        {/* Create Course Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">Create New Course</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newCourse.title}
                    onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 text-sm"
                    placeholder="e.g., Productivity Mastery"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCourse.description}
                    onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 h-16 resize-none text-sm"
                    placeholder="Brief course description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Emoji
                    </label>
                    <input
                      type="text"
                      value={newCourse.emoji}
                      onChange={e => setNewCourse({ ...newCourse, emoji: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 text-center text-xl"
                      placeholder="⚡"
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={newCourse.color}
                      onChange={e => setNewCourse({ ...newCourse, color: e.target.value })}
                      className="w-full h-10 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCourse}
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors text-sm"
                >
                  Create Course
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attachment Manager Modal */}
      {attachmentManager && (
        <AttachmentManager
          parentId={attachmentManager.parentId}
          parentType={attachmentManager.parentType}
          courseType={courseType}
          onClose={() => setAttachmentManager(null)}
        />
      )}
    </div>
  )
}

