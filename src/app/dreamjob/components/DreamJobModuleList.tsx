'use client'

import React, { useState, useEffect } from 'react'
import { Paperclip, X, Download, Save, Loader2, Check, Edit2, GripVertical, FileCheck, Lock } from 'lucide-react'
import { CheckpointSubmission } from '@/components/CheckpointSubmission'
import { useUnlockContext } from '@/contexts/UnlockContext'
import { AIChatBot } from './AIChatBot'
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

interface Video {
  id: string
  title: string
  youtubeId: string
}

interface Module {
  id: number
  number: number
  title: string
  description: string
  videos: Video[]
}

interface Attachment {
  id: string
  name: string
  file: File
}

interface DreamJobModuleListProps {
  modules: Module[]
  affiliate?: {
    role?: string
    [key: string]: any
  }
  onVideoSelect?: (video: Video, module: Module) => void
  onDataChange?: () => void
}

// Sortable Module Component
function SortableModule({ 
  module, 
  isExpanded, 
  isAdmin, 
  editing, 
  editValues,
  selectedVideo,
  getVideoTitle,
  isUnlocked,
  onToggle,
  onEdit,
  onUpdateEditValues,
  onSaveEdit,
  onCancelEdit,
  onVideoSelect,
  onEditVideo,
  onVideosUpdate
}: {
  module: Module
  isExpanded: boolean
  isAdmin: boolean
  editing: { type: 'module' | 'video', moduleId?: number, videoId?: string } | null
  editValues: any
  selectedVideo: { moduleId: number, video: Video } | null
  getVideoTitle: (video: Video) => string
  isUnlocked: boolean
  onToggle: (id: number) => void
  onEdit: (moduleId: number) => void
  onUpdateEditValues: (values: any) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onVideoSelect: (moduleId: number, video: Video) => void
  onEditVideo: (moduleId: number, video: Video) => void
  onVideosUpdate?: (moduleId: number, newVideos: Video[]) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: 'rgba(34,211,238,0.15)'
      }}
      className="border-b last:border-b-0"
    >
      {/* Module Header */}
      <div className="w-full px-4 py-3 flex items-center gap-3" style={{
        background: 'rgba(15,15,20,0.6)',
        borderLeft: '2px solid transparent',
        borderBottom: '1px solid rgba(34,211,238,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{
          background: 'linear-gradient(to bottom, rgba(34,211,238,0.4), rgba(6,182,212,0.5), rgba(34,211,238,0.4))',
          boxShadow: '0 0 4px rgba(34,211,238,0.3)',
          opacity: 0.6
        }} />
        {isAdmin && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1"
            style={{ color: 'rgba(120,120,125,0.4)' }}
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (!isUnlocked && !isAdmin) {
              return // Don't allow toggle if locked
            }
            onToggle(module.id)
          }}
          disabled={!isUnlocked && !isAdmin}
          className={`flex-1 flex items-center gap-2.5 text-left transition-all ${!isUnlocked && !isAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
          style={{ 
            paddingLeft: '2px'
          }}
        >
          {!isUnlocked && !isAdmin && (
            <Lock className="w-4 h-4 text-slate-500" />
          )}
          <svg
            className="transition-transform duration-200"
            style={{
              width: '10px',
              height: '10px',
              color: isUnlocked || isAdmin ? 'rgba(34,211,238,0.5)' : 'rgba(100,100,105,0.5)',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{
              color: isUnlocked || isAdmin ? 'rgba(220,220,225,0.95)' : 'rgba(120,120,125,0.8)',
              textShadow: isUnlocked || isAdmin ? '0 0 12px rgba(34,211,238,0.5), 0 0 20px rgba(34,211,238,0.3), 0 0 30px rgba(34,211,238,0.2)' : 'none',
              letterSpacing: '0.08em',
              fontWeight: 600
            }}>
              {module.title}
              {!isUnlocked && !isAdmin && ' 🔒'}
            </div>
          </div>
        </button>
      </div>

      {/* Module Lessons */}
      {isExpanded && (
        <>
          {!isUnlocked && !isAdmin ? (
            <div className="px-4 py-6 text-center bg-slate-900/30 border-t border-slate-700/30">
              <Lock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-1">This module is locked</p>
              <p className="text-slate-500 text-xs">Complete the previous module's checkpoint to unlock this content</p>
            </div>
          ) : (
            <SortableVideoList
              videos={module.videos}
              moduleId={module.id}
              isAdmin={isAdmin}
              selectedVideo={selectedVideo}
              getVideoTitle={getVideoTitle}
              onVideoSelect={onVideoSelect}
              onVideosUpdate={onVideosUpdate}
            />
          )}
        </>
      )}
    </div>
  )
}

// Sortable Video Component
function SortableVideoItem({
  video,
  index,
  moduleId,
  isAdmin,
  isSelected,
  isLast,
  displayTitle,
  onVideoSelect
}: {
  video: Video
  index: number
  moduleId: number
  isAdmin: boolean
  isSelected: boolean
  isLast: boolean
  displayTitle: string
  onVideoSelect: (moduleId: number, video: Video) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `video-${moduleId}-${video.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: 'rgba(34,211,238,0.05)',
        background: isSelected 
          ? 'rgba(25,25,30,0.5)'
          : 'rgba(20,20,25,0.3)',
        borderLeft: isSelected ? '2px solid rgba(34,211,238,0.4)' : '2px solid transparent',
        boxShadow: isSelected ? 'inset 0 0 15px rgba(34,211,238,0.08)' : 'none'
      }}
      className="w-full px-4 py-1.5 pl-12 flex items-center gap-2.5 transition-all border-b last:border-b-0"
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(25,25,30,0.4)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(20,20,25,0.3)'
        }
      }}
    >
      {isAdmin && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1"
          style={{ color: 'rgba(90,90,95,0.3)' }}
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-2.5 h-2.5" />
        </div>
      )}
      <button
        type="button"
        onClick={() => onVideoSelect(moduleId, video)}
        className="flex-1 text-left"
      >
        <div className="text-xs leading-relaxed" style={{
          color: isSelected ? 'rgba(34,211,238,0.9)' : 'rgba(170,170,175,0.85)',
          textShadow: isSelected ? '0 0 6px rgba(34,211,238,0.2)' : 'none',
          fontWeight: isSelected ? 500 : 400
        }}>
          <span style={{ 
            color: 'rgba(110,110,115,0.5)',
            marginRight: '8px',
            fontSize: '10px',
            fontVariantNumeric: 'tabular-nums'
          }}>{index + 1}.</span>
          {displayTitle}
        </div>
      </button>
    </div>
  )
}

// Sortable Video List Component
function SortableVideoList({
  videos,
  moduleId,
  isAdmin,
  selectedVideo,
  getVideoTitle,
  onVideoSelect,
  onVideosUpdate
}: {
  videos: Video[]
  moduleId: number
  isAdmin: boolean
  selectedVideo: { moduleId: number, video: Video } | null
  getVideoTitle: (video: Video) => string
  onVideoSelect: (moduleId: number, video: Video) => void
  onVideosUpdate?: (moduleId: number, newVideos: Video[]) => void
}) {
  const [videosList, setVideosList] = useState<Video[]>(videos)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    setVideosList(videos)
  }, [videos])

  const handleVideoDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = videosList.findIndex(v => `video-${moduleId}-${v.id}` === active.id)
    const newIndex = videosList.findIndex(v => `video-${moduleId}-${v.id}` === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newVideos = arrayMove(videosList, oldIndex, newIndex)
      setVideosList(newVideos)

      // Save new order to API (autosave without page reload)
      try {
        const res = await fetch('/api/courses/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'video',
            courseType: 'dreamjob',
            moduleId: moduleId,
            items: newVideos.map((video, index) => ({
              id: video.id,
              sortOrder: index
            }))
          })
        })
        
        if (!res.ok) {
          // Revert on error
          setVideosList(videos)
          alert('Error saving video order')
        }
        // Success - state already updated, changes are live immediately
      } catch (error) {
        console.error('Error reordering videos:', error)
        // Revert on error
        setVideosList(videos)
        alert('Error saving video order')
      }
    }
  }

  return (
    <div className="bg-slate-900/50 border-t border-slate-700/30">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleVideoDragEnd}
      >
        <SortableContext
          items={videosList.map(v => `video-${moduleId}-${v.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {videosList.map((video, index) => {
            const isSelected = selectedVideo?.moduleId === moduleId && selectedVideo?.video.id === video.id
            const displayTitle = getVideoTitle(video)
            const isLast = index === videosList.length - 1
            return (
              <SortableVideoItem
                key={video.id}
                video={video}
                index={index}
                moduleId={moduleId}
                isAdmin={isAdmin}
                isSelected={isSelected}
                isLast={isLast}
                displayTitle={displayTitle}
                onVideoSelect={onVideoSelect}
              />
            )
          })}
        </SortableContext>
      </DndContext>
    </div>
  )
}

export function DreamJobModuleList({ modules, affiliate, onVideoSelect, onDataChange }: DreamJobModuleListProps) {
  const isAdmin = affiliate?.role === 'admin' || affiliate?.role === 'moderator'
  const [expandedModule, setExpandedModule] = useState<number | null>(1)
  const [selectedVideo, setSelectedVideo] = useState<{ moduleId: number, video: Video } | null>(
    modules[0]?.videos[0] ? { moduleId: modules[0].id, video: modules[0].videos[0] } : null
  )
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [notesSaved, setNotesSaved] = useState<Record<string, boolean>>({})
  const [attachments, setAttachments] = useState<Record<string, any[]>>({})
  const [loadingAttachments, setLoadingAttachments] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<{ type: 'module' | 'video', moduleId?: number, videoId?: string } | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [modulesList, setModulesList] = useState(modules)
  const [checkpoints, setCheckpoints] = useState<Record<number, any>>({})
  const [unlockDataState, setUnlockDataState] = useState<any>(null)
  const [loadingCheckpoints, setLoadingCheckpoints] = useState<Record<number, boolean>>({})
  const [checkpointModalOpen, setCheckpointModalOpen] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [unlockedModuleId, setUnlockedModuleId] = useState<number | null>(null)
  // Direct unlock state from database - single source of truth
  const [unlockedModules, setUnlockedModules] = useState<Set<number>>(new Set([1]))
  const [defaultUnlockedIds, setDefaultUnlockedIds] = useState<number[]>([1])
  
  // Use centralized unlock context as backup
  const { markModuleUnlocked, moduleUnlockStatus, initializeForCourse } = useUnlockContext()
  
  // Fetch unlocks and course config from API on mount
  useEffect(() => {
    const fetchUnlocksAndConfig = async () => {
      try {
        // Fetch course config to get default unlocked modules
        const configRes = await fetch('/api/courses/config?course=dreamjob')
        const configData = await configRes.json()
        console.log('[DreamJob] Course config:', configData)
        
        if (configData.defaultUnlockedModuleIds) {
          setDefaultUnlockedIds(configData.defaultUnlockedModuleIds)
        }
        
        // Fetch user's unlocked modules
        const unlocksRes = await fetch('/api/user/module-unlocks?course=dreamjob')
        const unlocksData = await unlocksRes.json()
        console.log('[DreamJob] User unlocks:', unlocksData)
        
        if (unlocksData.unlockedModules && Array.isArray(unlocksData.unlockedModules)) {
          setUnlockedModules(new Set(unlocksData.unlockedModules))
        }
      } catch (err) {
        console.error('[DreamJob] Error fetching config/unlocks:', err)
      }
    }
    fetchUnlocksAndConfig()
  }, [])
  
  // Combined unlock check: direct state OR defaults
  const isModuleUnlocked = (moduleId: number) => {
    // Check default unlocked IDs (from API config)
    if (defaultUnlockedIds.includes(moduleId)) return true
    // Check user's unlocked modules (from API)
    if (unlockedModules.has(moduleId)) return true
    // Check context as fallback
    if (moduleUnlockStatus[moduleId] === true) return true
    return false
  }

  // Update modulesList when modules prop changes, ensuring they're sorted by id
  useEffect(() => {
    const sortedModules = [...modules].sort((a, b) => a.id - b.id)
    setModulesList(sortedModules)
  }, [modules])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const toggleModule = (moduleId: number) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId)
  }

  const handleVideoSelect = (moduleId: number, video: Video) => {
    // Check if module is unlocked using centralized context (SINGLE SOURCE OF TRUTH)
    const unlocked = isModuleUnlocked(moduleId)
    if (!unlocked && !isAdmin) {
      console.log('[DreamJob] Cannot select video - module is locked:', moduleId)
      return
    }
    
    setSelectedVideo({ moduleId, video })
    const module = modules.find(m => m.id === moduleId)
    if (module && onVideoSelect) {
      onVideoSelect(video, module)
    }
  }

  const handleTitleChange = (videoId: string, newTitle: string) => {
    setVideoTitles(prev => ({ ...prev, [videoId]: newTitle }))
  }

  const handleSaveEdit = async () => {
    if (!editing) return

    try {
      // Extract YouTube ID from URL if provided
      const extractYouTubeId = (url: string) => {
        if (!url) return ''
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0].split('&')[0]
        if (url.includes('youtube.com/watch?v=')) return url.split('youtube.com/watch?v=')[1].split('&')[0]
        if (url.includes('youtube.com/embed/')) return url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0]
        return url
      }

      // Save video updates
      if (editing.type === 'video') {
        const updateData: any = {
          title: editValues.title
        }
        if (editValues.youtubeId) updateData.youtubeId = extractYouTubeId(editValues.youtubeId)

        const res = await fetch('/api/courses/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'video',
            sectionId: editing.moduleId,
            videoId: editing.videoId,
            updates: updateData
          })
        })

        if (!res.ok) {
          alert('Error saving video changes')
          return
        }

        // Save module title if changed
        if (editValues.moduleTitle && editing.moduleId) {
          const moduleRes = await fetch('/api/admin/courses/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'section',
              sectionId: editing.moduleId,
              updates: { title: editValues.moduleTitle }
            })
          })

          if (!moduleRes.ok) {
            alert('Video saved but error saving module title')
            return
          }
        }

        // Reload page to reflect changes
        window.location.reload()
      } else if (editing.type === 'module') {
        const updateData: any = {
          title: editValues.title,
          description: editValues.description
        }

        const res = await fetch('/api/courses/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'section',
            sectionId: editing.moduleId,
            updates: updateData
          })
        })

        if (res.ok) {
          window.location.reload()
        } else {
          alert('Error saving changes')
        }
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving changes')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = modulesList.findIndex((m) => m.id === active.id)
      const newIndex = modulesList.findIndex((m) => m.id === over.id)

      const newOrder = arrayMove(modulesList, oldIndex, newIndex)
      setModulesList(newOrder)

      // Save new order to API
      try {
        const res = await fetch('/api/courses/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'module',
            courseType: 'dreamjob',
            items: newOrder.map((m, index) => ({ id: m.id, sortOrder: index }))
          })
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error('Error saving module order:', errorData)
          // Revert on error
          setModulesList(modules)
          alert('Error saving new order: ' + (errorData.error || 'Unknown error'))
        } else {
          // Success - order is saved to database
          // Refresh data after a short delay to get the updated order from database
          // This ensures other admins see the change in real-time
          setTimeout(() => {
            if (onDataChange) {
              onDataChange()
            }
          }, 500)
        }
      } catch (error) {
        console.error('Error saving order:', error)
        setModulesList(modules)
        alert('Error saving new order')
      }
    }
  }

  const handleNotesChange = (videoId: string, newNotes: string) => {
    setNotes(prev => ({ ...prev, [videoId]: newNotes }))
  }

  const fetchNotes = async (videoId: string) => {
    try {
      const res = await fetch(`/api/courses/video-notes?videoId=${videoId}&courseType=dreamjob`)
      const data = await res.json()
      if (res.ok && data.notes !== undefined) {
        setNotes(prev => ({ ...prev, [videoId]: data.notes || '' }))
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const saveNotes = async (videoId: string) => {
    if (!isAdmin) return
    
    setSavingNotes(prev => ({ ...prev, [videoId]: true }))
    setNotesSaved(prev => ({ ...prev, [videoId]: false }))
    try {
      const res = await fetch('/api/courses/video-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          courseType: 'dreamjob',
          notes: notes[videoId] || ''
        })
      })
      const data = await res.json()
      if (res.ok) {
        // Notes saved successfully - show checkmark
        setNotesSaved(prev => ({ ...prev, [videoId]: true }))
        // Hide checkmark after 3 seconds
        setTimeout(() => {
          setNotesSaved(prev => ({ ...prev, [videoId]: false }))
        }, 3000)
      } else {
        const errorMsg = data.error || 'Unknown error'
        const details = data.details ? `\n\nDetails: ${data.details}` : ''
        const hint = data.hint ? `\n\n${data.hint}` : ''
        alert(`Failed to save notes: ${errorMsg}${details}${hint}`)
      }
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Failed to save notes')
    } finally {
      setSavingNotes(prev => ({ ...prev, [videoId]: false }))
    }
  }

  const fetchAttachments = async (videoId: string) => {
    if (loadingAttachments[videoId]) return
    setLoadingAttachments(prev => ({ ...prev, [videoId]: true }))
    try {
      const res = await fetch(`/api/courses/video-attachments?videoId=${videoId}&courseType=dreamjob`)
      const data = await res.json()
      if (res.ok && data.attachments) {
        setAttachments(prev => ({ ...prev, [videoId]: data.attachments }))
      }
    } catch (error) {
      console.error('Error fetching attachments:', error)
    } finally {
      setLoadingAttachments(prev => ({ ...prev, [videoId]: false }))
    }
  }

  const handleAddAttachment = async (videoId: string, files: FileList | null) => {
    if (!files || !isAdmin) return
    
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('videoId', videoId)
      formData.append('courseType', 'dreamjob')

      try {
        const res = await fetch('/api/courses/video-attachments', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (res.ok && data.attachment) {
          await fetchAttachments(videoId)
        } else {
          alert(data.error || 'Failed to upload attachment')
        }
      } catch (error) {
        console.error('Error uploading attachment:', error)
        alert('Failed to upload attachment')
      }
    }
  }

  const handleRemoveAttachment = async (videoId: string, attachmentId: string) => {
    if (!isAdmin) return
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      const res = await fetch('/api/courses/video-attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId })
      })
      const data = await res.json()
      if (res.ok) {
        await fetchAttachments(videoId)
      } else {
        alert(data.error || 'Failed to delete attachment')
      }
    } catch (error) {
      console.error('Error deleting attachment:', error)
      alert('Failed to delete attachment')
    }
  }

  const getVideoTitle = (video: Video) => {
    return videoTitles[video.id] !== undefined ? videoTitles[video.id] : video.title
  }

  const getVideoNotes = (video: Video) => {
    return notes[video.id] || ''
  }

  const getVideoAttachments = (video: Video) => {
    return attachments[video.id] || []
  }

  // Fetch checkpoints (unlock status is managed by UnlockContext)
  const fetchCheckpoints = async () => {
    try {
      // Get unlock data to map section UUIDs to module IDs
      const unlockRes = await fetch('/api/user/unlocks?courseType=dreamjob')
      const unlockData = await unlockRes.json()
      
      if (unlockData.sections) {
        setUnlockDataState(unlockData)
        
        const checkpointMap: Record<number, any> = {}
        
        // Fetch all checkpoints from public API
        try {
          const checkpointRes = await fetch(`/api/checkpoints/by-course?course=dreamjob`)
          if (checkpointRes.ok) {
            const checkpointData = await checkpointRes.json()
            console.log('[DreamJob] Checkpoint API response:', checkpointData)
            
            const { byUUID, byNumericId, byTitle } = checkpointData
            
            // Map checkpoints to module IDs using multiple lookup methods
            modulesList.forEach((module: any) => {
              // Try by UUID if module has uuid
              if (module.uuid && byUUID && byUUID[module.uuid]) {
                checkpointMap[module.id] = byUUID[module.uuid]
                console.log(`[DreamJob] ✓ Mapped checkpoint to module ${module.id} via UUID`)
              }
              // Try by numeric ID
              else if (byNumericId && byNumericId[module.id]) {
                checkpointMap[module.id] = byNumericId[module.id]
                console.log(`[DreamJob] ✓ Mapped checkpoint to module ${module.id} via numeric ID`)
              }
              // Try by title
              else if (module.title && byTitle && byTitle[module.title]) {
                checkpointMap[module.id] = byTitle[module.title]
                console.log(`[DreamJob] ✓ Mapped checkpoint to module ${module.id} via title`)
              }
            })
            
            console.log('[DreamJob] Total checkpoints mapped:', Object.keys(checkpointMap).length)
            setCheckpoints(checkpointMap)
          } else {
            console.error('[DreamJob] Checkpoint fetch failed:', checkpointRes.status)
          }
        } catch (error) {
          console.error('[DreamJob] Error fetching checkpoints:', error)
        }
      }
    } catch (error) {
      console.error('Error fetching checkpoints:', error)
    }
  }

  // Initialize unlock context and fetch checkpoints on mount
  useEffect(() => {
    if (modulesList.length > 0) {
      // Initialize unlock context with module IDs
      initializeForCourse('dreamjob', modulesList.map(m => m.id))
      // Fetch checkpoint data (separate from unlock status)
      fetchCheckpoints()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesList]) // initializeForCourse is stable, no need to depend on it

  // Fetch checkpoint for currently selected section if not already loaded
  useEffect(() => {
    if (!selectedVideo) return
    
    const moduleId = selectedVideo.moduleId
    const currentCheckpoint = checkpoints[moduleId]
    const hasCheckpoint = currentCheckpoint && currentCheckpoint.id && currentCheckpoint.title && currentCheckpoint.requirements
    const isLoading = loadingCheckpoints[moduleId]
    
    // If we already have full checkpoint data, skip
    if (hasCheckpoint) {
      console.log('[DreamJob Checkpoint Fetch Effect] Already have checkpoint for module:', moduleId)
      return
    }
    
    // If already loading, skip
    if (isLoading) {
      console.log('[DreamJob Checkpoint Fetch Effect] Already loading checkpoint for module:', moduleId)
      return
    }
    
    console.log('[DreamJob Checkpoint Fetch Effect] Fetching for module:', moduleId)
    
    const module = modulesList.find(m => m.id === moduleId)
    
    if (!module) {
      console.log('[DreamJob Checkpoint Fetch Effect] Module not found')
      return
    }
    
    // Try multiple methods to find checkpoint
    const fetchCheckpoint = async () => {
      setLoadingCheckpoints(prev => ({ ...prev, [moduleId]: true }))
      
      try {
        // Method 1: Check unlock status for checkpoint ID (MOST RELIABLE)
        if (unlockDataState?.sections) {
          const matchingUnlock = unlockDataState.sections.find((s: any) => 
            s.section_id === moduleId || s.title === module.title || s.id === moduleId
          )
          
          console.log('[DreamJob Checkpoint Fetch Effect] Matching unlock section:', matchingUnlock)
          console.log('[DreamJob Checkpoint Fetch Effect] Looking for module:', module.title, 'ID:', moduleId)
          
          if (matchingUnlock?.checkpointId) {
            console.log('[DreamJob Checkpoint Fetch Effect] ✅ Found checkpoint ID in unlock status:', matchingUnlock.checkpointId)
            
            // Try direct fetch by checkpoint ID (this is the most reliable method)
            const res = await fetch(`/api/checkpoints/${matchingUnlock.checkpointId}`)
            const data = await res.json()
            
            console.log('[DreamJob Checkpoint Fetch Effect] Checkpoint fetch response:', data)
            
            if (data.checkpoint && data.checkpoint.id && data.checkpoint.title && data.checkpoint.requirements) {
              console.log('[DreamJob Checkpoint Fetch Effect] ✅ Successfully fetched checkpoint:', data.checkpoint)
              setCheckpoints(prev => ({ ...prev, [moduleId]: data.checkpoint }))
              setLoadingCheckpoints(prev => ({ ...prev, [moduleId]: false }))
              return
            } else {
              console.warn('[DreamJob Checkpoint Fetch Effect] Checkpoint data incomplete:', data.checkpoint)
            }
          } else {
            console.log('[DreamJob Checkpoint Fetch Effect] No checkpointId in unlock status for module:', module.title)
          }
        }
        
        // Method 2: Try fetching by numeric module ID
        console.log('[DreamJob Checkpoint Fetch Effect] Trying to fetch by module ID:', moduleId)
        const res2 = await fetch(`/api/checkpoints/${moduleId}`)
        const data2 = await res2.json()
        
        if (data2.checkpoint && data2.checkpoint.id && data2.checkpoint.title && data2.checkpoint.requirements) {
          console.log('[DreamJob Checkpoint Fetch Effect] Successfully fetched checkpoint by module ID:', data2.checkpoint)
          setCheckpoints(prev => ({ ...prev, [moduleId]: data2.checkpoint }))
          setLoadingCheckpoints(prev => ({ ...prev, [moduleId]: false }))
          return
        }
        
        // Method 3: Try public checkpoint API by title
        console.log('[DreamJob Checkpoint Fetch Effect] Trying public checkpoint API')
        const res3 = await fetch(`/api/checkpoints/by-course?course=dreamjob`)
        const data3 = await res3.json()
        
        if (data3.byTitle && data3.byTitle[module.title]) {
          console.log('[DreamJob Checkpoint Fetch Effect] ✅ Found checkpoint by title:', data3.byTitle[module.title])
          setCheckpoints(prev => ({ ...prev, [moduleId]: data3.byTitle[module.title] }))
          setLoadingCheckpoints(prev => ({ ...prev, [moduleId]: false }))
          return
        }
        
        // Also try by section UUID from unlock data
        const matchingUnlock = unlockDataState?.sections?.find((s: any) => 
          s.title === module.title
        )
        
        console.log('[DreamJob Checkpoint Fetch Effect] Matching unlock section:', matchingUnlock)
        
        if (matchingUnlock?.id && data3.byUUID && data3.byUUID[matchingUnlock.id]) {
          console.log('[DreamJob Checkpoint Fetch Effect] ✅ Found checkpoint by UUID!')
          setCheckpoints(prev => ({ ...prev, [moduleId]: data3.byUUID[matchingUnlock.id] }))
          setLoadingCheckpoints(prev => ({ ...prev, [moduleId]: false }))
          return
        }
        
        console.log('[DreamJob Checkpoint Fetch Effect] No checkpoint found')
        setLoadingCheckpoints(prev => ({ ...prev, [moduleId]: false }))
      } catch (error) {
        console.error('[DreamJob Checkpoint Fetch Effect] Error:', error)
        setLoadingCheckpoints(prev => ({ ...prev, [moduleId]: false }))
      }
    }
    
    fetchCheckpoint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo?.moduleId, unlockDataState, modulesList.length])

  // Fetch attachments and notes when video is selected
  useEffect(() => {
    if (selectedVideo?.video?.id) {
      fetchAttachments(selectedVideo.video.id)
      fetchNotes(selectedVideo.video.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo?.video?.id])

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Course Navigation */}
      <div className="w-80 rounded-lg overflow-hidden flex flex-col max-h-[calc(100vh-200px)] sticky top-4" style={{
        background: 'linear-gradient(135deg, rgba(35,35,40,0.95) 0%, rgba(30,30,35,0.98) 50%, rgba(25,25,30,0.95) 100%)',
        border: '1px solid rgba(70,70,75,0.6)',
        boxShadow: `
          inset 0 1px 1px rgba(255,255,255,0.05),
          inset 0 -1px 1px rgba(0,0,0,0.8),
          0 2px 8px rgba(0,0,0,0.6)
        `
      }}>
        <div className="p-3 shrink-0 border-b" style={{
          borderColor: 'rgba(34,211,238,0.2)',
          background: 'linear-gradient(135deg, rgba(40,40,45,0.9) 0%, rgba(35,35,40,0.95) 100%)'
        }}>
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{
            color: 'rgba(34,211,238,0.9)',
            textShadow: '0 0 8px rgba(34,211,238,0.4)'
          }}>Course Modules</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={modulesList.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {[...modulesList].sort((a, b) => a.id - b.id).map((module) => {
                const isExpanded = expandedModule === module.id
                // Use centralized unlock context (SINGLE SOURCE OF TRUTH)
                const unlocked = isModuleUnlocked(module.id)
                return (
                  <SortableModule
                    key={module.id}
                    module={module}
                    isExpanded={isExpanded}
                    isAdmin={isAdmin}
                    editing={editing}
                    editValues={editValues}
                    selectedVideo={selectedVideo}
                    getVideoTitle={getVideoTitle}
                    isUnlocked={unlocked}
                    onToggle={toggleModule}
                    onEdit={(moduleId) => {
                      setEditing({ type: 'module', moduleId })
                      setEditValues({ title: module.title, description: module.description })
                    }}
                    onUpdateEditValues={setEditValues}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditing(null)}
                    onVideoSelect={handleVideoSelect}
                    onEditVideo={(moduleId, video) => {
                      setEditing({ type: 'video', moduleId, videoId: video.id })
                      setEditValues({ title: getVideoTitle(video), youtubeId: video.youtubeId })
                    }}
                    onVideosUpdate={(moduleId, newVideos) => {
                      setModulesList(prev => prev.map(m => 
                        m.id === moduleId 
                          ? { ...m, videos: newVideos }
                          : m
                      ))
                    }}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Right Main Content - Video Player */}
      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        {selectedVideo ? (
          <div className="space-y-0">
            {/* Video Player */}
            <div className="aspect-video bg-slate-900 border-b border-slate-700/50 relative">
              {selectedVideo.video.youtubeId ? (
                <iframe
                  key={`${selectedVideo.video.id}-${selectedVideo.video.youtubeId}`}
                  src={`https://www.youtube.com/embed/${selectedVideo.video.youtubeId}?rel=0`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full absolute inset-0"
                  title={selectedVideo.video.title}
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-slate-400">Video URL not available</p>
                </div>
              )}
            </div>

            {/* Video Info & Description */}
            <div className="p-6 space-y-6 relative z-0">
              {/* Editable Title & Module Info */}
              {isAdmin && editing?.type === 'video' && editing.videoId === selectedVideo.video.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Video Title</label>
                    <input
                      type="text"
                      value={editValues.title || getVideoTitle(selectedVideo.video)}
                      onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 text-lg font-bold"
                      placeholder="Video title"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">YouTube ID/URL</label>
                    <input
                      type="text"
                      value={editValues.youtubeId || selectedVideo.video.youtubeId || ''}
                      onChange={(e) => setEditValues({ ...editValues, youtubeId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
                      placeholder="YouTube ID or URL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Module Title</label>
                    <input
                      type="text"
                      value={editValues.moduleTitle || modulesList.find(m => m.id === selectedVideo.moduleId)?.title || ''}
                      onChange={(e) => setEditValues({ ...editValues, moduleTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
                      placeholder="Module title"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white mb-1">{getVideoTitle(selectedVideo.video)}</h2>
                      <p className="text-sm text-slate-400">{modulesList.find(m => m.id === selectedVideo.moduleId)?.title || 'Module'}</p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const module = modulesList.find(m => m.id === selectedVideo.moduleId)
                          setEditing({ type: 'video', moduleId: selectedVideo.moduleId, videoId: selectedVideo.video.id })
                          setEditValues({ 
                            title: getVideoTitle(selectedVideo.video), 
                            youtubeId: selectedVideo.video.youtubeId || '',
                            moduleTitle: module?.title || ''
                          })
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Edit video details"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Checkpoint Button - Centered above Notes */}
              {selectedVideo && (
                <div className="mt-4 flex justify-center relative z-10">
                  {(() => {
                    const moduleId = selectedVideo.moduleId
                    const module = modulesList.find(m => m.id === moduleId)
                    const matchingUnlock = unlockDataState?.sections?.find((s: any) => 
                      s.section_id === moduleId || s.title === module?.title
                    )
                    
                    // Debug logging
                    console.log('[DreamJob Checkpoint Button] Module ID:', moduleId)
                    console.log('[DreamJob Checkpoint Button] Module:', module)
                    console.log('[DreamJob Checkpoint Button] Checkpoints map:', checkpoints)
                    console.log('[DreamJob Checkpoint Button] Checkpoint for this module:', checkpoints[moduleId])
                    console.log('[DreamJob Checkpoint Button] Matching unlock:', matchingUnlock)
                    
                    // Try to get checkpoint from map
                    let checkpoint = checkpoints[moduleId]
                    
                    // Try to find checkpoint by section title if not found by ID
                    if (!checkpoint && module?.title) {
                      // Search all checkpoints to find one matching this module's title
                      const allCheckpoints = Object.values(checkpoints)
                      const matchingCheckpoint = allCheckpoints.find((cp: any) => {
                        // Check if this checkpoint's section matches our module
                        return matchingUnlock?.checkpointId === cp?.id
                      })
                      if (matchingCheckpoint) {
                        checkpoint = matchingCheckpoint as any
                        // Also store it in the map for future use
                        setCheckpoints(prev => ({ ...prev, [moduleId]: checkpoint }))
                      }
                    }
                    
                    // Show button if checkpoint exists
                    if (checkpoint && checkpoint.id && checkpoint.title && checkpoint.requirements) {
                      return (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('[DreamJob] Opening checkpoint modal for module:', moduleId)
                            console.log('[DreamJob] Setting checkpointModalOpen to true')
                            setCheckpointModalOpen(true)
                            console.log('[DreamJob] checkpointModalOpen should now be true')
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="px-8 py-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/50 rounded-lg text-cyan-400 font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 flex items-center gap-3 relative z-50 cursor-pointer"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <FileCheck className="w-6 h-6" />
                          Submit Checkpoint
                        </button>
                      )
                    }
                    
                    // Show loading button
                    if (loadingCheckpoints[moduleId] || (matchingUnlock?.checkpointId && !checkpoint)) {
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
                    
                    // Always show button, even if no checkpoint (disabled state)
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
              {checkpointModalOpen && selectedVideo && checkpoints[selectedVideo.moduleId] && (
                <div 
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" 
                  onClick={(e) => {
                    // Only close if clicking the backdrop, not the modal content
                    if (e.target === e.currentTarget) {
                      setCheckpointModalOpen(false)
                    }
                  }}
                >
                  <div className="bg-slate-900 rounded-xl border border-slate-700/50 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-[101]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                      <h3 className="text-xl font-bold text-white">Checkpoint Submission</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCheckpointModalOpen(false)
                        }}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="p-6">
                      <CheckpointSubmission
                        checkpointId={checkpoints[selectedVideo.moduleId].id}
                        checkpointTitle={checkpoints[selectedVideo.moduleId].title}
                        requirements={checkpoints[selectedVideo.moduleId].requirements}
                        sectionId={selectedVideo.moduleId.toString()}
                        onSuccess={async (status) => {
                          console.log('[DreamJob] Checkpoint submission callback triggered with status:', status)
                          
                          // If approved, immediately unlock next section
                          if (status === 'approved') {
                            console.log('[DreamJob] Checkpoint approved! Unlocking next section...')
                            
                            const currentModuleId = selectedVideo?.moduleId
                            if (currentModuleId) {
                              const nextModuleId = currentModuleId + 1
                              console.log(`[DreamJob] Marking module ${nextModuleId} as unlocked`)
                              
                              // Update LOCAL state immediately (guarantees re-render)
                              setUnlockedModules(prev => {
                                const newSet = new Set(prev)
                                newSet.add(nextModuleId)
                                return newSet
                              })
                              
                              // Also persist via API (backend already does this, but call context too)
                              markModuleUnlocked(nextModuleId)
                              
                              // Store for success modal
                              setUnlockedModuleId(nextModuleId)
                              
                              // Close checkpoint modal and show success
                              setCheckpointModalOpen(false)
                              setSuccessModalOpen(true)
                            }
                          } else if (status === 'needs_review') {
                            setCheckpointModalOpen(false)
                            alert('⏳ Checkpoint submitted! Under review, you\'ll be notified within 24 hours.')
                          } else {
                            console.log('[DreamJob] Checkpoint denied, keeping modal open for resubmission')
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Success Modal */}
              {successModalOpen && unlockedModuleId && (
                <div 
                  className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" 
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setSuccessModalOpen(false)
                    }
                  }}
                >
                  <div className="bg-slate-900 rounded-xl border border-slate-700/50 max-w-md w-full mx-4 relative z-[201]" onClick={(e) => e.stopPropagation()}>
                    <div className="p-8 text-center">
                      {/* Success Icon */}
                      <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center border-2 border-green-500/50">
                          <Check className="w-12 h-12 text-green-400" />
                        </div>
                      </div>
                      
                      {/* Title */}
                      <h2 className="text-2xl font-bold text-white mb-2">Checkpoint Complete!</h2>
                      
                      {/* Next Section Info */}
                      {(() => {
                        const nextModule = modulesList.find(m => m.id === unlockedModuleId)
                        return nextModule ? (
                          <p className="text-slate-300 mb-6">
                            You've unlocked: <span className="font-semibold text-cyan-400">{nextModule.title}</span>
                          </p>
                        ) : (
                          <p className="text-slate-300 mb-6">Next section unlocked!</p>
                        )
                      })()}
                      
                      {/* Continue Button */}
                      <button
                        onClick={() => {
                          console.log('[DreamJob] Continue to next section clicked, moduleId:', unlockedModuleId)
                          if (unlockedModuleId) {
                            const nextModule = modulesList.find(m => m.id === unlockedModuleId)
                            if (nextModule && nextModule.videos.length > 0) {
                              // Close the modal first
                              setSuccessModalOpen(false)
                              // Direct state update - we KNOW this module is unlocked (we just unlocked it)
                              // No need to go through handleVideoSelect which re-checks unlock status
                              setSelectedVideo({ moduleId: unlockedModuleId, video: nextModule.videos[0] })
                              setExpandedModule(unlockedModuleId)
                              // Trigger parent callback if exists
                              if (onVideoSelect) {
                                onVideoSelect(nextModule.videos[0], nextModule)
                              }
                            }
                          }
                        }}
                        className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg text-white font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
                      >
                        Continue to Next Section
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      {/* Close button */}
                      <button
                        onClick={() => setSuccessModalOpen(false)}
                        className="mt-4 text-slate-400 hover:text-white text-sm transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes/Attachments Section */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 mt-4">
                {(() => {
                  const videoNotes = getVideoNotes(selectedVideo.video)
                  const hasNotes = videoNotes && videoNotes.trim().length > 0
                  const isExpanded = notesExpanded[selectedVideo.video.id] || false
                  const shouldAutoExpand = hasNotes && videoNotes.length > 200
                  
                  return (
                    <>
                      <div className="flex items-center justify-between p-4">
                        <h3 className="text-sm font-semibold text-slate-300">Notes</h3>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <button
                              onClick={() => saveNotes(selectedVideo.video.id)}
                              disabled={savingNotes[selectedVideo.video.id]}
                              className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                                notesSaved[selectedVideo.video.id]
                                  ? 'bg-cyan-600 text-white'
                                  : savingNotes[selectedVideo.video.id]
                                  ? 'bg-cyan-800 text-white'
                                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                              }`}
                              title="Save notes"
                            >
                              {savingNotes[selectedVideo.video.id] ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Saving...
                                </>
                              ) : notesSaved[selectedVideo.video.id] ? (
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
                              onClick={() => setNotesExpanded(prev => ({ ...prev, [selectedVideo.video.id]: !isExpanded }))}
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
                      {/* Always show textarea for admins, show read-only for regular users when expanded */}
                      {(isAdmin || shouldAutoExpand || isExpanded || !hasNotes) && (
                        <div className="px-4 pb-4">
                          {isAdmin ? (
                            <textarea
                              value={videoNotes}
                              onChange={(e) => handleNotesChange(selectedVideo.video.id, e.target.value)}
                              placeholder="Add your notes, thoughts, or questions about this lesson..."
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
                              {videoNotes || <span className="text-slate-500 italic">No notes available</span>}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Show collapsed preview for regular users only when collapsed */}
                      {!isAdmin && hasNotes && !shouldAutoExpand && !isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="text-sm text-slate-400 line-clamp-2 p-3 border border-slate-700/50 rounded-lg bg-slate-800/30">
                            {videoNotes}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Course Materials Section */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 mt-4">
                <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-300">Course Materials</h4>
                  {isAdmin && (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleAddAttachment(selectedVideo.video.id, e.target.files)}
                        className="hidden"
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
                  {loadingAttachments[selectedVideo.video.id] ? (
                    <div className="text-sm text-slate-400 text-center py-4">Loading attachments...</div>
                  ) : getVideoAttachments(selectedVideo.video).length > 0 ? (
                    <div className="space-y-2">
                      {getVideoAttachments(selectedVideo.video).map((attachment) => (
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
                            <span className="text-sm text-slate-300">{attachment.display_name || attachment.file_name}</span>
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
                                onClick={() => handleRemoveAttachment(selectedVideo.video.id, attachment.id)}
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
          <div className="flex items-center justify-center min-h-[400px] p-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-slate-400">Select a video to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Chat Bot - floating in bottom right */}
      <AIChatBot userName={affiliate?.name || 'User'} />
    </div>
  )
}

