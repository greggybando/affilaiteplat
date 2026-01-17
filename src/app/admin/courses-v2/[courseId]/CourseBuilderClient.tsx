'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Edit2, Trash2, GripVertical, Check, X, Youtube, Video, FileText, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

interface Lesson {
  id: string
  module_id: string
  title: string
  slug: string
  description: string | null
  video_url: string | null
  video_type: string | null
  content: string | null
  duration_minutes: number | null
  sort_order: number
  is_published: boolean
}

interface Section {
  id: string
  course_id: string
  title: string
  slug: string
  description: string | null
  sort_order: number
  is_published: boolean
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  slug: string
  description: string | null
  emoji: string | null
  color: string | null
}

// Sortable Lesson Component
function SortableLesson({ lesson, sectionId, onEdit, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[rgba(255,255,255,0.05)] rounded-lg border border-[rgba(255,255,255,0.1)] p-3 flex items-center gap-2"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-[rgba(255,255,255,0.3)]" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white">{lesson.title}</span>
          {lesson.video_type === 'youtube' && <Youtube className="w-3 h-3 text-red-500" />}
          {lesson.video_type === 'loom' && <Video className="w-3 h-3 text-purple-500" />}
          {lesson.content && <FileText className="w-3 h-3 text-blue-400" />}
        </div>
        {lesson.description && (
          <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">{lesson.description}</p>
        )}
      </div>
      <button
        onClick={() => onEdit(lesson)}
        className="p-1.5 hover:bg-[rgba(255,255,255,0.1)] rounded text-cyan-400"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDelete(lesson)}
        className="p-1.5 hover:bg-[rgba(255,255,255,0.1)] rounded text-red-400"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Sortable Section Component
function SortableSection({ section, onEdit, onDelete, onAddLesson, onEditLesson, onDeleteLesson, onReorderLessons }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = section.lessons.findIndex((l: Lesson) => l.id === active.id)
    const newIndex = section.lessons.findIndex((l: Lesson) => l.id === over.id)

    onReorderLessons(section.id, oldIndex, newIndex)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[rgba(26,26,46,0.6)] backdrop-blur-xl rounded-xl border border-[rgba(255,255,255,0.2)] p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-[rgba(255,255,255,0.4)]" />
        </div>
        <h3 className="text-lg font-semibold text-white flex-1">{section.title}</h3>
        <button
          onClick={() => onEdit(section)}
          className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded text-cyan-400"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onAddLesson(section)}
          className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded text-green-400"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(section)}
          className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {section.description && (
        <p className="text-sm text-[rgba(255,255,255,0.6)] mb-3 ml-8">{section.description}</p>
      )}

      <div className="ml-8 space-y-2">
        {section.lessons.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-[rgba(255,255,255,0.4)]">No lessons yet</p>
            <button
              onClick={() => onAddLesson(section)}
              className="mt-2 px-4 py-1.5 bg-[rgba(255,255,255,0.1)] text-cyan-400 text-sm rounded-lg hover:bg-[rgba(255,255,255,0.15)]"
            >
              Add First Lesson
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleLessonDragEnd}
          >
            <SortableContext
              items={section.lessons.map((l: Lesson) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.lessons.map((lesson: Lesson) => (
                <SortableLesson
                  key={lesson.id}
                  lesson={lesson}
                  sectionId={section.id}
                  onEdit={onEditLesson}
                  onDelete={onDeleteLesson}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}

export function CourseBuilderClient({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [currentSection, setCurrentSection] = useState<Section | null>(null)

  const [sectionForm, setSectionForm] = useState({ title: '', slug: '', description: '' })
  const [lessonForm, setLessonForm] = useState({
    title: '',
    slug: '',
    description: '',
    video_url: '',
    video_type: 'youtube',
    content: '',
    duration_minutes: ''
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    loadCourse()
    loadSections()
  }, [courseId])

  const loadCourse = async () => {
    try {
      const res = await fetch(`/api/admin/courses-v2?all=true`)
      const data = await res.json()
      const foundCourse = data.courses?.find((c: Course) => c.id === courseId)
      if (foundCourse) {
        setCourse(foundCourse)
      }
    } catch (error) {
      console.error('Error loading course:', error)
    }
  }

  const loadSections = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/courses-v2/${courseId}/sections`)
      const data = await res.json()
      
      if (data.sections) {
        // Load lessons for each section
        const sectionsWithLessons = await Promise.all(
          data.sections.map(async (section: Section) => {
            const lessonsRes = await fetch(
              `/api/admin/courses-v2/${courseId}/sections/${section.id}/lessons`
            )
            const lessonsData = await lessonsRes.json()
            return {
              ...section,
              lessons: lessonsData.lessons || []
            }
          })
        )
        setSections(sectionsWithLessons)
      }
    } catch (error) {
      console.error('Error loading sections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sections.findIndex(s => s.id === active.id)
    const newIndex = sections.findIndex(s => s.id === over.id)

    const newSections = arrayMove(sections, oldIndex, newIndex)
    setSections(newSections)

    // Update backend
    const updates = newSections.map((section, index) => ({
      id: section.id,
      sort_order: index
    }))

    await fetch('/api/admin/courses-v2/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'section', items: updates })
    })
  }

  const handleReorderLessons = async (sectionId: string, oldIndex: number, newIndex: number) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId)
    if (sectionIndex === -1) return

    const newSections = [...sections]
    const section = { ...newSections[sectionIndex] }
    section.lessons = arrayMove(section.lessons, oldIndex, newIndex)
    newSections[sectionIndex] = section
    setSections(newSections)

    // Update backend
    const updates = section.lessons.map((lesson, index) => ({
      id: lesson.id,
      sort_order: index
    }))

    await fetch('/api/admin/courses-v2/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lesson', items: updates })
    })
  }

  const handleAddSection = () => {
    setEditingSection(null)
    setSectionForm({ title: '', slug: '', description: '' })
    setShowSectionModal(true)
  }

  const handleEditSection = (section: Section) => {
    setEditingSection(section)
    setSectionForm({
      title: section.title,
      slug: section.slug,
      description: section.description || ''
    })
    setShowSectionModal(true)
  }

  const handleSaveSection = async () => {
    if (!sectionForm.title || !sectionForm.slug) {
      alert('Title and slug are required')
      return
    }

    try {
      const url = `/api/admin/courses-v2/${courseId}/sections`
      const method = editingSection ? 'PATCH' : 'POST'
      const body = editingSection
        ? { id: editingSection.id, ...sectionForm }
        : sectionForm

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setShowSectionModal(false)
        loadSections()
      }
    } catch (error) {
      console.error('Error saving section:', error)
    }
  }

  const handleDeleteSection = async (section: Section) => {
    if (!confirm(`Delete "${section.title}"? This will delete all lessons in this section.`)) {
      return
    }

    try {
      const res = await fetch(
        `/api/admin/courses-v2/${courseId}/sections?id=${section.id}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        loadSections()
      }
    } catch (error) {
      console.error('Error deleting section:', error)
    }
  }

  const handleAddLesson = (section: Section) => {
    setCurrentSection(section)
    setEditingLesson(null)
    setLessonForm({
      title: '',
      slug: '',
      description: '',
      video_url: '',
      video_type: 'youtube',
      content: '',
      duration_minutes: ''
    })
    setShowLessonModal(true)
  }

  const handleEditLesson = (lesson: Lesson) => {
    const section = sections.find(s => s.id === lesson.module_id)
    if (!section) return

    setCurrentSection(section)
    setEditingLesson(lesson)
    setLessonForm({
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description || '',
      video_url: lesson.video_url || '',
      video_type: lesson.video_type || 'youtube',
      content: lesson.content || '',
      duration_minutes: lesson.duration_minutes?.toString() || ''
    })
    setShowLessonModal(true)
  }

  const handleSaveLesson = async () => {
    if (!currentSection || !lessonForm.title || !lessonForm.slug) {
      alert('Title and slug are required')
      return
    }

    try {
      const url = `/api/admin/courses-v2/${courseId}/sections/${currentSection.id}/lessons`
      const method = editingLesson ? 'PATCH' : 'POST'
      const body = {
        ...(editingLesson ? { id: editingLesson.id } : {}),
        ...lessonForm,
        duration_minutes: lessonForm.duration_minutes ? parseInt(lessonForm.duration_minutes) : null
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setShowLessonModal(false)
        loadSections()
      }
    } catch (error) {
      console.error('Error saving lesson:', error)
    }
  }

  const handleDeleteLesson = async (lesson: Lesson) => {
    if (!confirm(`Delete "${lesson.title}"?`)) {
      return
    }

    try {
      const res = await fetch(
        `/api/admin/courses-v2/${courseId}/sections/${lesson.module_id}/lessons?id=${lesson.id}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        loadSections()
      }
    } catch (error) {
      console.error('Error deleting lesson:', error)
    }
  }

  if (loading || !course) {
    return (
      <div className="min-h-screen bg-[rgba(15,23,42,1)] p-8">
        <div className="text-white text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgba(15,23,42,1)] p-8">
      {/* Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/courses-v2')}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                {course.emoji && <span className="text-4xl">{course.emoji}</span>}
                {course.title}
              </h1>
              <p className="text-[rgba(255,255,255,0.6)]">
                Manage sections and lessons. Drag to reorder.
              </p>
            </div>
            <button
              onClick={handleAddSection}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Section
            </button>
          </div>
        </div>

        {/* Sections List */}
        {sections.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block bg-[rgba(255,255,255,0.05)] backdrop-blur-xl rounded-2xl p-12 border border-[rgba(255,255,255,0.1)]">
              <FileText className="w-16 h-16 text-[rgba(255,255,255,0.3)] mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">No sections yet</h2>
              <p className="text-[rgba(255,255,255,0.6)] mb-6">
                Create your first section to organize your course content
              </p>
              <button
                onClick={handleAddSection}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 mx-auto hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Section
              </button>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {sections.map(section => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onEdit={handleEditSection}
                    onDelete={handleDeleteSection}
                    onAddLesson={handleAddLesson}
                    onEditLesson={handleEditLesson}
                    onDeleteLesson={handleDeleteLesson}
                    onReorderLessons={handleReorderLessons}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[rgba(26,26,46,0.95)] backdrop-blur-xl rounded-2xl border border-[rgba(255,255,255,0.2)] p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingSection ? 'Edit Section' : 'Create Section'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={e => setSectionForm({ ...sectionForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Introduction"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  value={sectionForm.slug}
                  onChange={e => setSectionForm({ ...sectionForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., introduction"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                  Description
                </label>
                <textarea
                  value={sectionForm.description}
                  onChange={e => setSectionForm({ ...sectionForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500 h-20 resize-none"
                  placeholder="Optional section description"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowSectionModal(false)}
                className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSection}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                {editingSection ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[rgba(26,26,46,0.95)] backdrop-blur-xl rounded-2xl border border-[rgba(255,255,255,0.2)] p-8 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingLesson ? 'Edit Lesson' : 'Create Lesson'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Lesson title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={lessonForm.slug}
                    onChange={e => setLessonForm({ ...lessonForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="lesson-slug"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                  Description
                </label>
                <textarea
                  value={lessonForm.description}
                  onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500 h-16 resize-none"
                  placeholder="Brief lesson description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                    Video URL / ID
                  </label>
                  <input
                    type="text"
                    value={lessonForm.video_url}
                    onChange={e => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                    className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="YouTube ID or Loom URL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                    Type
                  </label>
                  <select
                    value={lessonForm.video_type}
                    onChange={e => setLessonForm({ ...lessonForm, video_type: e.target.value })}
                    className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="loom">Loom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={lessonForm.duration_minutes}
                  onChange={e => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
                  className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                  Text Content (Markdown supported)
                </label>
                <textarea
                  value={lessonForm.content}
                  onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })}
                  className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500 h-32 resize-none font-mono text-sm"
                  placeholder="Additional lesson content..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowLessonModal(false)}
                className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLesson}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                {editingLesson ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

