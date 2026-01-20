'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Eye, GripVertical, ChevronDown, ChevronRight, Upload, Paperclip, Check, FileCheck, Loader2, Save, X, Download } from 'lucide-react'
import { Course, Module, Lesson } from '@/lib/types/courses'
import { CheckpointSubmission } from '@/components/CheckpointSubmission'

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
  
  // Checkpoints
  const [checkpoints, setCheckpoints] = useState<Record<string, any>>({})
  const [loadingCheckpoints, setLoadingCheckpoints] = useState<Record<string, boolean>>({})
  const [checkpointModalOpen, setCheckpointModalOpen] = useState(false)
  
  // Notes state (matching DreamJob)
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [notesSaved, setNotesSaved] = useState<Record<string, boolean>>({})

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
      loadNotes()
      loadCheckpoint()
    }
  }, [selectedLesson, selectedSectionId])
  
  // Fetch checkpoints for course
  useEffect(() => {
    if (course.id && sections.length > 0) {
      loadAllCheckpoints()
    }
  }, [course.id, sections.length])
  
  const loadAllCheckpoints = async () => {
    try {
      const res = await fetch(`/api/checkpoints/by-course-v2?courseId=${course.id}`)
      if (res.ok) {
        const data = await res.json()
        const checkpointMap: Record<string, any> = {}
        
        // Map checkpoints by section ID
        if (data.byUUID) {
          sections.forEach(section => {
            if (data.byUUID[section.id]) {
              checkpointMap[section.id] = data.byUUID[section.id]
            }
          })
        }
        
        setCheckpoints(checkpointMap)
      }
    } catch (error) {
      console.error('Error loading checkpoints:', error)
    }
  }
  
  const loadCheckpoint = async () => {
    if (!selectedSectionId) return
    
    if (checkpoints[selectedSectionId]) {
      return // Already loaded
    }
    
    setLoadingCheckpoints(prev => ({ ...prev, [selectedSectionId]: true }))
    try {
      const res = await fetch(`/api/checkpoints/by-course-v2?courseId=${course.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.byUUID && data.byUUID[selectedSectionId]) {
          setCheckpoints(prev => ({ ...prev, [selectedSectionId]: data.byUUID[selectedSectionId] }))
        }
      }
    } catch (error) {
      console.error('Error loading checkpoint:', error)
    } finally {
      setLoadingCheckpoints(prev => ({ ...prev, [selectedSectionId]: false }))
    }
  }
  
  const loadNotes = async () => {
    if (!selectedLesson) return
    
    try {
      const res = await fetch(`/api/courses-v2/lesson-notes?lessonId=${selectedLesson.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.notes !== undefined) {
          setLessonNotes(data.notes || '')
        }
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }
  
  const saveNotes = async () => {
    if (!selectedLesson) return
    
    setSavingNotes(prev => ({ ...prev, [selectedLesson.id]: true }))
    setNotesSaved(prev => ({ ...prev, [selectedLesson.id]: false }))
    
    try {
      const res = await fetch('/api/courses-v2/lesson-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          notes: lessonNotes || ''
        })
      })
      
      if (res.ok) {
        setNotesSaved(prev => ({ ...prev, [selectedLesson.id]: true }))
        setTimeout(() => {
          setNotesSaved(prev => ({ ...prev, [selectedLesson.id]: false }))
        }, 2000)
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(`Failed to save notes: ${errorData.error || `HTTP ${res.status}`}`)
      }
    } catch (error: any) {
      console.error('Error saving notes:', error)
      alert('Failed to save notes')
    } finally {
      setSavingNotes(prev => ({ ...prev, [selectedLesson.id]: false }))
    }
  }

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
        setExpandedSections(prev => {
          const newSet = new Set(prev)
          newSet.add(sectionId)
          return newSet
        })
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
        let errorData: any = {}
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
      
      const data: any = await res.json().catch(() => ({}))
      
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
      
      let data: any = {}
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

  // Handle notes change (no auto-save - manual save button)
  const handleNotesChange = (value: string) => {
    setLessonNotes(value)
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
      
      let data: any = {}
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
        alert(`Failed to delete attachment: ${data.error || data.details || `HTTP ${res.status}`}`)
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

              {/* Video Info */}
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {selectedLesson.title}
                </h2>
                
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
              </div>

              {/* Checkpoint Button - Centered above Notes */}
              {selectedLesson && selectedSectionId && (
                <div className="px-6 mt-4 flex justify-center relative z-10">
                  {(() => {
                    const checkpoint = checkpoints[selectedSectionId]
                    const isLoading = loadingCheckpoints[selectedSectionId]
                    
                    if (checkpoint && checkpoint.id && checkpoint.title && checkpoint.requirements) {
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setCheckpointModalOpen(true)
                          }}
                          className="px-8 py-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/50 rounded-lg text-cyan-400 font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 flex items-center gap-3 relative z-50 cursor-pointer"
                        >
                          <FileCheck className="w-6 h-6" />
                          Submit Checkpoint
                        </button>
                      )
                    }
                    
                    if (isLoading) {
                      return (
                        <button
                          disabled
                          className="px-8 py-4 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 font-semibold text-lg flex items-center gap-3 cursor-not-allowed"
                        >
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Loading Checkpoint...
                        </button>
                      )
                    }
                    
                    return (
                      <button
                        disabled
                        className="px-8 py-4 bg-slate-700/30 border border-slate-600/50 rounded-lg text-slate-500 font-semibold text-lg flex items-center gap-3 cursor-not-allowed opacity-60"
                      >
                        <FileCheck className="w-6 h-6" />
                        No Checkpoint Available
                      </button>
                    )
                  })()}
                </div>
              )}

              {/* Checkpoint Modal */}
              {checkpointModalOpen && selectedLesson && selectedSectionId && checkpoints[selectedSectionId] && (
                <div 
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" 
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setCheckpointModalOpen(false)
                    }
                  }}
                >
                  <div className="bg-slate-900 rounded-xl border border-slate-700/50 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-[101]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                      <h3 className="text-xl font-bold text-white">Checkpoint Submission</h3>
                      <button
                        onClick={() => setCheckpointModalOpen(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="p-6">
                      <CheckpointSubmission
                        checkpointId={checkpoints[selectedSectionId].id}
                        checkpointTitle={checkpoints[selectedSectionId].title}
                        requirements={checkpoints[selectedSectionId].requirements}
                        sectionId={selectedSectionId}
                        onSuccess={(status) => {
                          if (status === 'approved' || status === 'needs_review') {
                            setCheckpointModalOpen(false)
                            alert(status === 'approved' ? '✅ Checkpoint approved! Next section unlocked.' : '⏳ Checkpoint submitted! Under review.')
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes/Attachments Section */}
              <div className="p-6 space-y-4">
                {/* Notes Section */}
                <div className="bg-slate-900/50 rounded-lg border border-slate-700/50">
                  {(() => {
                    const hasNotes = lessonNotes && lessonNotes.trim().length > 0
                    const isExpanded = notesExpanded[selectedLesson.id] || false
                    const shouldAutoExpand = hasNotes && lessonNotes.length > 200
                    
                    return (
                      <>
                        <div className="flex items-center justify-between p-4">
                          <h3 className="text-sm font-semibold text-slate-300">Notes</h3>
                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <button
                                onClick={saveNotes}
                                disabled={savingNotes[selectedLesson.id]}
                                className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                                  notesSaved[selectedLesson.id]
                                    ? 'bg-cyan-600 text-white'
                                    : savingNotes[selectedLesson.id]
                                    ? 'bg-cyan-800 text-white'
                                    : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                                }`}
                              >
                                {savingNotes[selectedLesson.id] ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Saving...
                                  </>
                                ) : notesSaved[selectedLesson.id] ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Saved!
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3 h-3" />
                                    Save
                                  </>
                                )}
                              </button>
                            )}
                            {hasNotes && (
                              <button
                                onClick={() => setNotesExpanded(prev => ({ ...prev, [selectedLesson.id]: !isExpanded }))}
                                className="text-xs text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                    Collapse
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    Expand
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Notes Content */}
                        {(isAdmin || shouldAutoExpand || isExpanded || !hasNotes) && (
                          <div className="px-4 pb-4">
                            {isAdmin ? (
                              <textarea
                                value={lessonNotes}
                                onChange={(e) => handleNotesChange(e.target.value)}
                                placeholder="Add your notes, thoughts, or questions about this lesson..."
                                className="w-full bg-transparent text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-lg p-3 text-sm leading-relaxed border border-slate-700/50"
                                style={{ 
                                  height: 'auto',
                                  minHeight: '120px'
                                }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement
                                  target.style.height = 'auto'
                                  target.style.height = `${Math.max(120, target.scrollHeight)}px`
                                }}
                              />
                            ) : (
                              <div className="w-full bg-transparent text-slate-200 rounded-lg p-3 text-sm leading-relaxed border border-slate-700/50 whitespace-pre-wrap min-h-[60px]">
                                {lessonNotes || <span className="text-slate-500 italic">No notes available</span>}
                              </div>
                            )}
                          </div>
                        )}
                        {!isAdmin && hasNotes && !shouldAutoExpand && !isExpanded && (
                          <div className="px-4 pb-4">
                            <div className="text-sm text-slate-400 line-clamp-2 p-3 border border-slate-700/50 rounded-lg bg-slate-800/30">
                              {lessonNotes}
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Course Materials Section */}
                <div className="bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                    <h4 className="text-sm font-semibold text-slate-300">Course Materials</h4>
                    {isAdmin && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploadingFile}
                        />
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-xs text-slate-300 font-medium">Upload</span>
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Attachments List */}
                  <div className="p-4">
                    {uploadingFile ? (
                      <div className="text-sm text-slate-400 text-center py-4">Uploading...</div>
                    ) : lessonAttachments.length > 0 ? (
                      <div className="space-y-2">
                        {lessonAttachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between px-3 py-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors"
                          >
                            <a
                              href={attachment.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 flex-1 hover:text-cyan-400 transition-colors"
                            >
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm text-slate-300">{attachment.title || attachment.file_name || 'Untitled'}</span>
                            </a>
                            <div className="flex items-center gap-2">
                              <a
                                href={attachment.file_url}
                                download
                                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteAttachment(attachment.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                                  title="Delete attachment"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 text-center py-4 italic">No course materials available</div>
                    )}
                  </div>
                </div>
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
