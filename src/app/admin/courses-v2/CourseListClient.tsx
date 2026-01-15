'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, GripVertical, Book } from 'lucide-react'
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

interface Course {
  id: string
  slug: string
  title: string
  description: string | null
  emoji: string | null
  color: string | null
  thumbnail_url: string | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

function SortableCourseCard({ course, onEdit, onDelete, onTogglePublish }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[rgba(26,26,46,0.6)] backdrop-blur-xl rounded-xl border border-[rgba(255,255,255,0.2)] p-5 flex items-center gap-4 hover:border-cyan-500/50 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-[rgba(255,255,255,0.4)]" />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          {course.emoji && <span className="text-2xl">{course.emoji}</span>}
          <h3 className="text-xl font-semibold text-white">{course.title}</h3>
          {!course.is_published && (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
              DRAFT
            </span>
          )}
        </div>
        {course.description && (
          <p className="text-sm text-[rgba(255,255,255,0.6)]">{course.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-[rgba(255,255,255,0.5)]">
          <span>Slug: {course.slug}</span>
          {course.color && (
            <span className="flex items-center gap-1">
              Color: <div className="w-3 h-3 rounded" style={{ background: course.color }} />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onTogglePublish(course)}
          className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
          title={course.is_published ? 'Unpublish' : 'Publish'}
        >
          {course.is_published ? (
            <Eye className="w-4 h-4 text-green-400" />
          ) : (
            <EyeOff className="w-4 h-4 text-[rgba(255,255,255,0.4)]" />
          )}
        </button>
        <button
          onClick={() => onEdit(course)}
          className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg text-cyan-400 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(course)}
          className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function CourseListClient() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/courses-v2?all=true')
      const data = await res.json()
      if (data.courses) {
        setCourses(data.courses.sort((a: Course, b: Course) => a.sort_order - b.sort_order))
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async () => {
    if (!newCourse.title || !newCourse.slug) {
      alert('Title and slug are required')
      return
    }

    try {
      const res = await fetch('/api/admin/courses-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      })

      const data = await res.json()

      if (data.error) {
        alert('Error: ' + data.error)
        return
      }

      setShowCreateModal(false)
      setNewCourse({ title: '', slug: '', description: '', emoji: '', color: '#06B6D4' })
      loadCourses()
    } catch (error) {
      console.error('Error creating course:', error)
      alert('Error creating course')
    }
  }

  const handleTogglePublish = async (course: Course) => {
    try {
      const res = await fetch('/api/admin/courses-v2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: course.id,
          is_published: !course.is_published
        })
      })

      if (res.ok) {
        loadCourses()
      }
    } catch (error) {
      console.error('Error toggling publish:', error)
    }
  }

  const handleDeleteCourse = async (course: Course) => {
    if (!confirm(`Are you sure you want to delete "${course.title}"? This will delete all sections, lessons, and attachments.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/courses-v2?id=${course.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadCourses()
      }
    } catch (error) {
      console.error('Error deleting course:', error)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = courses.findIndex(c => c.id === active.id)
    const newIndex = courses.findIndex(c => c.id === over.id)

    const newCourses = arrayMove(courses, oldIndex, newIndex)
    setCourses(newCourses)

    // Update sort_order in backend
    const updates = newCourses.map((course, index) => ({
      id: course.id,
      sort_order: index
    }))

    await fetch('/api/admin/courses-v2/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'course', items: updates })
    })
  }

  const handleEditCourse = (course: Course) => {
    router.push(`/admin/courses-v2/${course.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgba(15,23,42,1)] p-8">
        <div className="text-white text-center">Loading courses...</div>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Book className="w-10 h-10 text-cyan-400" />
              Course Management
            </h1>
            <p className="text-[rgba(255,255,255,0.6)]">
              Create and manage your courses. Drag to reorder.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create New Course
          </button>
        </div>

        {/* Courses List */}
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block bg-[rgba(255,255,255,0.05)] backdrop-blur-xl rounded-2xl p-12 border border-[rgba(255,255,255,0.1)]">
              <Book className="w-16 h-16 text-[rgba(255,255,255,0.3)] mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">No courses yet</h2>
              <p className="text-[rgba(255,255,255,0.6)] mb-6">
                Create your first course to get started
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold flex items-center gap-2 mx-auto hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Course
              </button>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={courses.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {courses.map(course => (
                  <SortableCourseCard
                    key={course.id}
                    course={course}
                    onEdit={handleEditCourse}
                    onDelete={handleDeleteCourse}
                    onTogglePublish={handleTogglePublish}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[rgba(26,26,46,0.95)] backdrop-blur-xl rounded-2xl border border-[rgba(255,255,255,0.2)] p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Course</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newCourse.title}
                  onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Productivity Mastery"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                  Slug * (URL-friendly)
                </label>
                <input
                  type="text"
                  value={newCourse.slug}
                  onChange={e => setNewCourse({ ...newCourse, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., productivity-mastery"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                  Description
                </label>
                <textarea
                  value={newCourse.description}
                  onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500 h-20 resize-none"
                  placeholder="Brief course description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={newCourse.emoji}
                    onChange={e => setNewCourse({ ...newCourse, emoji: e.target.value })}
                    className="w-full px-4 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white focus:outline-none focus:border-cyan-500 text-center text-2xl"
                    placeholder="⚡"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[rgba(255,255,255,0.8)] mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newCourse.color}
                    onChange={e => setNewCourse({ ...newCourse, color: e.target.value })}
                    className="w-full h-10 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.1)] text-white rounded-lg hover:bg-[rgba(255,255,255,0.2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCourse}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
              >
                Create Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

