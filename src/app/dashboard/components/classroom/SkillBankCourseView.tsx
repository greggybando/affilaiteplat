'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Eye, Edit2, Save, Check } from 'lucide-react'
import { Course, Module, Lesson } from '@/lib/types/courses'

interface SkillBankCourseViewProps {
  course: Course
  isAdmin: boolean
  onBack: () => void
  onPublish?: () => void
  glowIntensity: number
}

const glowShadow = (shadows: string, glowIntensity: number) => {
  return shadows
}

export function SkillBankCourseView({ 
  course, 
  isAdmin, 
  onBack, 
  onPublish,
  glowIntensity 
}: SkillBankCourseViewProps) {
  const [courseData, setCourseData] = useState(course)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description || '')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState(false)

  const isPublished = (courseData as any).is_published !== false
  const courseColor = courseData.color || '#06B6D4'

  // Fetch modules/sections for this course
  useEffect(() => {
    const loadModules = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/courses-v2/${course.id}/sections`)
        const data = await res.json()
        setModules(data.sections || [])
      } catch (error) {
        console.error('Error loading modules:', error)
      } finally {
        setLoading(false)
      }
    }
    loadModules()
  }, [course.id])

  const handleSaveCourse = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/courses-v2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: course.id,
          title,
          description
        })
      })

      const data = await res.json()
      if (data.error) {
        alert('Error saving: ' + data.error)
        return
      }

      setCourseData({ ...courseData, title, description })
      setSavedMessage(true)
      setTimeout(() => setSavedMessage(false), 2000)
    } catch (error) {
      console.error('Error saving course:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish this course? It will be visible to all users.')) {
      return
    }

    try {
      const res = await fetch('/api/courses-v2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: course.id,
          is_published: true
        })
      })

      const data = await res.json()
      if (data.error) {
        alert('Error publishing: ' + data.error)
        return
      }

      alert('Course published successfully!')
      if (onPublish) onPublish()
      onBack()
    } catch (error) {
      console.error('Error publishing course:', error)
      alert('Failed to publish course')
    }
  }

  const handleAddModule = async () => {
    try {
      const timestamp = Date.now()
      const res = await fetch(`/api/courses-v2/${course.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Module',
          order_index: modules.length
        })
      })

      const data = await res.json()
      if (data.error) {
        alert('Error creating module: ' + data.error)
        return
      }

      // Refetch modules
      const modulesRes = await fetch(`/api/courses-v2/${course.id}/sections`)
      const modulesData = await modulesRes.json()
      setModules(modulesData.sections || [])
    } catch (error) {
      console.error('Error creating module:', error)
      alert('Failed to create module')
    }
  }

  const handleAddLesson = async (moduleId: string) => {
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${moduleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Lesson',
          order_index: 0 // Will be set properly by backend
        })
      })

      const data = await res.json()
      if (data.error) {
        alert('Error creating lesson: ' + data.error)
        return
      }

      // Refetch modules
      const modulesRes = await fetch(`/api/courses-v2/${course.id}/sections`)
      const modulesData = await modulesRes.json()
      setModules(modulesData.sections || [])
    } catch (error) {
      console.error('Error creating lesson:', error)
      alert('Failed to create lesson')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[rgba(255,255,255,0.7)] hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Courses</span>
          </button>

          <div className="flex items-center gap-3">
            {savedMessage && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <Check size={16} />
                Saved
              </span>
            )}
            
            {!isPublished && isAdmin && (
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm rounded-lg font-semibold transition-all hover:shadow-lg"
              >
                <Eye size={16} className="inline mr-2" />
                Publish Course
              </button>
            )}
          </div>
        </div>

        {/* Course Title and Description */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{courseData.emoji || '📚'}</div>
            
            <div className="flex-1">
              {editingTitle && isAdmin ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => {
                    setEditingTitle(false)
                    if (title !== courseData.title) {
                      handleSaveCourse()
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingTitle(false)
                      if (title !== courseData.title) {
                        handleSaveCourse()
                      }
                    }
                  }}
                  className="text-3xl font-bold text-white bg-transparent border-b-2 border-cyan-500 outline-none w-full"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-3xl font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors"
                  onDoubleClick={() => isAdmin && setEditingTitle(true)}
                  style={{ color: isPublished ? 'white' : '#FCD34D' }}
                >
                  {courseData.title}
                  {isAdmin && !editingTitle && (
                    <Edit2 size={20} className="inline ml-2 opacity-50" />
                  )}
                </h1>
              )}
            </div>

            {!isPublished && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full font-semibold border border-yellow-500/30">
                Draft
              </span>
            )}
          </div>

          {editingDescription && isAdmin ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                setEditingDescription(false)
                if (description !== courseData.description) {
                  handleSaveCourse()
                }
              }}
              className="w-full text-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.05)] border border-cyan-500 rounded-lg p-3 outline-none resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <p
              className="text-[rgba(255,255,255,0.7)] cursor-pointer hover:text-white transition-colors"
              onDoubleClick={() => isAdmin && setEditingDescription(true)}
            >
              {courseData.description || 'No description'}
              {isAdmin && !editingDescription && (
                <Edit2 size={16} className="inline ml-2 opacity-50" />
              )}
            </p>
          )}
        </div>
      </div>

      {/* Modules and Lessons */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-white">Loading modules...</div>
        ) : (
          <div className="space-y-6">
            {modules.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[rgba(255,255,255,0.5)] mb-4">No modules yet</p>
                {isAdmin && (
                  <button
                    onClick={handleAddModule}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm rounded-lg font-semibold transition-all"
                  >
                    <Plus size={16} className="inline mr-2" />
                    Add First Module
                  </button>
                )}
              </div>
            ) : (
              <>
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">
                        {index + 1}. {module.title}
                      </h3>
                      {isAdmin && (
                        <button
                          onClick={() => handleAddLesson(module.id)}
                          className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm rounded-lg font-semibold transition-all border border-cyan-500/30"
                        >
                          <Plus size={14} className="inline mr-1" />
                          Add Lesson
                        </button>
                      )}
                    </div>

                    {/* Placeholder for lessons */}
                    <div className="text-[rgba(255,255,255,0.5)] text-sm">
                      Lessons will appear here
                    </div>
                  </div>
                ))}

                {isAdmin && (
                  <button
                    onClick={handleAddModule}
                    className="w-full px-4 py-3 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border-2 border-dashed border-[rgba(255,255,255,0.2)] hover:border-cyan-500 text-[rgba(255,255,255,0.7)] hover:text-white rounded-xl font-semibold transition-all"
                  >
                    <Plus size={20} className="inline mr-2" />
                    Add Module
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

