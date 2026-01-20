'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Eye, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { Course, Module, Lesson } from '@/lib/types/courses'

interface SkillBankCourseViewProps {
  course: Course
  isAdmin: boolean
  onBack: () => void
  onPublish?: () => void
  glowIntensity: number
}

// Helper to generate slug from title
const generateSlug = (title: string): string => {
  const timestamp = Date.now()
  return `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${timestamp}`
}

export function SkillBankCourseView({ 
  course, 
  isAdmin, 
  onBack, 
  onPublish,
  glowIntensity 
}: SkillBankCourseViewProps) {
  const [courseData, setCourseData] = useState(course)
  const [modules, setModules] = useState<any[]>([])
  const [selectedModule, setSelectedModule] = useState<any>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  
  // Editing states
  const [editingCourseTitle, setEditingCourseTitle] = useState(false)
  const [editingCourseDesc, setEditingCourseDesc] = useState(false)
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  
  const [courseTitle, setCourseTitle] = useState(course.title)
  const [courseDesc, setCourseDesc] = useState(course.description || '')
  const [saving, setSaving] = useState(false)

  const isPublished = (courseData as any).is_published !== false

  // Fetch modules with lessons
  useEffect(() => {
    loadModules()
  }, [course.id])

  const loadModules = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/courses-v2/${course.id}/sections`)
      const data = await res.json()
      
      // Fetch lessons for each module
      const modulesWithLessons = await Promise.all(
        (data.sections || []).map(async (module: any) => {
          try {
            const lessonsRes = await fetch(`/api/courses-v2/${course.id}/sections/${module.id}/lessons`)
            const lessonsData = await lessonsRes.json()
            return {
              ...module,
              lessons: lessonsData.lessons || []
            }
          } catch (error) {
            return { ...module, lessons: [] }
          }
        })
      )
      
      setModules(modulesWithLessons)
      if (modulesWithLessons.length > 0 && !selectedModule) {
        setSelectedModule(modulesWithLessons[0])
        setExpandedModules(new Set([modulesWithLessons[0].id]))
      }
    } catch (error) {
      console.error('Error loading modules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCourse = async (updates: any) => {
    try {
      setSaving(true)
      const res = await fetch('/api/courses-v2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: course.id, ...updates })
      })
      const data = await res.json()
      if (!data.error) {
        setCourseData({ ...courseData, ...updates })
      }
    } catch (error) {
      console.error('Error saving course:', error)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!confirm('Publish this course? It will be visible to all users.')) return
    
    try {
      const res = await fetch('/api/courses-v2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: course.id, is_published: true })
      })
      
      if (!res.ok) {
        alert('Failed to publish course')
        return
      }
      
      alert('Course published!')
      if (onPublish) onPublish()
      onBack()
    } catch (error) {
      console.error('Error publishing:', error)
      alert('Failed to publish course')
    }
  }

  const handleAddModule = async () => {
    try {
      const newTitle = 'Untitled Module'
      const res = await fetch(`/api/courses-v2/${course.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          slug: generateSlug(newTitle),
          order_index: modules.length
        })
      })
      
      const data = await res.json()
      if (data.error) {
        alert('Error creating module: ' + data.error)
        return
      }
      
      await loadModules()
      // Focus on the new module
      if (data.section || data.module) {
        const newModule = data.section || data.module
        setEditingModuleId(newModule.id)
      }
    } catch (error) {
      console.error('Error creating module:', error)
    }
  }

  const handleAddLesson = async (moduleId: string) => {
    try {
      const newTitle = 'Untitled Lesson'
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${moduleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          slug: generateSlug(newTitle),
          order_index: 0
        })
      })
      
      const data = await res.json()
      if (data.error) {
        alert('Error creating lesson: ' + data.error)
        return
      }
      
      await loadModules()
      // Focus on the new lesson
      if (data.lesson) {
        setEditingLessonId(data.lesson.id)
      }
    } catch (error) {
      console.error('Error creating lesson:', error)
    }
  }

  const handleUpdateModule = async (moduleId: string, updates: any) => {
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) return
      
      await loadModules()
    } catch (error) {
      console.error('Error updating module:', error)
    }
  }

  const handleUpdateLesson = async (moduleId: string, lessonId: string, updates: any) => {
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${moduleId}/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) return
      
      await loadModules()
    } catch (error) {
      console.error('Error updating lesson:', error)
    }
  }

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module? This cannot be undone.')) return
    
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${moduleId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        alert('Failed to delete module')
        return
      }
      
      await loadModules()
      if (selectedModule?.id === moduleId) {
        setSelectedModule(null)
      }
    } catch (error) {
      console.error('Error deleting module:', error)
    }
  }

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Delete this lesson? This cannot be undone.')) return
    
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${moduleId}/lessons/${lessonId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        alert('Failed to delete lesson')
        return
      }
      
      await loadModules()
    } catch (error) {
      console.error('Error deleting lesson:', error)
    }
  }

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#1a1a1a]">
      {/* Left Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-[rgba(255,255,255,0.1)] flex flex-col bg-[#1f1f1f]">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm mb-4"
          >
            <ArrowLeft size={16} />
            Back to Courses
          </button>

          {/* Course Title */}
          <div className="mb-2">
            {editingCourseTitle ? (
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                onBlur={() => {
                  setEditingCourseTitle(false)
                  if (courseTitle !== courseData.title) {
                    handleSaveCourse({ title: courseTitle })
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditingCourseTitle(false)
                    if (courseTitle !== courseData.title) {
                      handleSaveCourse({ title: courseTitle })
                    }
                  }
                }}
                className="w-full text-lg font-semibold text-white bg-transparent border-b border-cyan-500 outline-none px-0"
                autoFocus
              />
            ) : (
              <h2
                onDoubleClick={() => isAdmin && setEditingCourseTitle(true)}
                className="text-lg font-semibold text-white cursor-pointer hover:text-cyan-400 transition-colors"
              >
                {courseData.title}
              </h2>
            )}
          </div>

          {/* Course Description */}
          <div className="mb-3">
            {editingCourseDesc ? (
              <textarea
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                onBlur={() => {
                  setEditingCourseDesc(false)
                  if (courseDesc !== courseData.description) {
                    handleSaveCourse({ description: courseDesc })
                  }
                }}
                className="w-full text-sm text-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded p-2 outline-none resize-none"
                rows={3}
                autoFocus
              />
            ) : (
              <p
                onClick={() => isAdmin && setEditingCourseDesc(true)}
                className="text-sm text-[rgba(255,255,255,0.6)] cursor-pointer hover:text-[rgba(255,255,255,0.8)] transition-colors"
              >
                {courseData.description || 'Click to add description'}
              </p>
            )}
          </div>

          {!isPublished && (
            <div className="flex items-center gap-2 text-yellow-400 text-xs">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              Draft
            </div>
          )}
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-[rgba(255,255,255,0.5)] text-sm">Loading...</div>
          ) : (
            <div className="p-2">
              {modules.map((module, index) => (
                <div key={module.id} className="mb-1">
                  <div
                    className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                      selectedModule?.id === module.id
                        ? 'bg-[rgba(255,255,255,0.1)] text-white'
                        : 'text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="p-0.5"
                    >
                      {expandedModules.has(module.id) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    
                    {editingModuleId === module.id ? (
                      <input
                        type="text"
                        defaultValue={module.title}
                        onBlur={(e) => {
                          setEditingModuleId(null)
                          if (e.target.value !== module.title) {
                            handleUpdateModule(module.id, { 
                              title: e.target.value,
                              slug: generateSlug(e.target.value)
                            })
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingModuleId(null)
                            if ((e.target as HTMLInputElement).value !== module.title) {
                              handleUpdateModule(module.id, { 
                                title: (e.target as HTMLInputElement).value,
                                slug: generateSlug((e.target as HTMLInputElement).value)
                              })
                            }
                          }
                        }}
                        className="flex-1 bg-transparent border-b border-cyan-500 outline-none text-sm"
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => setSelectedModule(module)}
                        onDoubleClick={() => isAdmin && setEditingModuleId(module.id)}
                        className="flex-1 text-sm"
                      >
                        {module.title}
                      </div>
                    )}
                    
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteModule(module.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Lessons under module */}
                  {expandedModules.has(module.id) && module.lessons && module.lessons.length > 0 && (
                    <div className="ml-6 mt-1">
                      {module.lessons.map((lesson: any) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] text-sm group"
                        >
                          {editingLessonId === lesson.id ? (
                            <input
                              type="text"
                              defaultValue={lesson.title}
                              onBlur={(e) => {
                                setEditingLessonId(null)
                                if (e.target.value !== lesson.title) {
                                  handleUpdateLesson(module.id, lesson.id, {
                                    title: e.target.value,
                                    slug: generateSlug(e.target.value)
                                  })
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingLessonId(null)
                                  if ((e.target as HTMLInputElement).value !== lesson.title) {
                                    handleUpdateLesson(module.id, lesson.id, {
                                      title: (e.target as HTMLInputElement).value,
                                      slug: generateSlug((e.target as HTMLInputElement).value)
                                    })
                                  }
                                }
                              }}
                              className="flex-1 bg-transparent border-b border-cyan-500 outline-none text-xs"
                              autoFocus
                            />
                          ) : (
                            <div
                              onDoubleClick={() => isAdmin && setEditingLessonId(lesson.id)}
                              className="flex-1 cursor-pointer"
                            >
                              {lesson.title}
                            </div>
                          )}
                          
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteLesson(module.id, lesson.id)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Module Button */}
        {isAdmin && (
          <div className="p-3 border-t border-[rgba(255,255,255,0.1)]">
            <button
              onClick={handleAddModule}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"
            >
              <Plus size={16} />
              Add Module
            </button>
          </div>
        )}
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 border-b border-[rgba(255,255,255,0.1)] px-6 flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-semibold text-white">
            {selectedModule ? selectedModule.title : 'Select a module'}
          </h1>
          
          {!isPublished && isAdmin && (
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Eye size={16} />
              Publish Course
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedModule ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[rgba(255,255,255,0.5)]">
                {modules.length === 0 ? 'Add your first module to get started' : 'Select a module from the sidebar'}
              </p>
            </div>
          ) : (
            <div className="max-w-3xl">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-4">
                  Lessons
                </h3>
                
                {selectedModule.lessons && selectedModule.lessons.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {selectedModule.lessons.map((lesson: any) => (
                      <div
                        key={lesson.id}
                        className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-4"
                      >
                        <div className="font-medium text-white mb-2">{lesson.title}</div>
                        <input
                          type="text"
                          placeholder="Video URL (YouTube or Loom)"
                          defaultValue={lesson.video_url || ''}
                          onBlur={(e) => {
                            if (e.target.value !== lesson.video_url) {
                              handleUpdateLesson(selectedModule.id, lesson.id, {
                                video_url: e.target.value
                              })
                            }
                          }}
                          className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[rgba(255,255,255,0.4)] text-sm mb-4">No lessons yet</p>
                )}

                {isAdmin && (
                  <button
                    onClick={() => handleAddLesson(selectedModule.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg font-semibold transition-colors"
                  >
                    <Plus size={16} />
                    Add Lesson
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
