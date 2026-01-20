'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Eye, Edit2, Save, Check, MoreVertical, FolderPlus, FileText } from 'lucide-react'
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
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [editingCourseTitle, setEditingCourseTitle] = useState(false)
  const [courseTitle, setCourseTitle] = useState(course.title)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState(false)
  const [showModuleMenu, setShowModuleMenu] = useState(false)

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
        // Auto-select first module if exists
        if (data.sections && data.sections.length > 0) {
          setSelectedModule(data.sections[0])
        }
      } catch (error) {
        console.error('Error loading modules:', error)
      } finally {
        setLoading(false)
      }
    }
    loadModules()
  }, [course.id])

  const handleSaveCourseTitle = async () => {
    if (courseTitle === courseData.title) return
    
    try {
      setSaving(true)
      const res = await fetch('/api/courses-v2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: course.id,
          title: courseTitle
        })
      })

      const data = await res.json()
      if (data.error) {
        alert('Error saving: ' + data.error)
        return
      }

      setCourseData({ ...courseData, title: courseTitle })
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
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - Course Structure (Skool-style) */}
      <div className="w-80 flex-shrink-0 border-r border-[rgba(255,255,255,0.1)] flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm mb-4"
          >
            <ArrowLeft size={16} />
            <span>Back to Courses</span>
          </button>

          {/* Course Title with Inline Edit */}
          <div className="flex items-center justify-between group">
            {editingCourseTitle ? (
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                onBlur={() => {
                  setEditingCourseTitle(false)
                  handleSaveCourseTitle()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditingCourseTitle(false)
                    handleSaveCourseTitle()
                  }
                }}
                className="text-lg font-semibold text-white bg-transparent border-b border-cyan-500 outline-none flex-1"
                autoFocus
              />
            ) : (
              <h2
                className="text-lg font-semibold text-white cursor-pointer hover:text-cyan-400 transition-colors"
                onClick={() => isAdmin && setEditingCourseTitle(true)}
              >
                {courseData.title}
              </h2>
            )}
            
            {!isPublished && (
              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                Draft
              </span>
            )}
          </div>
          
          <div className="mt-1 text-xs text-[rgba(255,255,255,0.5)]">0%</div>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-[rgba(255,255,255,0.5)] text-sm">
              Loading...
            </div>
          ) : modules.length === 0 ? (
            <div className="p-4">
              <div
                className="bg-yellow-100/10 border border-yellow-500/20 rounded-lg p-3 cursor-pointer hover:bg-yellow-100/20 transition-colors"
                onClick={() => isAdmin && handleAddModule()}
              >
                <div className="text-sm text-yellow-400">New module</div>
              </div>
            </div>
          ) : (
            <div className="p-2">
              {modules.map((module, index) => (
                <div
                  key={module.id}
                  onClick={() => setSelectedModule(module)}
                  className={`px-3 py-2 rounded-lg cursor-pointer transition-colors mb-1 ${
                    selectedModule?.id === module.id
                      ? 'bg-yellow-400/20 text-white'
                      : 'text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)]'
                  }`}
                >
                  <div className="text-sm font-medium">{module.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer - Add Module */}
        {isAdmin && (
          <div className="p-3 border-t border-[rgba(255,255,255,0.1)] relative">
            <button
              onClick={() => setShowModuleMenu(!showModuleMenu)}
              className="w-full flex items-center justify-center gap-2 p-2 text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            
            {showModuleMenu && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-[rgba(30,30,35,0.98)] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-xl overflow-hidden">
                <button
                  onClick={() => {
                    handleAddModule()
                    setShowModuleMenu(false)
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center gap-3"
                >
                  <FileText size={16} />
                  <span>Add module</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="border-b border-[rgba(255,255,255,0.1)] px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            {selectedModule ? selectedModule.title : 'New module'}
          </h1>
          
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
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm rounded-lg font-semibold transition-all hover:shadow-lg flex items-center gap-2"
              >
                <Eye size={16} />
                Publish Course
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {!selectedModule ? (
            <div className="text-center py-12">
              <p className="text-[rgba(255,255,255,0.5)] mb-4">
                {modules.length === 0 ? 'Create your first module to get started' : 'Select a module to edit'}
              </p>
            </div>
          ) : (
            <div className="max-w-4xl">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[rgba(255,255,255,0.7)] mb-3">MODULE CONTENT</h3>
                <p className="text-[rgba(255,255,255,0.5)]">
                  Add lessons, videos, and content to this module
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => handleAddLesson(selectedModule.id)}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg font-semibold transition-all border border-cyan-500/30 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Lesson
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

