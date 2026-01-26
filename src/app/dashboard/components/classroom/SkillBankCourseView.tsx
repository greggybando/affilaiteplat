'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Plus, Trash2, Eye, GripVertical, ChevronDown, ChevronRight, Upload, Paperclip, Check, FileCheck, Loader2, Save, X, Download, FileUp, Lock, Unlock, Pencil } from 'lucide-react'
import { Course, Module, Lesson } from '@/lib/types/courses'
import { CheckpointSubmission } from '@/components/CheckpointSubmission'
import { CourseImporter } from './CourseImporter'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SkillBankCourseViewProps {
  course: Course
  isAdmin: boolean
  onBack: () => void
  onPublish?: () => void
  glowIntensity: number
}

// Sortable Module Wrapper Component
function SortableModuleWrapper({ id, children, isAdmin }: { id: string; children: (props: { attributes: any; listeners: any }) => React.ReactNode; isAdmin: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `module-${id}`, disabled: !isAdmin })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  )
}

// Sortable Drag Handle Component
function SortableDragHandle({ attributes, listeners }: { attributes: any; listeners: any }) {
  return (
    <div 
      {...attributes} 
      {...listeners}
      className="opacity-80 flex-shrink-0 cursor-grab active:cursor-grabbing" 
      title="Drag to reorder (admin)"
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical size={16} className="text-[rgba(255,255,255,0.5)]" />
    </div>
  )
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
  if (!glowIntensity || glowIntensity === 0) return 'none'
  const intensity = glowIntensity / 100
  const boosted = intensity * 0.69
  return shadows.split(', ').map(shadow => {
    return shadow.replace(/(\d+)px/g, (match, num) => {
      const val = parseInt(num)
      if (val > 8) {
        return `${Math.round(val * boosted)}px`
      }
      return match
    }).replace(/rgba?\(([^)]+)\)/g, (match, content) => {
      const parts = content.split(',')
      if (parts.length === 4) {
        const alpha = Math.min(1, parseFloat(parts[3].trim()) * boosted)
        return `rgba(${parts.slice(0,3).join(',')},${alpha.toFixed(2)})`
      }
      return match
    })
  }).join(', ')
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
  // Debug: Log admin status
  useEffect(() => {
    console.log('[SkillBankCourseView] Admin status:', {
      isAdmin,
      courseSlug: course.slug,
      courseTitle: course.title
    })
  }, [isAdmin, course.slug, course.title])
  
  const [courseData, setCourseData] = useState(course)
  
  // Update courseTitle when course prop changes
  useEffect(() => {
    setCourseTitle(course.title)
    setCourseData(course)
  }, [course.title])
  
  const [sections, setSections] = useState<any[]>([])
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [unlockStatus, setUnlockStatus] = useState<Record<string, { isLocked: boolean; wouldBeLocked?: boolean; lockReason: string | null; checkpoint: any }>>({})
  const [togglingModuleId, setTogglingModuleId] = useState<string | null>(null)
  
  // Editing states
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [editingLessonTitle, setEditingLessonTitle] = useState<string>('')
  const [editingCourseTitle, setEditingCourseTitle] = useState(false)
  const [courseTitle, setCourseTitle] = useState(course.title)
  
  // Checkpoint editing states
  const [editingCheckpointId, setEditingCheckpointId] = useState<string | null>(null)
  const [creatingCheckpointModuleId, setCreatingCheckpointModuleId] = useState<string | null>(null)
  const [checkpointFormData, setCheckpointFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    ai_grading_prompt: '',
    ai_review_enabled: true,
    requires_manual_review: false
  })
  
  const [lessonNotes, setLessonNotes] = useState('')
  const [lessonVideoUrl, setLessonVideoUrl] = useState('')
  const [videoKey, setVideoKey] = useState(0) // Force iframe remount
  const [lessonAttachments, setLessonAttachments] = useState<any[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  
  // Debug: Log when attachments state changes
  useEffect(() => {
    console.log('[SkillBankCourseView] ⚡ Attachments state changed:', {
      count: lessonAttachments.length,
      attachments: lessonAttachments,
      lessonId: selectedLesson?.id
    })
  }, [lessonAttachments, selectedLesson?.id])
  
  const [saving, setSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  
  // Checkpoints
  const [checkpoints, setCheckpoints] = useState<Record<string, any>>({})
  const [loadingCheckpoints, setLoadingCheckpoints] = useState<Record<string, boolean>>({})
  const [checkpointModalOpen, setCheckpointModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  
  // Notes state (matching DreamJob)
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [notesSaved, setNotesSaved] = useState<Record<string, boolean>>({})
  const notesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedNotesRef = useRef<string>('')

  const isPublished = (courseData as any).is_published !== false
  const courseColor = courseData.color || '#06B6D4'
  const rgbValues = hexToRgb(courseColor)

  // Get dynamic header text based on course
  const getCourseHeaderText = (): string => {
    const slug = courseData.slug?.toLowerCase() || ''
    if (slug === 'mindset') {
      return 'LIFEDESIGN SYSTEM'
    } else if (slug === 'dream-job') {
      return 'DREAM JOB SYSTEM'
    } else {
      // For other courses, use course title + "SYSTEM" or just course title
      return courseData.title ? `${courseData.title.toUpperCase()} SYSTEM` : 'COURSE MODULES'
    }
  }

  // Extract video ID helpers
  const extractYouTubeId = (url: string): string => {
    if (!url) return ''
    // If it's already just an ID (no http/https), return as-is
    if (!url.includes('http') && !url.includes('://')) {
      return url
    }
    // Extract from full URL
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0]
    if (url.includes('youtube.com/watch?v=')) return url.split('v=')[1].split('&')[0]
    if (url.includes('youtube.com/embed/')) return url.split('embed/')[1].split('?')[0]
    return url
  }

  const extractLoomId = (url: string): string => {
    if (!url) return ''
    // If it's already just an ID (no http/https), return as-is
    if (!url.includes('http') && !url.includes('://')) {
      return url
    }
    // Extract from full URL
    const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
    return match ? match[1] : url
  }
  
  // Get video ID for display (handles both URL and ID formats)
  const getVideoId = (lesson: any): { type: 'youtube' | 'loom' | null, id: string } => {
    if (!lesson) return { type: null, id: '' }
    
    // Check video_type first (from database)
    if (lesson.video_type === 'youtube' && lesson.video_url) {
      return { type: 'youtube', id: extractYouTubeId(lesson.video_url) }
    }
    if (lesson.video_type === 'loom' && lesson.video_url) {
      return { type: 'loom', id: extractLoomId(lesson.video_url) }
    }
    
    // Fallback: try to detect from video_url format
    if (lesson.video_url) {
      if (lesson.video_url.includes('youtube') || lesson.video_url.includes('youtu.be')) {
        return { type: 'youtube', id: extractYouTubeId(lesson.video_url) }
      }
      if (lesson.video_url.includes('loom')) {
        return { type: 'loom', id: extractLoomId(lesson.video_url) }
      }
      // If it's just an ID without URL, check video_type or assume YouTube
      if (!lesson.video_url.includes('http') && !lesson.video_url.includes('://')) {
        // It's just an ID - use video_type to determine platform, or default to YouTube
        const type = lesson.video_type === 'loom' ? 'loom' : 'youtube'
        return { type, id: lesson.video_url }
      }
    }
    
    return { type: null, id: '' }
  }

  // Fetch sections with lessons
  useEffect(() => {
    loadSections()
  }, [course.id])

  // Fetch unlock status
  useEffect(() => {
    if (course.id && sections.length > 0) {
      loadUnlockStatus()
    }
  }, [course.id, sections.length])

  const loadUnlockStatus = async () => {
    try {
      const res = await fetch(`/api/courses/${course.id}/unlock-status`)
      if (res.ok) {
        const data = await res.json()
        console.log('[SkillBankCourseView] Unlock status loaded:', data)
        const statusMap: Record<string, { isLocked: boolean; wouldBeLocked?: boolean; lockReason: string | null; checkpoint: any }> = {}
        data.modules?.forEach((module: any) => {
          console.log(`[SkillBankCourseView] Module "${module.title}": isLocked=${module.isLocked}, wouldBeLocked=${module.wouldBeLocked}`)
          statusMap[module.id] = {
            isLocked: module.isLocked,
            wouldBeLocked: module.wouldBeLocked,
            lockReason: module.lockReason,
            checkpoint: module.checkpoint
          }
        })
        setUnlockStatus(statusMap)
      } else {
        console.error('[SkillBankCourseView] Failed to load unlock status:', res.status, res.statusText)
      }
    } catch (error) {
      console.error('[SkillBankCourseView] Error loading unlock status:', error)
    }
  }

  // Update when lesson changes
  useEffect(() => {
    if (selectedLesson) {
      const videoInfo = getVideoId(selectedLesson)
      console.log('[SkillBankCourseView] Lesson changed:', {
        lessonId: selectedLesson.id,
        videoUrl: selectedLesson.video_url,
        videoType: selectedLesson.video_type,
        extractedVideoInfo: videoInfo,
        title: selectedLesson.title
      })
      
      // Set video URL immediately - no delay needed
      setLessonVideoUrl(selectedLesson.video_url || '')
      setVideoKey(prev => prev + 1) // Increment key to force iframe remount
      
      // Reset notes state immediately
      setLessonNotes('')
      
      // Load additional data in parallel (non-blocking)
      Promise.all([
        loadNotes(),
        loadLessonAttachments(),
        loadCheckpoint()
      ]).catch(err => {
        console.error('[SkillBankCourseView] Error loading lesson data:', err)
      })
    } else {
      setLessonNotes('')
      setLessonVideoUrl('')
      setLessonAttachments([])
      setVideoKey(0)
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
      // Fetch checkpoints by course_id - get all modules for this course
      const moduleIds = sections.map(s => s.id)
      if (moduleIds.length === 0) return
      
      // Use the by-course-v2 endpoint but map by module_id
      const res = await fetch(`/api/checkpoints/by-course-v2?courseId=${course.id}`)
      if (res.ok) {
        const data = await res.json()
        const checkpointMap: Record<string, any> = {}
        
        // Map checkpoints by module_id (sections are modules in new system)
        if (data.checkpoints) {
          data.checkpoints.forEach((cp: any) => {
            if (cp.module_id && moduleIds.includes(cp.module_id)) {
              checkpointMap[cp.module_id] = cp
            }
          })
        }
        
        setCheckpoints(checkpointMap)
      }
    } catch (error) {
      console.error('Error loading checkpoints:', error)
    }
  }
  
  const handleCreateCheckpoint = async (moduleId: string) => {
    if (!checkpointFormData.title || !checkpointFormData.requirements) {
      alert('Title and requirements are required')
      return
    }
    
    try {
      const res = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          ...checkpointFormData
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create checkpoint')
      }
      
      const data = await res.json()
      setCheckpoints(prev => ({ ...prev, [moduleId]: data.checkpoint }))
      setCreatingCheckpointModuleId(null)
      setCheckpointFormData({
        title: '',
        description: '',
        requirements: '',
        ai_grading_prompt: '',
        ai_review_enabled: true,
        requires_manual_review: false
      })
    } catch (error: any) {
      alert(error.message || 'Failed to create checkpoint')
    }
  }
  
  const handleUpdateCheckpoint = async (checkpointId: string, updates: any) => {
    try {
      const res = await fetch(`/api/checkpoints/${checkpointId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update checkpoint')
      }
      
      const data = await res.json()
      // Update checkpoint in state
      const moduleId = Object.keys(checkpoints).find(id => checkpoints[id].id === checkpointId)
      if (moduleId) {
        setCheckpoints(prev => ({ ...prev, [moduleId]: data.checkpoint }))
      }
      setEditingCheckpointId(null)
    } catch (error: any) {
      alert(error.message || 'Failed to update checkpoint')
    }
  }
  
  const handleDeleteCheckpoint = async (checkpointId: string, moduleId: string) => {
    if (!confirm('Are you sure you want to delete this checkpoint?')) return
    
    try {
      const res = await fetch(`/api/checkpoints/${checkpointId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete checkpoint')
      }
      
      const updated = { ...checkpoints }
      delete updated[moduleId]
      setCheckpoints(updated)
    } catch (error: any) {
      alert(error.message || 'Failed to delete checkpoint')
    }
  }
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )
  
  // Handle module drag end
  const handleModuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    const activeId = active.id.toString().replace('module-', '')
    const overId = over.id.toString().replace('module-', '')
    
    if (activeId === overId) return
    
    // Find current indices
    const activeIndex = sections.findIndex(s => s.id === activeId)
    const overIndex = sections.findIndex(s => s.id === overId)
    
    if (activeIndex === -1 || overIndex === -1) return
    
    // Reorder sections array
    const newSections = [...sections]
    const [movedSection] = newSections.splice(activeIndex, 1)
    newSections.splice(overIndex, 0, movedSection)
    
    // Optimistically update UI
    setSections(newSections)
    
    // Update backend
    try {
      const res = await fetch(`/api/courses-v2/${course.id}/sections/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleIds: newSections.map(s => s.id) })
      })
      
      if (!res.ok) {
        // Revert on error
        setSections(sections)
        const error = await res.json()
        throw new Error(error.error || 'Failed to reorder modules')
      }
    } catch (error: any) {
      // Revert on error
      setSections(sections)
      alert(error.message || 'Failed to reorder modules')
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
      console.log('[SkillBankCourseView] Loading notes for lesson:', selectedLesson.id)
      const res = await fetch(`/api/courses-v2/lesson-notes?lessonId=${selectedLesson.id}`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        const loadedNotes = data.notes || ''
        console.log('[SkillBankCourseView] Notes loaded:', { 
          lessonId: selectedLesson.id, 
          notesLength: loadedNotes.length,
          hasNotes: !!loadedNotes 
        })
        setLessonNotes(loadedNotes)
        // Update ref after loading so auto-save knows what was last saved
        lastSavedNotesRef.current = loadedNotes
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('[SkillBankCourseView] Failed to load notes:', res.status, errorData)
        // If no notes exist, that's OK - just use empty string
        setLessonNotes('')
        lastSavedNotesRef.current = ''
      }
    } catch (error) {
      console.error('[SkillBankCourseView] Error loading notes:', error)
      setLessonNotes('')
      lastSavedNotesRef.current = ''
    }
  }
  
  const saveNotes = useCallback(async (notesToSave?: string) => {
    if (!selectedLesson) return
    
    const notes = notesToSave !== undefined ? notesToSave : lessonNotes
    
    // Skip if notes haven't changed
    if (notes === lastSavedNotesRef.current) {
      return
    }
    
    setSavingNotes(prev => ({ ...prev, [selectedLesson.id]: true }))
    setNotesSaved(prev => ({ ...prev, [selectedLesson.id]: false }))
    
    try {
      console.log('[SkillBankCourseView] Saving notes:', { 
        lessonId: selectedLesson.id, 
        notesLength: notes.length,
        notesPreview: notes.substring(0, 50)
      })
      
      const res = await fetch('/api/courses-v2/lesson-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          notes: notes || ''
        })
      })
      
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        console.log('[SkillBankCourseView] Notes saved successfully:', data)
        lastSavedNotesRef.current = notes
        setNotesSaved(prev => ({ ...prev, [selectedLesson.id]: true }))
        setTimeout(() => {
          setNotesSaved(prev => ({ ...prev, [selectedLesson.id]: false }))
        }, 2000)
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error(`[SkillBankCourseView] Failed to save notes:`, { 
          status: res.status, 
          error: errorData.error || `HTTP ${res.status}`,
          lessonId: selectedLesson.id
        })
      }
    } catch (error: any) {
      console.error('Error saving notes:', error)
    } finally {
      setSavingNotes(prev => ({ ...prev, [selectedLesson.id]: false }))
    }
  }, [selectedLesson, lessonNotes])

  const loadSections = async () => {
    try {
      // Don't block UI - show content immediately while loading
      setLoading(true)
      
      // Optimized: Fetch sections with lessons in a single API call
      const res = await fetch(`/api/courses-v2/${course.id}/sections?includeLessons=true`)
      const data = await res.json()
      
      const sectionsWithLessons = data.sections || []
      
      // Set sections immediately to show UI
      setSections(sectionsWithLessons)
      setLoading(false) // Hide loading state as soon as data arrives
      
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
          const updatedSection = sectionsWithLessons.find((s: any) => s.id === selectedSectionId)
          const updatedLesson = updatedSection?.lessons?.find((l: any) => l.id === selectedLesson.id)
          if (updatedLesson) {
            setSelectedLesson(updatedLesson)
          }
        }
      }
      
      return sectionsWithLessons
    } catch (error) {
      console.error('Error loading sections:', error)
      setLoading(false)
      return []
    }
  }

  const loadLessonAttachments = async () => {
    if (!selectedLesson) {
      console.log('[SkillBankCourseView] No lesson selected, skipping attachment load')
      return
    }
    
    console.log('[SkillBankCourseView] Loading attachments for lesson:', selectedLesson.id)
    
    try {
      const res = await fetch(`/api/courses-v2/lesson-attachments?lessonId=${selectedLesson.id}`, {
        credentials: 'include'
      })
      console.log('[SkillBankCourseView] Attachments response:', res.status, res.statusText)
      
      if (res.ok) {
        const data = await res.json()
        console.log('[SkillBankCourseView] Attachments loaded:', { 
          lessonId: selectedLesson.id,
          responseData: data,
          attachments: data.attachments,
          attachmentsType: typeof data.attachments,
          attachmentsIsArray: Array.isArray(data.attachments),
          count: data.attachments?.length || 0 
        })
        
        // Ensure we're setting an array
        const attachmentsArray = Array.isArray(data.attachments) ? data.attachments : (data.attachments || [])
        console.log('[SkillBankCourseView] Setting attachments state:', attachmentsArray)
        setLessonAttachments(attachmentsArray)
        
        // Verify state was set
        setTimeout(() => {
          console.log('[SkillBankCourseView] Attachments state after set:', lessonAttachments)
        }, 100)
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('[SkillBankCourseView] Failed to load attachments:', res.status, errorData)
        setLessonAttachments([])
      }
    } catch (error: any) {
      console.error('[SkillBankCourseView] Error loading attachments:', error)
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
    // Don't allow expanding locked modules (unless admin)
    const moduleStatus = unlockStatus[sectionId]
    if (moduleStatus?.isLocked && !isAdmin) {
      if (moduleStatus.lockReason) {
        alert(moduleStatus.lockReason)
      }
      return
    }
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  // Handle notes change with auto-save (debounced)
  const handleNotesChange = (value: string) => {
    setLessonNotes(value)
    
    // Clear existing timeout
    if (notesSaveTimeoutRef.current) {
      clearTimeout(notesSaveTimeoutRef.current)
    }
    
    // Set new timeout for auto-save (1 second after typing stops)
    notesSaveTimeoutRef.current = setTimeout(() => {
      if (selectedLesson && value !== lastSavedNotesRef.current) {
        saveNotes(value)
      }
    }, 1000)
  }

  // Auto-save on blur (immediate)
  const handleNotesBlur = () => {
    // Clear debounced timeout
    if (notesSaveTimeoutRef.current) {
      clearTimeout(notesSaveTimeoutRef.current)
      notesSaveTimeoutRef.current = null
    }
    
    // Save immediately if changed
    if (selectedLesson && lessonNotes !== lastSavedNotesRef.current) {
      saveNotes()
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notesSaveTimeoutRef.current) {
        clearTimeout(notesSaveTimeoutRef.current)
      }
    }
  }, [])

  // Reset last saved notes ref when lesson changes (will be updated after loadNotes completes)
  useEffect(() => {
    if (selectedLesson) {
      lastSavedNotesRef.current = ''
    }
  }, [selectedLesson?.id])

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
          className="flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-white transition-colors text-sm flex-shrink-0"
        >
          <ArrowLeft size={16} />
          Back to Courses
        </button>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isAdmin && (
            <>
              <span className="px-3 py-1.5 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 text-xs font-semibold rounded-full border border-cyan-500/50 whitespace-nowrap shadow-lg shadow-cyan-500/20">
                👑 Admin Mode - Double-click to edit
              </span>
              <button
                onClick={() => {
                  console.log('[SkillBank] Import button clicked, isAdmin:', isAdmin)
                  setImportModalOpen(true)
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/50 whitespace-nowrap"
                title="Import course from Google Docs"
              >
                <Upload size={14} />
                Import Course
              </button>
            </>
          )}
          
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
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/50 whitespace-nowrap"
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
            className="p-3 shrink-0 border-b flex items-center justify-between gap-2" 
            style={{
              borderColor: 'rgba(34,211,238,0.2)',
              background: 'linear-gradient(135deg, rgba(40,40,45,0.9) 0%, rgba(35,35,40,0.95) 100%)'
            }}
          >
            <h3 
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                color: 'rgba(34,211,238,0.9)',
                textShadow: '0 0 8px rgba(34,211,238,0.4)'
              }}
            >
              {getCourseHeaderText()}
            </h3>
            
            {/* Globally Unlocked Toggle (Admin) */}
            {isAdmin && (
              <button
                onClick={async () => {
                  const newValue = !courseData.globally_unlocked
                  try {
                    const res = await fetch(`/api/courses-v2/${course.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ globally_unlocked: newValue })
                    })
                    if (res.ok) {
                      const data = await res.json()
                      setCourseData({ ...courseData, globally_unlocked: newValue })
                      // Reload unlock status to reflect change
                      loadUnlockStatus()
                    } else {
                      alert('Failed to update course unlock status')
                    }
                  } catch (error) {
                    console.error('Error updating globally_unlocked:', error)
                    alert('Error updating course unlock status')
                  }
                }}
                className="flex-shrink-0 p-1.5 hover:bg-slate-700/50 rounded transition-colors"
                title={courseData.globally_unlocked ? 'Course is globally unlocked (click to lock)' : 'Course uses sequential unlocking (click to unlock all)'}
              >
                {courseData.globally_unlocked ? (
                  <span className="text-xs text-emerald-400" title="Globally unlocked">🔓</span>
                ) : (
                  <span className="text-xs text-slate-500" title="Sequential unlocking">🔒</span>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {sections.length === 0 && loading ? (
              <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>
            ) : sections.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                {isAdmin ? 'Click "+ Add Section" below to create your first section' : 'No content yet'}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleModuleDragEnd}
              >
                <SortableContext
                  items={sections.map(s => `module-${s.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {sections.map((section, index) => {
                  const isExpanded = expandedSections.has(section.id)
                  const sectionLessons = section.lessons || []
                  const moduleStatus = unlockStatus[section.id]
                  // For admins: use wouldBeLocked to show lock symbol, but allow access (isLocked = false)
                  // For non-admins: use isLocked normally
                  const wouldBeLocked = isAdmin ? (moduleStatus?.wouldBeLocked ?? true) : (moduleStatus?.isLocked ?? true)
                  const isLocked = isAdmin ? false : (moduleStatus?.isLocked ?? true) // Admins always have access
                  const lockReason = moduleStatus?.lockReason
                  const checkpoint = moduleStatus?.checkpoint
                  
                  // Get checkpoint status badge
                  const getCheckpointBadge = () => {
                    if (!checkpoint) return null
                    const status = checkpoint.status
                    if (status === 'approved') return '✅'
                    if (status === 'pending' || status === 'needs_review') return '⏳'
                    if (status === 'denied') return '❌'
                    if (status === 'not_started') return '○'
                    return null
                  }
                  
                  return (
                    <SortableModuleWrapper key={section.id} id={section.id} isAdmin={isAdmin}>
                      {({ attributes, listeners }) => (
                        <div className="group">
                          {/* Section Header */}
                          <div
                          className={`px-4 py-3 border-b border-[rgba(255,255,255,0.05)] transition-colors ${
                            wouldBeLocked && !isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[rgba(255,255,255,0.02)]'
                          }`}
                          style={{
                            background: 'rgba(30,30,35,0.6)'
                          }}
                          onClick={() => {
                            if (!isLocked) {
                              toggleSection(section.id)
                            } else if (lockReason) {
                              // Show toast/alert with lock reason
                              alert(lockReason)
                            }
                          }}
                          title={wouldBeLocked && !isAdmin ? lockReason || 'Complete the required checkpoint to unlock this module' : ''}
                        >
                          <div className="flex items-center gap-2.5 relative">
                            {/* Admin Toggle Button - Must be first to avoid drag handle overlay */}
                            {isAdmin && (
                              <button
                                disabled={togglingModuleId !== null && togglingModuleId !== section.id}
                                onClick={async (e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if (e.nativeEvent) {
                                    e.nativeEvent.stopImmediatePropagation()
                                  }
                                  
                                  const moduleId = section.id
                                  
                                  // Prevent multiple simultaneous toggles (but allow the same module to be clicked again)
                                  if (togglingModuleId !== null && togglingModuleId !== moduleId) {
                                    console.log('[Frontend] Toggle already in progress for another module, ignoring click', {
                                      currentToggling: togglingModuleId,
                                      clickedModule: moduleId
                                    })
                                    return
                                  }
                                  
                                  setTogglingModuleId(moduleId)
                                  
                                  console.log('[Frontend] Button clicked!', {
                                    sectionId: moduleId,
                                    sectionTitle: section.title,
                                    wouldBeLocked,
                                    moduleStatus,
                                    isAdmin
                                  })
                                  
                                  const currentlyUnlocked = !wouldBeLocked
                                  const newUnlockedState = !currentlyUnlocked
                                  
                                  try {
                                    console.log('[Frontend] Toggling unlock:', {
                                      courseId: course.id,
                                      moduleId: moduleId,
                                      moduleTitle: section.title,
                                      unlocked: newUnlockedState,
                                      currentlyUnlocked,
                                      wouldBeLocked
                                    })
                                    
                                    const res = await fetch(`/api/courses/${course.id}/modules/${moduleId}/toggle-unlock`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ unlocked: newUnlockedState })
                                    })
                                    
                                    const data = await res.json()
                                    console.log('[Frontend] Toggle response:', { 
                                      status: res.status, 
                                      ok: res.ok, 
                                      data,
                                      moduleId,
                                      moduleTitle: section.title
                                    })
                                    
                                    if (res.ok && data.success) {
                                      console.log('[Frontend] Toggle successful, reloading unlock status for module:', moduleId, 'Response:', data)
                                      // Small delay to ensure database update is committed
                                      await new Promise(resolve => setTimeout(resolve, 200))
                                      
                                      // Force reload unlock status
                                      console.log('[Frontend] Calling loadUnlockStatus...')
                                      const unlockRes = await fetch(`/api/courses/${course.id}/unlock-status`)
                                      const unlockData = await unlockRes.json()
                                      console.log('[Frontend] Unlock status response:', unlockData)
                                      
                                      const statusMap: Record<string, { isLocked: boolean; wouldBeLocked?: boolean; lockReason: string | null; checkpoint: any }> = {}
                                      unlockData.modules?.forEach((module: any) => {
                                        console.log(`[Frontend] Processing module "${module.title}": isLocked=${module.isLocked}, wouldBeLocked=${module.wouldBeLocked}, globally_unlocked=${module.globally_unlocked}`)
                                        statusMap[module.id] = {
                                          isLocked: module.isLocked,
                                          wouldBeLocked: module.wouldBeLocked,
                                          lockReason: module.lockReason,
                                          checkpoint: module.checkpoint
                                        }
                                      })
                                      
                                      console.log('[Frontend] Setting unlock status:', statusMap)
                                      setUnlockStatus(statusMap)
                                      console.log('[Frontend] Unlock status updated in state')
                                    } else {
                                      console.error('[Frontend] Toggle failed:', data)
                                      alert(`Failed to toggle unlock status: ${data.error || 'Unknown error'}`)
                                    }
                                  } catch (error) {
                                    console.error('[Frontend] Error toggling unlock:', error)
                                    alert(`Error toggling unlock status: ${error instanceof Error ? error.message : 'Unknown error'}`)
                                  } finally {
                                    // Only clear if this is still the module being toggled
                                    setTogglingModuleId((current) => current === moduleId ? null : current)
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  if (e.nativeEvent) {
                                    e.nativeEvent.stopImmediatePropagation()
                                  }
                                }}
                                className={`flex-shrink-0 p-2 rounded transition-colors relative ${
                                  togglingModuleId === section.id 
                                    ? 'cursor-wait opacity-50' 
                                    : 'hover:bg-slate-700/50 cursor-pointer'
                                }`}
                                style={{ pointerEvents: 'auto', zIndex: 999 }}
                                title={togglingModuleId === section.id ? 'Updating...' : (wouldBeLocked ? 'Click to unlock this module' : 'Click to lock this module')}
                              >
                                {togglingModuleId === section.id ? (
                                  <Loader2 size={18} className="text-slate-400 animate-spin" />
                                ) : wouldBeLocked ? (
                                  <Lock size={18} className="text-slate-500" />
                                ) : (
                                  <Unlock size={18} className="text-emerald-400" />
                                )}
                              </button>
                            )}
                            
                            {/* Lock Icon - Show for non-admins if locked */}
                            {isLocked && !isAdmin && (
                              <Lock size={14} className="text-slate-500 flex-shrink-0" />
                            )}
                            
                            {/* Draggable Icon - Always visible for admins */}
                            {isAdmin && (
                              <SortableDragHandle attributes={attributes} listeners={listeners} />
                            )}
                          
                          {/* Expand/Collapse Chevron */}
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown size={16} className={`${wouldBeLocked ? 'text-slate-600' : 'text-[rgba(255,255,255,0.5)]'}`} />
                            ) : (
                              <ChevronRight size={16} className={`${wouldBeLocked ? 'text-slate-600' : 'text-[rgba(255,255,255,0.5)]'}`} />
                            )}
                          </div>
                          
                          {/* Module Title */}
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
                                className="w-full bg-transparent border-b border-cyan-500 outline-none text-sm font-semibold uppercase tracking-wide"
                                style={{ 
                                  color: 'rgba(34,211,238,0.9)',
                                  textShadow: '0 0 8px rgba(34,211,238,0.3), 0 0 16px rgba(34,211,238,0.2)'
                                }}
                                autoFocus
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <h4
                                  className="text-sm font-semibold uppercase tracking-wide"
                                  style={{ 
                                    color: wouldBeLocked && !isAdmin ? 'rgba(120,120,125,0.7)' : 'rgba(34,211,238,0.9)',
                                    textShadow: wouldBeLocked && !isAdmin ? 'none' : '0 0 8px rgba(34,211,238,0.3), 0 0 16px rgba(34,211,238,0.2)',
                                    letterSpacing: '0.08em'
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation()
                                    if (isAdmin) setEditingSectionId(section.id)
                                  }}
                                >
                                  {section.title}
                                </h4>
                                {/* Checkpoint Status Badge */}
                                {!isLocked && checkpoint && (
                                  <span className="text-xs" title={`Checkpoint: ${checkpoint.status}`}>
                                    {getCheckpointBadge()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Delete Button - Only visible on hover for admins */}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                console.log('Delete section clicked:', section.id)
                                handleDeleteSection(section.id)
                              }}
                              className="opacity-0 group-hover:opacity-70 hover:opacity-100 hover:text-red-400 transition-opacity p-1.5 flex-shrink-0"
                              title="Delete section (admin)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lessons */}
                      {isExpanded && (
                        <div className="bg-[rgba(0,0,0,0.2)]">
                          {sectionLessons.map((lesson: any, lessonIndex: number) => {
                            // Check if lesson is accessible
                            // Lesson is accessible if: section is unlocked OR lesson.always_unlocked OR user is admin
                            const lessonAccessible = !isLocked || lesson.always_unlocked || isAdmin
                            
                            return (
                            <div
                              key={lesson.id}
                              onClick={() => {
                                if (lessonAccessible) {
                                  setSelectedLesson(lesson)
                                  setSelectedSectionId(section.id)
                                } else if (lockReason) {
                                  alert(lockReason)
                                }
                              }}
                              className={`group/lesson px-4 py-2.5 pl-14 border-b border-[rgba(255,255,255,0.03)] transition-colors ${
                                lessonAccessible ? 'hover:bg-[rgba(255,255,255,0.05)] cursor-pointer' : 'cursor-not-allowed opacity-60'
                              } ${
                                selectedLesson?.id === lesson.id ? 'bg-[rgba(6,182,212,0.15)]' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {/* Lesson Number */}
                                <span className="text-xs text-slate-400 flex-shrink-0 min-w-[20px]">
                                  {lessonIndex + 1}.
                                </span>
                                
                                {/* Always Unlocked Toggle (Admin) */}
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleUpdateLesson(section.id, lesson.id, {
                                        always_unlocked: !lesson.always_unlocked
                                      })
                                    }}
                                    className="flex-shrink-0 p-1 hover:bg-slate-700/50 rounded transition-colors"
                                    title={lesson.always_unlocked ? 'Lesson is always unlocked (click to lock)' : 'Lesson follows section lock (click to always unlock)'}
                                  >
                                    {lesson.always_unlocked ? (
                                      <span className="text-xs text-cyan-400" title="Always unlocked">🔓</span>
                                    ) : (
                                      <span className="text-xs text-slate-500" title="Follows section lock">🔒</span>
                                    )}
                                  </button>
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
                                      selectedLesson?.id === lesson.id ? 'text-cyan-300' : 'text-slate-300 hover:text-slate-200'
                                    } ${isAdmin ? 'cursor-text hover:underline' : ''}`}
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
                                    title={isAdmin ? 'Double-click to edit lesson title' : ''}
                                  >
                                    {lesson.title}
                                  </span>
                                )}
                                
                                {/* Delete Button - Only visible on hover for admins */}
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      e.preventDefault()
                                      console.log('Delete lesson clicked:', lesson.id, 'from section:', section.id)
                                      handleDeleteLesson(section.id, lesson.id)
                                    }}
                                    className="opacity-0 group-hover/lesson:opacity-70 hover:opacity-100 hover:text-red-400 transition-opacity p-1 flex-shrink-0"
                                    title="Delete lesson (admin)"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                          })}
                          
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
                          
                          {/* Checkpoint Editor */}
                          {isAdmin && (
                            <div 
                              className="border-t border-[rgba(255,255,255,0.05)] mt-2 cursor-default" 
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              style={{ pointerEvents: 'auto' }}
                            >
                              {!checkpoints[section.id] && creatingCheckpointModuleId !== section.id ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCreatingCheckpointModuleId(section.id)
                                    setCheckpointFormData({
                                      title: '',
                                      description: '',
                                      requirements: '',
                                      ai_grading_prompt: '',
                                      ai_review_enabled: true,
                                      requires_manual_review: false
                                    })
                                  }}
                                  className="w-full px-4 py-2.5 pl-14 text-left text-sm text-[rgba(255,255,255,0.4)] hover:text-cyan-400 hover:bg-[rgba(255,255,255,0.02)] transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <Plus size={16} />
                                  Add Checkpoint
                                </button>
                              ) : creatingCheckpointModuleId === section.id ? (
                                <div 
                                  className="p-4 space-y-3 bg-slate-800/30 cursor-default"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Title *</label>
                                    <input
                                      type="text"
                                      value={checkpointFormData.title}
                                      onChange={(e) => setCheckpointFormData(prev => ({ ...prev, title: e.target.value }))}
                                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                      placeholder="Checkpoint title"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Description</label>
                                    <textarea
                                      value={checkpointFormData.description}
                                      onChange={(e) => setCheckpointFormData(prev => ({ ...prev, description: e.target.value }))}
                                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                      rows={2}
                                      placeholder="Description shown to users"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">Requirements *</label>
                                    <textarea
                                      value={checkpointFormData.requirements}
                                      onChange={(e) => setCheckpointFormData(prev => ({ ...prev, requirements: e.target.value }))}
                                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                      rows={3}
                                      placeholder="What user must submit"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">AI Grading Prompt</label>
                                    <textarea
                                      value={checkpointFormData.ai_grading_prompt}
                                      onChange={(e) => setCheckpointFormData(prev => ({ ...prev, ai_grading_prompt: e.target.value }))}
                                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                      rows={2}
                                      placeholder="Instructions for AI grader"
                                    />
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={checkpointFormData.ai_review_enabled}
                                        onChange={(e) => setCheckpointFormData(prev => ({ ...prev, ai_review_enabled: e.target.checked }))}
                                        className="rounded cursor-pointer"
                                      />
                                      AI Review Enabled
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={checkpointFormData.requires_manual_review}
                                        onChange={(e) => setCheckpointFormData(prev => ({ ...prev, requires_manual_review: e.target.checked }))}
                                        className="rounded cursor-pointer"
                                      />
                                      Requires Manual Review
                                    </label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleCreateCheckpoint(section.id)
                                      }}
                                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 rounded text-sm text-white"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setCreatingCheckpointModuleId(null)
                                      }}
                                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : checkpoints[section.id] ? (
                                <div 
                                  className="p-4 bg-slate-800/30 cursor-default"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-white">Checkpoint</h4>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingCheckpointId(checkpoints[section.id].id)
                                        }}
                                        className="p-1 hover:bg-slate-700 rounded"
                                        title="Edit checkpoint"
                                      >
                                        <Pencil size={14} className="text-slate-400" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteCheckpoint(checkpoints[section.id].id, section.id)
                                        }}
                                        className="p-1 hover:bg-red-900/50 rounded"
                                        title="Delete checkpoint"
                                      >
                                        <Trash2 size={14} className="text-red-400" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {editingCheckpointId === checkpoints[section.id].id ? (
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1">Title *</label>
                                        <input
                                          type="text"
                                          defaultValue={checkpoints[section.id].title}
                                          onBlur={(e) => {
                                            if (e.target.value !== checkpoints[section.id].title) {
                                              handleUpdateCheckpoint(checkpoints[section.id].id, { title: e.target.value })
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1">Description</label>
                                        <textarea
                                          defaultValue={checkpoints[section.id].description || ''}
                                          onBlur={(e) => {
                                            if (e.target.value !== (checkpoints[section.id].description || '')) {
                                              handleUpdateCheckpoint(checkpoints[section.id].id, { description: e.target.value })
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                          rows={2}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1">Requirements *</label>
                                        <textarea
                                          defaultValue={checkpoints[section.id].requirements}
                                          onBlur={(e) => {
                                            if (e.target.value !== checkpoints[section.id].requirements) {
                                              handleUpdateCheckpoint(checkpoints[section.id].id, { requirements: e.target.value })
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                          rows={3}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1">AI Grading Prompt</label>
                                        <textarea
                                          defaultValue={checkpoints[section.id].ai_grading_prompt || ''}
                                          onBlur={(e) => {
                                            if (e.target.value !== (checkpoints[section.id].ai_grading_prompt || '')) {
                                              handleUpdateCheckpoint(checkpoints[section.id].id, { ai_grading_prompt: e.target.value })
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
                                          rows={2}
                                        />
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            defaultChecked={checkpoints[section.id].ai_review_enabled}
                                            onChange={(e) => {
                                              handleUpdateCheckpoint(checkpoints[section.id].id, { ai_review_enabled: e.target.checked })
                                            }}
                                            className="rounded cursor-pointer"
                                          />
                                          AI Review Enabled
                                        </label>
                                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            defaultChecked={checkpoints[section.id].requires_manual_review}
                                            onChange={(e) => {
                                              handleUpdateCheckpoint(checkpoints[section.id].id, { requires_manual_review: e.target.checked })
                                            }}
                                            className="rounded cursor-pointer"
                                          />
                                          Requires Manual Review
                                        </label>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="text-slate-400">Title:</span>
                                        <span className="text-white ml-2">{checkpoints[section.id].title}</span>
                                      </div>
                                      {checkpoints[section.id].description && (
                                        <div>
                                          <span className="text-slate-400">Description:</span>
                                          <span className="text-white ml-2">{checkpoints[section.id].description}</span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-slate-400">Requirements:</span>
                                        <span className="text-white ml-2">{checkpoints[section.id].requirements}</span>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs">
                                        <span className={checkpoints[section.id].ai_review_enabled ? 'text-green-400' : 'text-slate-500'}>
                                          AI Review: {checkpoints[section.id].ai_review_enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                        <span className={checkpoints[section.id].requires_manual_review ? 'text-yellow-400' : 'text-slate-500'}>
                                          Manual Review: {checkpoints[section.id].requires_manual_review ? 'Required' : 'Not Required'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                        </div>
                      )}
                    </SortableModuleWrapper>
                  )
                })}
                  </div>
                </SortableContext>
              </DndContext>
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
                {(() => {
                  const videoInfo = getVideoId(selectedLesson)
                  
                  if (videoInfo.type === 'youtube' && videoInfo.id) {
                    return (
                      <iframe
                        key={`youtube-${selectedLesson.id}-${videoKey}`}
                        src={`https://www.youtube.com/embed/${videoInfo.id}?rel=0`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full absolute inset-0"
                        title={selectedLesson.title}
                        loading="eager"
                        onLoad={() => console.log('[SkillBankCourseView] YouTube iframe loaded:', selectedLesson.id, videoInfo.id)}
                        onError={(e) => console.error('[SkillBankCourseView] YouTube iframe error:', e, videoInfo)}
                      />
                    )
                  }
                  
                  if (videoInfo.type === 'loom' && videoInfo.id) {
                    return (
                      <iframe
                        key={`loom-${selectedLesson.id}-${videoKey}`}
                        src={`https://www.loom.com/embed/${videoInfo.id}`}
                        frameBorder="0"
                        allowFullScreen
                        className="w-full h-full absolute inset-0"
                        title={selectedLesson.title}
                        loading="eager"
                        onLoad={() => console.log('[SkillBankCourseView] Loom iframe loaded:', selectedLesson.id, videoInfo.id)}
                        onError={(e) => console.error('[SkillBankCourseView] Loom iframe error:', e, videoInfo)}
                      />
                    )
                  }
                  
                  if (isAdmin) {
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-slate-400">No video URL set. Add one below.</p>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-slate-400">Video coming soon</p>
                    </div>
                  )
                })()}
              </div>

              {/* Video Info & Description */}
              <div className="p-6 space-y-6 relative z-0">
                {/* Title */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedLesson.title}</h2>
                  {selectedSectionId && (
                    <p className="text-sm text-slate-400">
                      {sections.find(s => s.id === selectedSectionId)?.title || 'Section'}
                    </p>
                  )}
                </div>
                
                {/* Admin Video URL Input */}
                {isAdmin && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">YouTube ID/URL</label>
                    <input
                      type="text"
                      value={lessonVideoUrl}
                      onChange={(e) => setLessonVideoUrl(e.target.value)}
                      onBlur={handleVideoUrlBlur}
                      placeholder="YouTube ID or URL"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
                    />
                  </div>
                )}

                {/* Checkpoint Button - Centered above Notes */}
                {selectedLesson && selectedSectionId && (
                  <div className="mt-4 flex justify-center relative z-10">
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
                      
                      return null
                    })()}
                  </div>
                )}

                {/* Notes Section */}
                <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 mt-4">
                  {(() => {
                    const hasNotes = lessonNotes && lessonNotes.trim().length > 0
                    const isExpanded = notesExpanded[selectedLesson?.id] || false
                    const shouldAutoExpand = hasNotes && lessonNotes.length > 200
                    
                    // Debug logging
                    console.log('[SkillBankCourseView] Notes section render:', {
                      lessonId: selectedLesson?.id,
                      hasNotes,
                      notesLength: lessonNotes?.length || 0,
                      isExpanded,
                      shouldAutoExpand,
                      isAdmin
                    })
                    
                    return (
                      <>
                        <div className="flex items-center justify-between p-4">
                          <h3 className="text-sm font-semibold text-slate-300">Notes</h3>
                          <div className="flex items-center gap-2">
                            {isAdmin && selectedLesson && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  saveNotes()
                                }}
                                disabled={savingNotes[selectedLesson.id] || false}
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
                            {hasNotes && selectedLesson && (
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
                        {/* Always show for admins, show for regular users when expanded or when there are no notes */}
                        {(isAdmin || shouldAutoExpand || isExpanded || !hasNotes) && (
                          <div className="px-4 pb-4">
                            {isAdmin ? (
                              <textarea
                                value={lessonNotes}
                                onChange={(e) => handleNotesChange(e.target.value)}
                                onBlur={handleNotesBlur}
                                placeholder="Add your notes, thoughts, or questions about this lesson... (Auto-saves as you type)"
                                className="w-full bg-transparent text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-lg p-3 text-sm leading-relaxed border border-slate-700/50"
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
                                {lessonNotes && lessonNotes.trim() ? lessonNotes : <span className="text-slate-500 italic">No notes available</span>}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Show collapsed preview for regular users only when collapsed and notes exist */}
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
                <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 mt-4">
                  {(() => {
                    console.log('[SkillBankCourseView] Attachments section render:', {
                      lessonId: selectedLesson?.id,
                      attachmentsCount: lessonAttachments.length,
                      attachments: lessonAttachments
                    })
                    return null
                  })()}
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
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-colors">
                          <Paperclip className="w-4 h-4" />
                          Upload
                        </span>
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
                              <span className="text-sm text-slate-300">{attachment.title || 'Untitled'}</span>
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
                        onSuccess={async (status) => {
                          // Refresh unlock status after submission
                          await loadUnlockStatus()
                          
                          if (status === 'approved' || status === 'needs_review') {
                            setCheckpointModalOpen(false)
                            alert(status === 'approved' ? '✅ Checkpoint approved! Next module unlocked.' : '⏳ Checkpoint submitted! Under review.')
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
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

      {/* Import Modal */}
      {importModalOpen && (
        <CourseImporter
          courseId={course.id}
          onImportComplete={async () => {
            await loadSections()
            setImportModalOpen(false)
          }}
          onClose={() => setImportModalOpen(false)}
        />
      )}
    </div>
  )
}
