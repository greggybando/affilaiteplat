'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Eye, GripVertical, ChevronDown, ChevronRight, Upload, Paperclip, Check } from 'lucide-react'
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

const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '6,182,212'
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
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  
  // Editing states
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editingLessonTitle, setEditingLessonTitle] = useState<string>('')
  const [editingCourseTitle, setEditingCourseTitle] = useState(false)
  const [courseTitle, setCourseTitle] = useState(course.title)
  
  const [lessonNotes, setLessonNotes] = useState('')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  const [lessonAttachments, setLessonAttachments] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  
  const [saving, setSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const isPublished = (courseData as any).is_published !== false
  const courseColor = courseData.color || '#06B6D4'
  const rgbValues = hexToRgb(courseColor)

  // Extract video ID helpers
  const extractYouTubeId = (url: string): string => {
    if (!url) return ''
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0]
    if (url.includes('youtube.com/watch?v=')) return url.split('v=')[1].split('&')[0]
    if (url.includes('youtube.com/embed/')) return url.split('embed/')[1].split('?')[0]
    return url
  }

  const extractLoomId = (url: string): string => {
    const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
    return match ? match[1] : ''
  }

  // Fetch sections with lessons
  useEffect(() => {
    loadSections()
  }, [course.id])

  // Update when lesson changes
  useEffect(() => {
    if (selectedLesson) {
      setLessonNotes(selectedLesson.description || '')
      setLessonVideoUrl(selectedLesson.video_url || '')
      loadLessonAttachments()
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
      
      // Only auto-expand/select on initial load, not on reloads
      if (sections.length === 0 && sectionsWithLessons.length > 0) {
        const firstSection = sectionsWithLessons[0]
        setExpandedSections(new Set([firstSection.id]))
        if (firstSection.lessons && firstSection.lessons.length > 0) {
          setSelectedSectionId(firstSection.id)
          setSelectedLesson(firstSection.lessons[0])
        }
      } else {
        // Preserve current selection after reload
        if (selectedLesson) {
          const updatedSection = sectionsWithLessons.find(s => s.id === selectedSectionId)
          const updatedLesson = updatedSection?.lessons?.find((l: any) => l.id === selectedLesson.id)
          if (updatedLesson) {
            setSelectedLesson(updatedLesson)
          }
        }
      }
      
      return sectionsWithLessons
    } catch (error) {
      console.error('Error loading sections:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const loadLessonAttachments = async () => {
    if (!selectedLesson) {
      console.log('[CLIENT] No lesson selected, skipping attachment load')
      return
    }
    
    console.log('[CLIENT] 📥 Loading attachments for lesson:', selectedLesson.id)
    
    try {
      const res = await fetch(`/api/courses-v2/lesson-attachments?lessonId=${selectedLesson.id}`)
      console.log('[CLIENT] Attachments response:', res.status, res.statusText)
      
      const data = await res.json()
      console.log('[CLIENT] Attachments data:', data)
      
      if (data.error) {
        console.error('[CLIENT] Error loading attachments:', data.error)
        setLessonAttachments([])
      } else {
        setLessonAttachments(data.attachments || [])
        console.log('[CLIENT] ✅ Loaded', data.attachments?.length || 0, 'attachments')
      }
    } catch (error: any) {
      console.error('[CLIENT] ❌ Error loading attachments:', error)
      setLessonAttachments([])
    }
  }

  const showSavedIndicator = () => {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
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

  const handleSaveCourseTitle = async () => {
    if (courseTitle === courseData.title) return
    
    try {
      const res = await fetch('/api/courses-v2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: course.id, title: courseTitle })
      })
      
      if (!res.ok) return
      setCourseData({ ...courseData, title: courseTitle })
      showSavedIndicator()
    } catch (error) {
      console.error('Error saving course title:', error)
    }
  }

  const handleAddSection = async () => {
    try {
      const newTitle = 'UNTITLED SECTION'
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
      showSavedIndicator()
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
      console.log('Adding lesson:', { courseId: course.id, sectionId, newTitle })
      
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
      console.log('Add lesson response:', res.status, data)
      
      if (data.error) {
        console.error('Error creating lesson:', data.error)
        alert('Error creating lesson: ' + data.error)
        return
      }
      
      if (!res.ok) {
        console.error('Failed to create lesson:', res.status, data)
        alert(`Failed to create lesson (${res.status}). Check console for details.`)
        return
      }
      
      // Reload sections to get the new lesson
      await loadSections()
      showSavedIndicator()
      
      // Find and select the new lesson
      if (data.lesson) {
        setSelectedLesson(data.lesson)
        setSelectedSectionId(sectionId)
        setEditingLessonId(data.lesson.id)
        setEditingLessonTitle(data.lesson.title || 'Untitled Lesson')
        // Make sure section is expanded
        setExpandedSections(prev => new Set([...prev, sectionId]))
      }
    } catch (error) {
      console.error('Error creating lesson:', error)
      alert('Failed to create lesson. Please try again.')
    }
  }

  const handleUpdateSection = async (sectionId: string, updates: any) => {
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sectionId, ...updates })
      })
      
      if (!res.ok) {
        console.error('Failed to update section')
        return
      }
      
      // Update local state immediately
      setSections(prevSections => 
        prevSections.map(s => 
          s.id === sectionId ? { ...s, ...updates } : s
        )
      )
      
      showSavedIndicator()
    } catch (error) {
      console.error('Error updating section:', error)
    }
  }

  const handleUpdateLesson = async (sectionId: string, lessonId: string, updates: any) => {
    console.log('[CLIENT] ===== handleUpdateLesson CALLED =====')
    console.log('[CLIENT] Section ID:', sectionId, typeof sectionId)
    console.log('[CLIENT] Lesson ID:', lessonId, typeof lessonId)
    console.log('[CLIENT] Updates:', updates)
    console.log('[CLIENT] Course:', course)
    console.log('[CLIENT] Course ID:', course?.id, typeof course?.id)
    
    try {
      // Ensure we have valid IDs
      if (!course?.id || !sectionId || !lessonId) {
        console.error('[CLIENT] ❌ Missing required IDs:', { 
          courseId: course?.id, 
          sectionId, 
          lessonId,
          course: course
        })
        alert('Error: Missing course or section information')
        return false
      }

      const url = `/api/courses-v2/${course.id}/sections/${sectionId}/lessons`
      const body = { id: lessonId, ...updates }
      
      console.log('[CLIENT] 📤 Sending PATCH request:')
      console.log('[CLIENT]   URL:', url)
      console.log('[CLIENT]   Method: PATCH')
      console.log('[CLIENT]   Body:', JSON.stringify(body, null, 2))
      console.log('[CLIENT]   Full URL:', window.location.origin + url)
      
      const startTime = Date.now()
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })
      const duration = Date.now() - startTime
      
      console.log('[CLIENT] 📥 Response received:', {
        status: res.status,
        statusText: res.statusText,
        duration: `${duration}ms`,
        headers: Object.fromEntries(res.headers.entries())
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        let errorData = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `HTTP ${res.status}` }
        }
        
        console.error('[CLIENT] ❌ UPDATE FAILED:')
        console.error('[CLIENT]   Status:', res.status, res.statusText)
        console.error('[CLIENT]   Error data:', errorData)
        console.error('[CLIENT]   Error text:', errorText)
        
        alert(`Failed to save: ${errorData.error || `HTTP ${res.status}`}\n\nCheck console for details.`)
        return false
      }
      
      const data = await res.json()
      console.log('[CLIENT] ✅ UPDATE SUCCESS:')
      console.log('[CLIENT]   Response data:', JSON.stringify(data, null, 2))
      
      if (!data.lesson) {
        console.error('[CLIENT] ⚠️ No lesson in response:', data)
        console.log('[CLIENT] Reloading sections...')
        await loadSections()
        return true
      }
      
      const updatedLesson = data.lesson
      console.log('[CLIENT] 📝 Updated lesson object:', updatedLesson)
      
      // Update state immediately
      console.log('[CLIENT] 🔄 Updating local state...')
      setSections(prevSections => {
        const updated = prevSections.map(section => {
          if (section.id === sectionId) {
            const updatedLessons = section.lessons?.map((lesson: any) => 
              lesson.id === lessonId ? updatedLesson : lesson
            )
            console.log('[CLIENT]   Section found, updating lessons:', {
              sectionId: section.id,
              oldLessons: section.lessons,
              newLessons: updatedLessons
            })
            return {
              ...section,
              lessons: updatedLessons
            }
          }
          return section
        })
        console.log('[CLIENT]   Updated sections:', updated)
        return updated
      })
      
      // Update selected lesson
      if (selectedLesson?.id === lessonId) {
        console.log('[CLIENT] 🔄 Updating selected lesson:', updatedLesson)
        setSelectedLesson(updatedLesson)
      }
      
      // Update editing state
      if (updates.title) {
        console.log('[CLIENT] 🔄 Updating editing title:', updates.title)
        setEditingLessonTitle(updates.title)
      }
      
      console.log('[CLIENT] ✅ State update complete')
      showSavedIndicator()
      return true
    } catch (error: any) {
      console.error('[CLIENT] ❌ EXCEPTION in handleUpdateLesson:')
      console.error('[CLIENT]   Error:', error)
      console.error('[CLIENT]   Error message:', error.message)
      console.error('[CLIENT]   Error stack:', error.stack)
      alert(`Error: ${error.message || 'Failed to save lesson'}\n\nCheck console for details.`)
      return false
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section and all its lessons? This cannot be undone.')) return
    
    try {
      console.log('Deleting section:', sectionId, 'from course:', course.id)
      const res = await fetch(`/api/courses-v2/${course.id}/sections?id=${sectionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await res.json().catch(() => ({}))
      
      console.log('Delete section response:', res.status, data)
      
      if (!res.ok) {
        console.error('Delete section failed:', res.status, data)
        alert(data.error || `Failed to delete section (${res.status})`)
        return
      }
      
      // Update local state immediately
      setSections(prevSections => prevSections.filter(s => s.id !== sectionId))
      
      // Clear selection if this was the selected section
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null)
        setSelectedLesson(null)
      }
      
      showSavedIndicator()
    } catch (error) {
      console.error('Error deleting section:', error)
      alert('Failed to delete section. Please try again.')
    }
  }

  const handleDeleteLesson = async (sectionId: string, lessonId: string) => {
    if (!confirm('Delete this lesson? This cannot be undone.')) return
    
    try {
      const url = `/api/courses-v2/${course.id}/sections/${sectionId}/lessons?id=${lessonId}`
      console.log('Deleting lesson:', { courseId: course.id, sectionId, lessonId, url })
      
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      console.log('Delete lesson response status:', res.status)
      
      let data = {}
      try {
        const text = await res.text()
        console.log('Delete lesson response text:', text)
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        console.error('Failed to parse response:', e)
      }
      
      if (!res.ok) {
        console.error('Delete lesson failed:', res.status, data)
        alert(data.error || `Failed to delete lesson (${res.status}). Check console for details.`)
        return
      }
      
      console.log('Lesson deleted successfully, updating UI')
      
      // Update local state immediately
      setSections(prevSections => 
        prevSections.map(section => {
          if (section.id === sectionId) {
            const filteredLessons = section.lessons?.filter((lesson: any) => lesson.id !== lessonId) || []
            console.log('Filtered lessons:', filteredLessons.length, 'from', section.lessons?.length)
            return {
              ...section,
              lessons: filteredLessons
            }
          }
          return section
        })
      )
      
      // Clear selection if this was the selected lesson
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson(null)
      }
      
      showSavedIndicator()
    } catch (error) {
      console.error('Error deleting lesson:', error)
      alert('Failed to delete lesson. Please check console for details.')
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

  // Auto-save notes
  const handleNotesChange = (value: string) => {
    setLessonNotes(value)
    
    if (selectedLesson && selectedSectionId && isAdmin) {
      clearTimeout((window as any).notesSaveTimer)
      ;(window as any).notesSaveTimer = setTimeout(() => {
        handleUpdateLesson(selectedSectionId, selectedLesson.id, { description: value })
      }, 1500)
    }
  }

  // Auto-save video URL
  const handleVideoUrlBlur = () => {
    if (selectedLesson && selectedSectionId && lessonVideoUrl !== selectedLesson.video_url && isAdmin) {
      handleUpdateLesson(selectedSectionId, selectedLesson.id, { video_url: lessonVideoUrl })
    }
  }

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      console.log('[CLIENT] No files selected')
      return
    }
    
    if (!selectedLesson) {
      console.error('[CLIENT] No lesson selected')
      alert('Please select a lesson first')
      return
    }
    
    console.log('[CLIENT] 📤 Uploading files:', {
      fileCount: files.length,
      lessonId: selectedLesson.id,
      files: Array.from(files).map(f => ({ name: f.name, size: f.size }))
    })
    
    setUploadingFile(true)
    
    try {
      for (const file of Array.from(files)) {
        console.log('[CLIENT] Uploading file:', file.name)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('lessonId', selectedLesson.id)
        
        const res = await fetch('/api/courses-v2/lesson-attachments', {
          method: 'POST',
          body: formData
        })
        
        console.log('[CLIENT] Upload response:', res.status, res.statusText)
        
        const data = await res.json()
        if (data.error) {
          console.error('[CLIENT] Upload error:', data.error)
          alert(`Error uploading ${file.name}: ${data.error}`)
        } else {
          console.log('[CLIENT] ✅ File uploaded:', data.attachment)
        }
      }
      
      console.log('[CLIENT] Reloading attachments...')
      await loadLessonAttachments()
      showSavedIndicator()
      console.log('[CLIENT] ✅ All files uploaded successfully')
    } catch (error: any) {
      console.error('[CLIENT] ❌ Error uploading file:', error)
      alert(`Failed to upload file: ${error.message || 'Unknown error'}`)
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return
    
    console.log('[CLIENT] ===== DELETE ATTACHMENT =====')
    console.log('[CLIENT] Attachment ID:', attachmentId)
    console.log('[CLIENT] URL:', `/api/courses-v2/lesson-attachments?id=${attachmentId}`)
    
    try {
      const url = `/api/courses-v2/lesson-attachments?id=${attachmentId}`
      console.log('[CLIENT] Sending DELETE request to:', url)
      
      const res = await fetch(url, {
        method: 'DELETE'
      })
      
      console.log('[CLIENT] Response received:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries())
      })
      
      const responseText = await res.text()
      console.log('[CLIENT] Response text:', responseText)
      
      let data = {}
      try {
        data = JSON.parse(responseText)
        console.log('[CLIENT] Parsed response data:', data)
      } catch (parseError) {
        console.error('[CLIENT] Failed to parse response:', parseError)
        console.error('[CLIENT] Raw response:', responseText)
      }
      
      if (!res.ok) {
        console.error('[CLIENT] ❌ DELETE FAILED:')
        console.error('[CLIENT]   Status:', res.status)
        console.error('[CLIENT]   Data:', data)
        alert(`Failed to delete attachment: ${(data as any).error || (data as any).details || `HTTP ${res.status}`}`)
        return
      }
      
      console.log('[CLIENT] ✅ DELETE SUCCESS:', data)
      
      // Reload attachments to update UI
      await loadLessonAttachments()
      showSavedIndicator()
    } catch (error: any) {
      console.error('[CLIENT] ❌ EXCEPTION:')
      console.error('[CLIENT]   Error:', error)
      console.error('[CLIENT]   Message:', error.message)
      console.error('[CLIENT]   Stack:', error.stack)
      alert(`Failed to delete attachment: ${error.message || 'Unknown error'}`)
    }
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Color Splash Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 20% 50%, rgba(${rgbValues}, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(${rgbValues}, 0.08) 0%, transparent 50%)
            `
          }}
        />
      </div>

      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-16 border-b border-[rgba(255,255,255,0.1)] px-6 flex items-center justify-between z-20 bg-[rgba(15,15,26,0.8)] backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to Courses
        </button>

        <div className="flex items-center gap-3">
          {!isPublished && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
              Draft
            </span>
          )}
          
          {showSaved && (
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <Check size={14} />
              Saved
            </span>
          )}
          
          {!isPublished && isAdmin && (
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Eye size={14} />
              Publish Course
            </button>
          )}
        </div>
      </div>

      {/* Main Content - offset by header */}
      <div className="flex w-full h-full pt-16">
        {/* Left Sidebar - Course Modules */}
        <div 
          className="w-80 rounded-lg overflow-hidden flex flex-col max-h-full sticky top-4 z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(35,35,40,0.95) 0%, rgba(30,30,35,0.98) 50%, rgba(25,25,30,0.95) 100%)',
            border: '1px solid rgba(70,70,75,0.6)',
            boxShadow: glowShadow(`
              inset 0 1px 1px rgba(255,255,255,0.05),
              inset 0 -1px 1px rgba(0,0,0,0.8),
              0 2px 8px rgba(0,0,0,0.6)
            `, glowIntensity)
          }}
        >
          <div 
            className="p-3 shrink-0 border-b" 
            style={{
              borderColor: `rgba(${rgbValues},0.2)`,
              background: 'linear-gradient(135deg, rgba(40,40,45,0.9) 0%, rgba(35,35,40,0.95) 100%)'
            }}
          >
            <h3 
              className="text-xs font-semibold uppercase tracking-widest" 
              style={{
                color: `rgba(${rgbValues},0.9)`,
                textShadow: `0 0 8px rgba(${rgbValues},0.4)`
              }}
            >
              COURSE MODULES
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>
            ) : sections.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                {isAdmin ? 'Click "+ Add Section" below to create your first section' : 'No content yet'}
              </div>
            ) : (
              <div>
                {sections.map((section, index) => {
                  const isExpanded = expandedSections.has(section.id)
                  const sectionLessons = section.lessons || []
                  
                  return (
                    <div key={section.id} className="group">
                      {/* Section Header */}
                      <div
                        className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer"
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isAdmin && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <GripVertical size={16} className="text-[rgba(255,255,255,0.3)]" />
                            </div>
                          )}
                          
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown size={18} className="text-[rgba(255,255,255,0.5)]" />
                            ) : (
                              <ChevronRight size={18} className="text-[rgba(255,255,255,0.5)]" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {editingSectionId === section.id && isAdmin ? (
                              <input
                                type="text"
                                defaultValue={section.title}
                                onBlur={(e) => {
                                  setEditingSectionId(null)
                                  if (e.target.value !== section.title) {
                                    handleUpdateSection(section.id, { 
                                      title: e.target.value.toUpperCase(),
                                      slug: generateSlug(e.target.value)
                                    })
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setEditingSectionId(null)
                                    if ((e.target as HTMLInputElement).value !== section.title) {
                                      handleUpdateSection(section.id, { 
                                        title: (e.target as HTMLInputElement).value.toUpperCase(),
                                        slug: generateSlug((e.target as HTMLInputElement).value)
                                      })
                                    }
                                  }
                                }}
                                className="w-full bg-transparent border-b border-cyan-500 outline-none text-sm font-bold uppercase tracking-wide"
                                style={{ color: `rgba(${rgbValues},0.9)` }}
                                autoFocus
                              />
                            ) : (
                              <>
                                <h4
                                  className="text-sm font-bold uppercase tracking-wide mb-1"
                                  style={{ color: `rgba(${rgbValues},0.9)` }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation()
                                    if (isAdmin) setEditingSectionId(section.id)
                                  }}
                                >
                                  {section.title}
                                </h4>
                                <p className="text-xs text-slate-500">
                                  {sectionLessons.length} lesson{sectionLessons.length !== 1 ? 's' : ''}
                                </p>
                              </>
                            )}
                          </div>
                          
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                console.log('Delete section clicked:', section.id)
                                handleDeleteSection(section.id)
                              }}
                              className="opacity-60 hover:opacity-100 transition-opacity p-1.5 hover:text-red-400 flex-shrink-0"
                              title="Delete section"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lessons */}
                      {isExpanded && (
                        <div className="bg-[rgba(0,0,0,0.2)]">
                          {sectionLessons.map((lesson: any) => (
                            <div
                              key={lesson.id}
                              onClick={() => {
                                setSelectedLesson(lesson)
                                setSelectedSectionId(section.id)
                              }}
                              className={`group/lesson px-4 py-2.5 pl-14 border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer ${
                                selectedLesson?.id === lesson.id ? 'bg-[rgba(6,182,212,0.15)]' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {isAdmin && (
                                  <div className="opacity-0 group-hover/lesson:opacity-100 transition-opacity flex-shrink-0">
                                    <GripVertical size={14} className="text-[rgba(255,255,255,0.3)]" />
                                  </div>
                                )}
                                
                                {editingLessonId === lesson.id && isAdmin ? (
                                  <input
                                    type="text"
                                    value={editingLessonTitle}
                                    onChange={(e) => setEditingLessonTitle(e.target.value)}
                                    onBlur={async (e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      
                                      console.log('[CLIENT] 🔵 onBlur triggered')
                                      console.log('[CLIENT]   Current value:', e.target.value)
                                      console.log('[CLIENT]   Lesson:', lesson)
                                      
                                      const newValue = e.target.value.trim()
                                      
                                      if (!newValue) {
                                        console.log('[CLIENT] ⚠️ Empty value, reverting')
                                        setEditingLessonId(null)
                                        setEditingLessonTitle(lesson.title)
                                        return
                                      }
                                      
                                      if (newValue === lesson.title) {
                                        console.log('[CLIENT] ℹ️ No change, closing editor')
                                        setEditingLessonId(null)
                                        return
                                      }
                                      
                                      console.log('[CLIENT] 💾 Saving on blur:', {
                                        oldTitle: lesson.title,
                                        newTitle: newValue,
                                        sectionId: section.id,
                                        lessonId: lesson.id
                                      })
                                      
                                      const success = await handleUpdateLesson(section.id, lesson.id, {
                                        title: newValue,
                                        slug: generateSlug(newValue)
                                      })
                                      
                                      console.log('[CLIENT] 💾 Save result:', success)
                                      
                                      if (success) {
                                        setEditingLessonId(null)
                                        console.log('[CLIENT] ✅ Editor closed after successful save')
                                      } else {
                                        console.log('[CLIENT] ❌ Save failed, keeping editor open')
                                        // Don't close editor on failure - let user try again
                                        setEditingLessonTitle(newValue) // Keep their input
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={async (e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        
                                        console.log('[CLIENT] ⏎ Enter key pressed')
                                        console.log('[CLIENT]   Current editingLessonTitle:', editingLessonTitle)
                                        
                                        const newValue = editingLessonTitle.trim()
                                        
                                        if (!newValue) {
                                          console.log('[CLIENT] ⚠️ Empty value on Enter, reverting')
                                          setEditingLessonId(null)
                                          setEditingLessonTitle(lesson.title)
                                          return
                                        }
                                        
                                        if (newValue === lesson.title) {
                                          console.log('[CLIENT] ℹ️ No change on Enter, closing editor')
                                          setEditingLessonId(null)
                                          return
                                        }
                                        
                                        console.log('[CLIENT] 💾 Saving on Enter:', {
                                          oldTitle: lesson.title,
                                          newTitle: newValue,
                                          sectionId: section.id,
                                          lessonId: lesson.id
                                        })
                                        
                                        const success = await handleUpdateLesson(section.id, lesson.id, {
                                          title: newValue,
                                          slug: generateSlug(newValue)
                                        })
                                        
                                        console.log('[CLIENT] 💾 Save result:', success)
                                        
                                        if (success) {
                                          setEditingLessonId(null)
                                          console.log('[CLIENT] ✅ Editor closed after successful save')
                                        } else {
                                          console.log('[CLIENT] ❌ Save failed, keeping editor open')
                                          setEditingLessonTitle(newValue) // Keep their input
                                        }
                                      }
                                      if (e.key === 'Escape') {
                                        e.preventDefault()
                                        console.log('[CLIENT] ⎋ Escape key pressed, canceling edit')
                                        setEditingLessonId(null)
                                        setEditingLessonTitle(lesson.title)
                                      }
                                    }}
                                    className="flex-1 bg-transparent border-b border-cyan-500 outline-none text-sm text-white"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    className={`flex-1 text-sm transition-colors ${
                                      selectedLesson?.id === lesson.id ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation()
                                      console.log('[CLIENT] 👆 Double-click detected on lesson:', {
                                        lessonId: lesson.id,
                                        lessonTitle: lesson.title,
                                        isAdmin
                                      })
                                      if (isAdmin) {
                                        console.log('[CLIENT] ✏️ Opening editor for lesson:', lesson.id)
                                        setEditingLessonId(lesson.id)
                                        setEditingLessonTitle(lesson.title)
                                      } else {
                                        console.log('[CLIENT] ⚠️ Not admin, cannot edit')
                                      }
                                    }}
                                  >
                                    {lesson.title}
                                  </span>
                                )}
                                
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      e.preventDefault()
                                      console.log('Delete lesson clicked:', lesson.id, 'from section:', section.id)
                                      handleDeleteLesson(section.id, lesson.id)
                                    }}
                                    className="opacity-60 hover:opacity-100 transition-opacity p-1 hover:text-red-400 flex-shrink-0"
                                    title="Delete lesson"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Add Lesson Button */}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddLesson(section.id)
                              }}
                              className="w-full px-4 py-2.5 pl-14 text-left text-sm text-[rgba(255,255,255,0.4)] hover:text-cyan-400 hover:bg-[rgba(255,255,255,0.02)] transition-colors flex items-center gap-2"
                            >
                              <Plus size={16} />
                              Add Lesson
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add Section Button */}
          {isAdmin && (
            <div className="p-3 border-t border-[rgba(255,255,255,0.1)]">
              <button
                onClick={handleAddSection}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"
              >
                <Plus size={14} />
                Add Section
              </button>
            </div>
          )}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden ml-6 mr-6 mb-6">
          {selectedLesson ? (
            <div className="space-y-0 h-full overflow-y-auto">
              {/* Video Player */}
              <div className="aspect-video bg-slate-900 border-b border-slate-700/50 relative">
                {lessonVideoUrl && lessonVideoUrl.includes('youtube') && (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(lessonVideoUrl)}?rel=0`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full absolute inset-0"
                    title={selectedLesson.title}
                  />
                )}
                {lessonVideoUrl && lessonVideoUrl.includes('loom') && (
                  <iframe
                    src={`https://www.loom.com/embed/${extractLoomId(lessonVideoUrl)}`}
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full absolute inset-0"
                    title={selectedLesson.title}
                  />
                )}
                {!lessonVideoUrl && isAdmin && (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-slate-400">No video URL set. Add one below.</p>
                  </div>
                )}
                {!lessonVideoUrl && !isAdmin && (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-slate-400">Video coming soon</p>
                  </div>
                )}
              </div>

              {/* Lesson Info & Content */}
              <div className="p-6 space-y-6 relative z-0">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">{selectedLesson.title}</h3>
                  
                  {/* Admin Video URL Input */}
                  {isAdmin && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Video URL (YouTube or Loom)</label>
                      <input
                        type="text"
                        value={lessonVideoUrl}
                        onChange={(e) => setLessonVideoUrl(e.target.value)}
                        onBlur={handleVideoUrlBlur}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  )}
                  
                  {/* Lesson Description/Notes */}
                  {isAdmin ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Lesson Notes</label>
                      <textarea
                        value={lessonNotes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="Add lesson description and notes..."
                        className="w-full min-h-[300px] bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed"
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                      />
                      <p className="text-xs text-slate-500 mt-2">Auto-saves as you type</p>
                    </div>
                  ) : lessonNotes ? (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Lesson Notes</h4>
                      <p className="text-slate-300 text-sm leading-relaxed">{lessonNotes}</p>
                    </div>
                  ) : null}
                </div>

                {/* Attachments */}
                {(lessonAttachments.length > 0 || isAdmin) && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-3">Attachments</h4>
                    
                    {lessonAttachments.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {lessonAttachments.map((attachment: any) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 group hover:border-slate-600 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Paperclip size={16} className="text-cyan-400 flex-shrink-0" />
                              <a
                                href={attachment.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-slate-300 hover:text-cyan-400 transition-colors truncate"
                              >
                                {attachment.title || attachment.file_name || 'Untitled'}
                              </a>
                              {attachment.file_size && (
                                <span className="text-xs text-slate-500 flex-shrink-0">
                                  ({(attachment.file_size / 1024).toFixed(1)} KB)
                                </span>
                              )}
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteAttachment(attachment.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 transition-all flex-shrink-0 ml-2"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isAdmin && (
                      <label 
                        className="block border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors cursor-pointer bg-slate-900/20"
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          e.currentTarget.classList.add('border-cyan-500')
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          e.currentTarget.classList.remove('border-cyan-500')
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          e.currentTarget.classList.remove('border-cyan-500')
                          
                          if (!selectedLesson) {
                            alert('Please select a lesson first')
                            return
                          }
                          
                          const files = e.dataTransfer.files
                          if (files.length > 0) {
                            console.log('[CLIENT] 📤 Files dropped:', files.length)
                            const fakeEvent = {
                              target: { files, value: '' },
                              preventDefault: () => {},
                              stopPropagation: () => {}
                            } as any
                            handleFileUpload(fakeEvent)
                          }
                        }}
                      >
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploadingFile || !selectedLesson}
                        />
                        {uploadingFile ? (
                          <>
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-sm text-cyan-400">Uploading...</p>
                          </>
                        ) : !selectedLesson ? (
                          <>
                            <Upload size={28} className="mx-auto mb-2 text-slate-500 opacity-50" />
                            <p className="text-sm text-slate-400 mb-1">Select a lesson to upload files</p>
                          </>
                        ) : (
                          <>
                            <Upload size={28} className="mx-auto mb-2 text-slate-500" />
                            <p className="text-sm text-slate-400 mb-1">Drop files here or click to upload</p>
                            <p className="text-xs text-slate-500">PDFs, images, documents, etc. (max 50MB)</p>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <p className="text-slate-400">
                  {sections.length === 0 && isAdmin 
                    ? 'Add a section and lesson to get started'
                    : 'Select a lesson to start'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
