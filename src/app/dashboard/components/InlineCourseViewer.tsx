'use client'
import { useState, useEffect } from 'react'
import { GripVertical, Plus, Edit2, Trash2, Eye, EyeOff, Save, X, PlayCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface Course {
  id: string
  slug: string
  title: string
  emoji: string
  description: string
  course_modules?: Module[]
}

interface Module {
  id: string
  title: string
  slug: string
  description?: string
  is_published: boolean
  sort_order: number
  course_lessons?: Lesson[]
}

interface Lesson {
  id: string
  title: string
  slug: string
  description?: string
  video_url?: string
  is_published: boolean
  duration_minutes?: number
  sort_order: number
}

interface InlineCourseViewerProps {
  courseSlug: 'mindset' | 'dream-job' | 'side-income'
  isAdmin: boolean
  onLessonClick?: (lessonId: string) => void
}

export function InlineCourseViewer({ courseSlug, isAdmin, onLessonClick }: InlineCourseViewerProps) {
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourse()
  }, [courseSlug])

  const fetchCourse = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/courses?all=${isAdmin ? 'true' : 'false'}`)
      const data = await res.json()
      const foundCourse = data.find((c: Course) => c.slug === courseSlug)
      if (foundCourse) {
        // Sort modules and lessons
        foundCourse.course_modules?.sort((a: Module, b: Module) => a.sort_order - b.sort_order)
        foundCourse.course_modules?.forEach((m: Module) => {
          m.course_lessons?.sort((a: Lesson, b: Lesson) => a.sort_order - b.sort_order)
        })
        setCourse(foundCourse)
      }
    } catch (error) {
      console.error('Error fetching course:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading course...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Course not found</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {isAdmin && (
        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <span className="text-purple-400 text-sm">👑 Admin View - You can edit content inline</span>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <span className="text-4xl">{course.emoji}</span>
        <div>
          <h2 className="text-2xl font-bold text-white">{course.title}</h2>
          <p className="text-gray-400 text-sm">{course.description}</p>
        </div>
      </div>

      <div className="space-y-4">
        {course.course_modules
          ?.filter((m: Module) => isAdmin || m.is_published)
          .map((module: Module) => (
            <ModuleCard
              key={module.id}
              module={module}
              isAdmin={isAdmin}
              courseId={course.id}
              onRefresh={fetchCourse}
              onLessonClick={onLessonClick}
            />
          ))}
        {isAdmin && <AddButton type="module" parentId={course.id} onRefresh={fetchCourse} />}
      </div>
    </div>
  )
}

function ModuleCard({
  module,
  isAdmin,
  courseId,
  onRefresh,
  onLessonClick,
}: {
  module: Module
  isAdmin: boolean
  courseId: string
  onRefresh: () => void
  onLessonClick?: (lessonId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(module.title)

  const save = async () => {
    await fetch('/api/admin/courses/module', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: module.id, title }),
    })
    setEditing(false)
    onRefresh()
  }

  const togglePublish = async () => {
    await fetch('/api/admin/courses/module', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: module.id, is_published: !module.is_published }),
    })
    onRefresh()
  }

  const remove = async () => {
    if (!confirm('Delete this module and all lessons?')) return
    await fetch(`/api/admin/courses/module?id=${module.id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div
      className={`bg-gray-800 rounded-xl border ${
        module.is_published ? 'border-gray-700' : 'border-yellow-500/50'
      }`}
    >
      <div className="p-4 flex items-center gap-3">
        {isAdmin && <GripVertical size={20} className="text-gray-500 cursor-grab" />}
        <button onClick={() => setExpanded(!expanded)} className="text-gray-400">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>

        {editing ? (
          <div className="flex-1 flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white"
              autoFocus
            />
            <button onClick={save} className="text-green-400">
              <Save size={18} />
            </button>
            <button
              onClick={() => {
                setTitle(module.title)
                setEditing(false)
              }}
              className="text-gray-400"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{module.title}</h3>
            <p className="text-sm text-gray-400">{module.course_lessons?.length || 0} lessons</p>
          </div>
        )}

        {isAdmin && !editing && (
          <div className="flex gap-1">
            <button
              onClick={togglePublish}
              className={module.is_published ? 'text-green-400' : 'text-yellow-400'}
            >
              {module.is_published ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-white">
              <Edit2 size={18} />
            </button>
            <button onClick={remove} className="text-gray-400 hover:text-red-400">
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-700">
          {module.course_lessons
            ?.filter((l: Lesson) => isAdmin || l.is_published)
            .map((lesson: Lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                isAdmin={isAdmin}
                onRefresh={onRefresh}
                onClick={() => onLessonClick?.(lesson.id)}
              />
            ))}
          {isAdmin && <AddButton type="lesson" parentId={module.id} onRefresh={onRefresh} />}
        </div>
      )}
    </div>
  )
}

function LessonRow({
  lesson,
  isAdmin,
  onRefresh,
  onClick,
}: {
  lesson: Lesson
  isAdmin: boolean
  onRefresh: () => void
  onClick?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(lesson.title)
  const [videoUrl, setVideoUrl] = useState(lesson.video_url || '')

  const save = async () => {
    await fetch('/api/admin/courses/lesson', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lesson.id, title, video_url: videoUrl }),
    })
    setEditing(false)
    onRefresh()
  }

  const togglePublish = async () => {
    await fetch('/api/admin/courses/lesson', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lesson.id, is_published: !lesson.is_published }),
    })
    onRefresh()
  }

  const remove = async () => {
    if (!confirm('Delete this lesson?')) return
    await fetch(`/api/admin/courses/lesson?id=${lesson.id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 hover:bg-gray-700/50 border-b border-gray-700/50 last:border-0 ${
        !lesson.is_published && 'opacity-60'
      }`}
    >
      {isAdmin && <GripVertical size={16} className="text-gray-500 cursor-grab" />}
      <PlayCircle size={18} className="text-gray-400" />

      {editing ? (
        <div className="flex-1 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube ID"
            className="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1 bg-green-600 text-white text-sm rounded">
              Save
            </button>
            <button
              onClick={() => {
                setTitle(lesson.title)
                setVideoUrl(lesson.video_url || '')
                setEditing(false)
              }}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onClick}
          className="flex-1 text-left text-white hover:text-cyan-400"
        >
          {lesson.title}
        </button>
      )}

      {!editing && lesson.duration_minutes && (
        <span className="text-xs text-gray-500">{lesson.duration_minutes}m</span>
      )}

      {isAdmin && !editing && (
        <div className="flex gap-1">
          <button
            onClick={togglePublish}
            className={lesson.is_published ? 'text-green-400' : 'text-yellow-400'}
          >
            {lesson.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-white">
            <Edit2 size={14} />
          </button>
          <button onClick={remove} className="text-gray-400 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function AddButton({
  type,
  parentId,
  onRefresh,
}: {
  type: 'module' | 'lesson'
  parentId: string
  onRefresh: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const add = async () => {
    if (!title.trim()) return
    const endpoint = type === 'module' ? '/api/admin/courses/module' : '/api/admin/courses/lesson'
    const body = type === 'module' ? { course_id: parentId, title } : { module_id: parentId, title }
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setTitle('')
    setAdding(false)
    onRefresh()
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className={`w-full p-3 text-gray-400 hover:text-white flex items-center justify-center gap-2 ${
          type === 'module'
            ? 'border-2 border-dashed border-gray-600 rounded-xl mt-4 hover:border-gray-400'
            : 'hover:bg-gray-700/50 text-sm'
        }`}
      >
        <Plus size={type === 'module' ? 20 : 16} /> Add {type === 'module' ? 'Module' : 'Lesson'}
      </button>
    )
  }

  return (
    <div
      className={`p-3 ${
        type === 'module' ? 'bg-gray-800 border border-gray-600 rounded-xl mt-4' : 'bg-gray-700/50'
      }`}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`${type} title`}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white mb-2"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') add()
          if (e.key === 'Escape') setAdding(false)
        }}
      />
      <div className="flex gap-2">
        <button onClick={add} className="px-4 py-2 bg-green-600 text-white rounded">
          Add
        </button>
        <button onClick={() => setAdding(false)} className="px-4 py-2 bg-gray-600 text-white rounded">
          Cancel
        </button>
      </div>
    </div>
  )
}

