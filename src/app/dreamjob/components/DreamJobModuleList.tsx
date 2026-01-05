'use client'

import { useState, useEffect } from 'react'
import { Paperclip, X, Download, Save, Loader2, Check, Edit2, GripVertical } from 'lucide-react'
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
  onToggle,
  onEdit,
  onUpdateEditValues,
  onSaveEdit,
  onCancelEdit,
  onVideoSelect,
  onEditVideo
}: {
  module: Module
  isExpanded: boolean
  isAdmin: boolean
  editing: { type: 'module' | 'video', moduleId?: number, videoId?: string } | null
  editValues: any
  selectedVideo: { moduleId: number, video: Video } | null
  getVideoTitle: (video: Video) => string
  onToggle: (id: number) => void
  onEdit: (moduleId: number) => void
  onUpdateEditValues: (values: any) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onVideoSelect: (moduleId: number, video: Video) => void
  onEditVideo: (moduleId: number, video: Video) => void
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
      style={style}
      className="border-b-2 border-slate-700/50 last:border-b-0"
    >
      {/* Module Header */}
      <div className="w-full px-4 py-3 flex items-center gap-3 border-b border-slate-700/30 bg-slate-900/20">
        {editing?.type === 'module' && editing.moduleId === module.id ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editValues.title || module.title}
              onChange={(e) => onUpdateEditValues({ ...editValues, title: e.target.value })}
              className="flex-1 px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit()
                if (e.key === 'Escape') onCancelEdit()
              }}
            />
            <button
              onClick={onSaveEdit}
              className="p-1 text-cyan-400 hover:text-cyan-300"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1 text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {isAdmin && (
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}
            <button
              onClick={() => onToggle(module.id)}
              onDoubleClick={() => isAdmin && onEdit(module.id)}
              className="flex-1 flex items-center gap-3 text-left hover:bg-slate-800/50 transition-colors"
            >
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{module.title}</div>
                <div className="text-xs text-slate-400">{module.videos.length} lessons</div>
              </div>
            </button>
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(module.id)
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Module Lessons */}
      {isExpanded && (
        <div className="bg-slate-900/50 border-t border-slate-700/30">
          {module.videos.map((video, index) => {
            const isSelected = selectedVideo?.moduleId === module.id && selectedVideo?.video.id === video.id
            const displayTitle = getVideoTitle(video)
            const isLast = index === module.videos.length - 1
            return (
              <div
                key={video.id}
                className={`w-full px-4 py-2.5 pl-11 flex items-center gap-2 hover:bg-slate-800/50 transition-colors border-b border-slate-700/20 ${
                  isLast ? 'border-b-0' : ''
                } ${
                  isSelected ? 'bg-cyan-500/20 border-l-2 border-cyan-500' : ''
                }`}
              >
                {editing?.type === 'video' && editing.videoId === video.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editValues.title || displayTitle}
                      onChange={(e) => onUpdateEditValues({ ...editValues, title: e.target.value })}
                      className="flex-1 px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveEdit()
                        if (e.key === 'Escape') onCancelEdit()
                      }}
                    />
                    <input
                      type="text"
                      value={editValues.youtubeId || video.youtubeId || ''}
                      onChange={(e) => onUpdateEditValues({ ...editValues, youtubeId: e.target.value })}
                      className="flex-1 px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 text-xs"
                      placeholder="YouTube ID/URL"
                    />
                    <button
                      onClick={onSaveEdit}
                      className="p-1 text-cyan-400 hover:text-cyan-300"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onVideoSelect(module.id, video)}
                      onDoubleClick={() => isAdmin && onEditVideo(module.id, video)}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm text-slate-200">{index + 1}. {displayTitle}</div>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditVideo(module.id, video)
                        }}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DreamJobModuleList({ modules, affiliate, onVideoSelect }: DreamJobModuleListProps) {
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

  // Update modulesList when modules prop changes
  useEffect(() => {
    setModulesList(modules)
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

      const updateData: any = {}
      if (editing.type === 'module') {
        updateData.title = editValues.title
        updateData.description = editValues.description
      } else if (editing.type === 'video') {
        updateData.title = editValues.title
        if (editValues.youtubeId) updateData.youtubeId = extractYouTubeId(editValues.youtubeId)
      }

      // Save to database via API
      const res = await fetch('/api/admin/courses/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editing.type === 'module' ? 'section' : 'video', // API uses 'section' for modules
          sectionId: editing.moduleId,
          videoId: editing.videoId,
          updates: updateData
        })
      })

      if (res.ok) {
        // Reload page to reflect changes
        window.location.reload()
      } else {
        alert('Error saving changes')
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
        const res = await fetch('/api/admin/courses/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'module',
            courseType: 'dreamjob',
            items: newOrder.map((m, index) => ({ id: m.id, sortOrder: index }))
          })
        })

        if (!res.ok) {
          // Revert on error
          setModulesList(modules)
          alert('Error saving new order')
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
      <div className="w-80 bg-slate-800/30 rounded-xl border-2 border-slate-700/50 overflow-hidden flex flex-col max-h-[calc(100vh-200px)] sticky top-4">
        <div className="p-4 border-b-2 border-slate-700/50 shrink-0 bg-slate-900/30">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Course Modules</h3>
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
              {modulesList.map((module) => {
                const isExpanded = expandedModule === module.id
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
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Right Main Content - Video Player */}
      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50">
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
            <div className="p-6 space-y-6">
              {/* Editable Title */}
              <div>
                <h2 className="text-2xl font-bold text-white">{getVideoTitle(selectedVideo.video)}</h2>
              </div>

              {/* Notes/Attachments Section */}
              <div className="bg-slate-900/50 rounded-lg border border-slate-700/50">
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
    </div>
  )
}

