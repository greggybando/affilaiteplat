'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Eye, ChevronDown, ChevronRight, Upload, Paperclip } from 'lucide-react'
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
  const [sections, setSections] = useState<any[]>([])
  const [selectedSection, setSelectedSection] = useState<any>(null)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  
  // Editing states
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [lessonNotes, setLessonNotes] = useState('')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  
  const [saving, setSaving] = useState(false)

  const isPublished = (courseData as any).is_published !== false
  const courseColor = courseData.color || '#06B6D4'
  const rgbValues = courseColor.match(/\w\w/g)?.map((x) => parseInt(x, 16)).join(',') || '6,182,212'

  // Fetch sections with lessons
  useEffect(() => {
    loadSections()
  }, [course.id])

  // Update notes and video URL when lesson changes
  useEffect(() => {
    if (selectedLesson) {
      setLessonNotes(selectedLesson.description || '')
      setLessonVideoUrl(selectedLesson.video_url || '')
    }
  }, [selectedLesson])

  const loadSections = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/courses-v2/${course.id}/sections`)
      const data = await res.json()
      
      // Fetch lessons for each section
      const sectionsWithLessons = await Promise.all(
        (data.sections || []).map(async (section: any) => {
          try {
            const lessonsRes = await fetch(`/api/courses-v2/${course.id}/sections/${section.id}/lessons`)
            const lessonsData = await lessonsRes.json()
            return {
              ...section,
              lessons: lessonsData.lessons || []
            }
          } catch (error) {
            return { ...section, lessons: [] }
          }
        })
      )
      
      setSections(sectionsWithLessons)
      
      // Auto-expand first section and select first lesson if available
      if (sectionsWithLessons.length > 0) {
        const firstSection = sectionsWithLessons[0]
        setExpandedSections(new Set([firstSection.id]))
        if (firstSection.lessons && firstSection.lessons.length > 0) {
          setSelectedSection(firstSection)
          setSelectedLesson(firstSection.lessons[0])
        }
      }
    } catch (error) {
      console.error('Error loading sections:', error)
    } finally {
      setLoading(false)
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

  const handleAddSection = async () => {
    try {
      const newTitle = 'Untitled Section'
      const res = await fetch(`/api/courses-v2/${course.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          slug: generateSlug(newTitle),
          order_index: sections.length
        })
      })
      
      const data = await res.json()
      if (data.error) {
        alert('Error creating section: ' + data.error)
        return
      }
      
      await loadSections()
      // Focus on the new section
      if (data.section || data.module) {
        const newSection = data.section || data.module
        setEditingSectionId(newSection.id)
      }
    } catch (error) {
      console.error('Error creating section:', error)
    }
  }

  const handleAddLesson = async (sectionId: string) => {
    try {
      const newTitle = 'Untitled Lesson'
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${sectionId}/lessons`, {
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
      
      await loadSections()
      // Auto-select the new lesson
      if (data.lesson) {
        setSelectedLesson(data.lesson)
        setEditingLessonId(data.lesson.id)
      }
    } catch (error) {
      console.error('Error creating lesson:', error)
    }
  }

  const handleUpdateSection = async (sectionId: string, updates: any) => {
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) return
      
      await loadSections()
    } catch (error) {
      console.error('Error updating section:', error)
    }
  }

  const handleUpdateLesson = async (sectionId: string, lessonId: string, updates: any) => {
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${sectionId}/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) return
      
      // Update local state
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson({ ...selectedLesson, ...updates })
      }
      
      await loadSections()
    } catch (error) {
      console.error('Error updating lesson:', error)
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section? This cannot be undone.')) return
    
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${sectionId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        alert('Failed to delete section')
        return
      }
      
      await loadSections()
      if (selectedSection?.id === sectionId) {
        setSelectedSection(null)
        setSelectedLesson(null)
      }
    } catch (error) {
      console.error('Error deleting section:', error)
    }
  }

  const handleDeleteLesson = async (sectionId: string, lessonId: string) => {
    if (!confirm('Delete this lesson? This cannot be undone.')) return
    
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/${sectionId}/lessons/${lessonId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        alert('Failed to delete lesson')
        return
      }
      
      await loadSections()
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson(null)
      }
    } catch (error) {
      console.error('Error deleting lesson:', error)
    }
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  // Auto-save lesson notes
  const handleNotesChange = (value: string) => {
    setLessonNotes(value)
    
    // Debounced save
    if (selectedLesson && selectedSection) {
      clearTimeout((window as any).notesSaveTimer)
      ;(window as any).notesSaveTimer = setTimeout(() => {
        handleUpdateLesson(selectedSection.id, selectedLesson.id, { description: value })
      }, 1000)
    }
  }

  // Save video URL on blur
  const handleVideoUrlBlur = () => {
    if (selectedLesson && selectedSection && lessonVideoUrl !== selectedLesson.video_url) {
      handleUpdateLesson(selectedSection.id, selectedLesson.id, { video_url: lessonVideoUrl })
    }
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Background gradient - matching dashboard */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(circle at 20% 50%, rgba(${rgbValues}, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(${rgbValues}, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 40% 20%, rgba(${rgbValues}, 0.1) 0%, transparent 40%)
            `
          }}
        />
      </div>

      {/* Left Sidebar */}
      <div 
        className="w-80 flex-shrink-0 flex flex-col relative z-10"
        style={{
          background: 'rgba(20,20,25,0.85)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)]">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm mb-4"
          >
            <ArrowLeft size={16} />
            Back to Courses
          </button>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-white">{courseData.title}</h2>
            {!isPublished && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                Draft
              </span>
            )}
          </div>

          {!isPublished && isAdmin && (
            <button
              onClick={handlePublish}
              className="w-full mt-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Eye size={14} />
              Publish Course
            </button>
          )}
        </div>

        {/* Add Section Button */}
        {isAdmin && (
          <div className="p-3 border-b border-[rgba(255,255,255,0.1)]">
            <button
              onClick={handleAddSection}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white transition-colors"
            >
              <Plus size={16} />
              Add Section
            </button>
          </div>
        )}

        {/* Course Sections Header */}
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            Course Sections
          </h3>
        </div>

        {/* Sections List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="p-4 text-center text-[rgba(255,255,255,0.5)] text-sm">Loading...</div>
          ) : sections.length === 0 ? (
            <div className="p-4 text-center text-[rgba(255,255,255,0.4)] text-sm">
              No sections yet. Click "Add Section" to create one.
            </div>
          ) : (
            <div className="space-y-1">
              {sections.map((section, index) => (
                <div key={section.id}>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
                      selectedSection?.id === section.id
                        ? 'bg-[rgba(255,255,255,0.15)]'
                        : 'hover:bg-[rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="p-0.5 text-[rgba(255,255,255,0.6)] hover:text-white"
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    
                    {editingSectionId === section.id ? (
                      <input
                        type="text"
                        defaultValue={section.title}
                        onBlur={(e) => {
                          setEditingSectionId(null)
                          if (e.target.value !== section.title) {
                            handleUpdateSection(section.id, { 
                              title: e.target.value,
                              slug: generateSlug(e.target.value)
                            })
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingSectionId(null)
                            if ((e.target as HTMLInputElement).value !== section.title) {
                              handleUpdateSection(section.id, { 
                                title: (e.target as HTMLInputElement).value,
                                slug: generateSlug((e.target as HTMLInputElement).value)
                              })
                            }
                          }
                        }}
                        className="flex-1 bg-transparent border-b border-cyan-500 outline-none text-sm text-white"
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setSelectedSection(section)
                          if (section.lessons && section.lessons.length > 0) {
                            setSelectedLesson(section.lessons[0])
                          } else {
                            setSelectedLesson(null)
                          }
                        }}
                        onDoubleClick={() => isAdmin && setEditingSectionId(section.id)}
                        className="flex-1 text-sm font-medium text-white"
                      >
                        {section.title}
                      </div>
                    )}
                    
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity text-[rgba(255,255,255,0.6)]"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Lessons under section */}
                  {expandedSections.has(section.id) && section.lessons && section.lessons.length > 0 && (
                    <div className="ml-7 mt-1 space-y-1">
                      {section.lessons.map((lesson: any) => (
                        <div
                          key={lesson.id}
                          onClick={() => {
                            setSelectedSection(section)
                            setSelectedLesson(lesson)
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all group text-sm ${
                            selectedLesson?.id === lesson.id
                              ? 'bg-[rgba(6,182,212,0.2)] text-cyan-300'
                              : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                          }`}
                        >
                          {editingLessonId === lesson.id ? (
                            <input
                              type="text"
                              defaultValue={lesson.title}
                              onBlur={(e) => {
                                setEditingLessonId(null)
                                if (e.target.value !== lesson.title) {
                                  handleUpdateLesson(section.id, lesson.id, {
                                    title: e.target.value,
                                    slug: generateSlug(e.target.value)
                                  })
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingLessonId(null)
                                  if ((e.target as HTMLInputElement).value !== lesson.title) {
                                    handleUpdateLesson(section.id, lesson.id, {
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
                              className="flex-1"
                            >
                              {lesson.title}
                            </div>
                          )}
                          
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteLesson(section.id, lesson.id)
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
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
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {!selectedLesson ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[rgba(255,255,255,0.5)] text-lg">
              {selectedSection ? 'Select a lesson to start' : 'Select a section to view lessons'}
            </p>
            
            {selectedSection && isAdmin && (
              <button
                onClick={() => handleAddLesson(selectedSection.id)}
                className="ml-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add First Lesson
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              {/* Lesson Title */}
              <h1 className="text-3xl font-bold text-white mb-6">{selectedLesson.title}</h1>

              {/* Video URL Section */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[rgba(255,255,255,0.7)] mb-2">
                  Video URL (YouTube or Loom)
                </label>
                <input
                  type="text"
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  onBlur={handleVideoUrlBlur}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-[rgba(255,255,255,0.05)] backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition-colors"
                  disabled={!isAdmin}
                />
              </div>

              {/* Notes Section - Apple Notes Style */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[rgba(255,255,255,0.7)] mb-2">
                  Lesson Notes
                </label>
                <textarea
                  value={lessonNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Start typing your notes here..."
                  className="w-full min-h-[300px] bg-[rgba(255,255,255,0.05)] backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition-colors resize-none font-sans"
                  style={{ lineHeight: '1.6' }}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-[rgba(255,255,255,0.4)] mt-2">
                  {saving ? 'Saving...' : 'Auto-saves as you type'}
                </p>
              </div>

              {/* Attachments Section */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[rgba(255,255,255,0.7)] mb-2">
                  Attachments
                </label>
                <div className="border-2 border-dashed border-[rgba(255,255,255,0.2)] rounded-lg p-6 text-center hover:border-cyan-500 transition-colors cursor-pointer bg-[rgba(255,255,255,0.02)]">
                  <Upload size={32} className="mx-auto mb-2 text-[rgba(255,255,255,0.4)]" />
                  <p className="text-sm text-[rgba(255,255,255,0.6)] mb-1">
                    Drop files here or click to upload
                  </p>
                  <p className="text-xs text-[rgba(255,255,255,0.4)]">
                    PDFs, images, documents, etc.
                  </p>
                </div>
              </div>

              {/* Add Lesson Button (bottom) */}
              {isAdmin && selectedSection && (
                <button
                  onClick={() => handleAddLesson(selectedSection.id)}
                  className="mt-8 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Another Lesson
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
