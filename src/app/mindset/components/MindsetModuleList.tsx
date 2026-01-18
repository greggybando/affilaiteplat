'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Edit2, Save, X, Download, Loader2, Check, GripVertical, FileCheck, Lock, CheckCircle } from 'lucide-react'
import { CheckpointSubmission } from '@/components/CheckpointSubmission'
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
  uuid?: string
  title: string
  loomId?: string
  youtubeId?: string
}

interface Module {
  id: number
  uuid?: string  // Section UUID for checkpoint linking
  number: number
  title: string
  description: string
  videos: Video[]
  categoryId?: string
  categoryTitle?: string
}

interface Category {
  id: string
  title: string
  sections: Module[]
  isStartHere?: boolean
}

interface Attachment {
  id: string
  name: string
  file: File
}

interface MindsetModuleListProps {
  modules: Module[]
  categories?: Category[]
  affiliate?: {
    role?: string
    [key: string]: any
  }
  onDataChange?: () => void
}

// Sortable Video Component
function SortableVideoItem({
  video,
  index,
  sectionId,
  isAdmin,
  isSelected,
  isLast,
  displayTitle,
  onVideoSelect,
  isLocked = false,
  hasCheckpoint = false
}: {
  video: Video
  index: number
  sectionId: number
  isAdmin: boolean
  isSelected: boolean
  isLast: boolean
  displayTitle: string
  onVideoSelect: (moduleId: number, video: Video) => void
  isLocked?: boolean
  hasCheckpoint?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `video-${sectionId}-${video.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (isLocked ? 0.5 : 1),
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: 'rgba(34,211,238,0.05)',
        background: isLocked 
          ? 'rgba(15,15,18,0.4)'
          : isSelected 
            ? 'rgba(25,25,30,0.5)'
            : 'rgba(20,20,25,0.3)',
        borderLeft: isSelected ? '2px solid rgba(34,211,238,0.4)' : '2px solid transparent',
        boxShadow: isSelected ? 'inset 0 0 15px rgba(34,211,238,0.08)' : 'none'
      }}
      className="w-full px-4 py-1.5 pl-12 flex items-center gap-2.5 transition-all border-b last:border-b-0"
      onMouseEnter={(e) => {
        if (!isSelected && !isLocked) {
          e.currentTarget.style.background = 'rgba(25,25,30,0.4)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !isLocked) {
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
        onClick={() => !isLocked && onVideoSelect(sectionId, video)}
        className={`flex-1 text-left ${isLocked ? 'cursor-not-allowed' : ''}`}
        disabled={isLocked}
      >
        <div className="text-xs leading-relaxed flex items-center gap-2" style={{
          color: isLocked 
            ? 'rgba(100,100,105,0.6)' 
            : isSelected 
              ? 'rgba(34,211,238,0.9)' 
              : 'rgba(170,170,175,0.85)',
          textShadow: isSelected && !isLocked ? '0 0 6px rgba(34,211,238,0.2)' : 'none',
          fontWeight: isSelected ? 500 : 400
        }}>
          {isLocked && (
            <Lock className="w-3 h-3" style={{ color: 'rgba(100,100,105,0.6)' }} />
          )}
          <span style={{ 
            color: isLocked ? 'rgba(80,80,85,0.5)' : 'rgba(110,110,115,0.5)',
            marginRight: '8px',
            fontSize: '10px',
            fontVariantNumeric: 'tabular-nums'
          }}>{index + 1}.</span>
          {displayTitle}
          {hasCheckpoint && !isLocked && (
            <span title="Has checkpoint">
              <FileCheck className="w-3 h-3 ml-1" style={{ color: 'rgba(168,85,247,0.7)' }} />
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

// Sortable Video List Component
function SortableVideoList({
  videos,
  sectionId,
  categoryId,
  isAdmin,
  selectedVideo,
  getVideoTitle,
  onVideoSelect,
  onVideosUpdate,
  section,
  isVideoUnlocked,
  getVideoCheckpoint
}: {
  videos: Video[]
  sectionId: number
  categoryId?: string
  isAdmin: boolean
  selectedVideo: { moduleId: number, video: Video } | null
  getVideoTitle: (video: Video) => string
  onVideoSelect: (moduleId: number, video: Video) => void
  onVideosUpdate?: (categoryId: string, sectionId: number, newVideos: Video[]) => void
  section?: Module
  isVideoUnlocked?: (section: Module, video: Video, videoIndex: number) => boolean
  getVideoCheckpoint?: (videoId: string) => any
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

    const oldIndex = videosList.findIndex(v => `video-${sectionId}-${v.id}` === active.id)
    const newIndex = videosList.findIndex(v => `video-${sectionId}-${v.id}` === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newVideos = arrayMove(videosList, oldIndex, newIndex)
      setVideosList(newVideos)
      
      // Update parent section's videos array immediately
      if (onVideosUpdate && categoryId) {
        onVideosUpdate(categoryId, sectionId, newVideos)
      }

      // Save new order to API (autosave without page reload)
      try {
        const res = await fetch('/api/courses/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'video',
            courseType: 'mindset',
            categoryId: categoryId,
            sectionId: sectionId,
            items: newVideos.map((video, index) => ({
              id: video.id,
              sortOrder: index
            }))
          })
        })
        
        if (!res.ok) {
          // Revert on error
          setVideosList(videos)
          if (onVideosUpdate && categoryId) {
            onVideosUpdate(categoryId, sectionId, videos)
          }
          alert('Error saving video order')
        }
        // Success - state already updated, changes are live immediately
      } catch (error) {
        console.error('Error reordering videos:', error)
        // Revert on error
        setVideosList(videos)
        if (onVideosUpdate && categoryId) {
          onVideosUpdate(categoryId, sectionId, videos)
        }
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
          items={videosList.map(v => `video-${sectionId}-${v.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {videosList.map((video, index) => {
            const isSelected = selectedVideo?.moduleId === sectionId && selectedVideo?.video.id === video.id
            const displayTitle = getVideoTitle(video)
            const isLast = index === videosList.length - 1
            // Check if video is locked (only if section and functions are provided)
            const isLocked = section && isVideoUnlocked && !isAdmin
              ? !isVideoUnlocked(section, video, index)
              : false
            const hasCheckpoint = getVideoCheckpoint ? !!getVideoCheckpoint(video.id) : false
            return (
              <SortableVideoItem
                key={video.id}
                video={video}
                index={index}
                sectionId={sectionId}
                isAdmin={isAdmin}
                isSelected={isSelected}
                isLast={isLast}
                displayTitle={displayTitle}
                onVideoSelect={onVideoSelect}
                isLocked={isLocked}
                hasCheckpoint={hasCheckpoint}
              />
            )
          })}
        </SortableContext>
      </DndContext>
    </div>
  )
}

// Sortable Section List Component
function SortableSectionList({
  sections,
  categoryId,
  isAdmin,
  editing,
  expandedSections,
  selectedVideo,
  getVideoTitle,
  onToggleSection,
  onEdit,
  onVideoSelect,
  onEditVideo,
  onSectionDragEnd,
  onVideosUpdate,
  checkpoints,
  isModuleUnlocked,
  isVideoUnlocked,
  getVideoCheckpoint
}: {
  sections: Module[]
  categoryId: string
  isAdmin: boolean
  editing: { type: 'category' | 'section' | 'video', categoryId?: string, sectionId?: number, videoId?: string } | null
  expandedSections: Set<number>
  selectedVideo: { moduleId: number, video: Video } | null
  getVideoTitle: (video: Video) => string
  onToggleSection: (id: number) => void
  onEdit: (type: 'category' | 'section' | 'video', categoryId?: string, sectionId?: number, videoId?: string) => void
  onVideoSelect: (moduleId: number, video: Video) => void
  onEditVideo: (categoryId: string, sectionId: number, video: Video) => void
  onSectionDragEnd: (event: DragEndEvent, categoryId: string) => void
  sectionsList: Record<string, Module[]>
  onVideosUpdate?: (categoryId: string, sectionId: number, newVideos: Video[]) => void
  checkpoints: Record<number, any>
  isModuleUnlocked: (moduleId: number) => boolean
  isVideoUnlocked?: (section: Module, video: Video, videoIndex: number) => boolean
  getVideoCheckpoint?: (videoId: string) => any
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <div className="bg-slate-900/30">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => onSectionDragEnd(e, categoryId)}
      >
        <SortableContext
          items={sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => {
            const isSectionExpanded = expandedSections.has(section.id)
            const isLocked = !isModuleUnlocked(section.id)
            
            return (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    categoryId={categoryId}
                    isAdmin={isAdmin}
                    isSectionExpanded={isSectionExpanded}
                    editing={editing}
                    expandedSections={expandedSections}
                    selectedVideo={selectedVideo}
                    getVideoTitle={getVideoTitle}
                    onToggleSection={onToggleSection}
                    onEdit={onEdit}
                    onVideoSelect={onVideoSelect}
                    onEditVideo={onEditVideo}
                    onVideosUpdate={onVideosUpdate}
                    checkpoint={checkpoints[section.id]}
                    isLocked={isLocked}
                    isVideoUnlocked={isVideoUnlocked}
                    getVideoCheckpoint={getVideoCheckpoint}
                  />
            )
          })}
        </SortableContext>
      </DndContext>
    </div>
  )
}

// Sortable Section Component
function SortableSectionItem({
  section,
  categoryId,
  isAdmin,
  isSectionExpanded,
  editing,
  expandedSections,
  selectedVideo,
  getVideoTitle,
  onToggleSection,
  onEdit,
  onVideoSelect,
  onEditVideo,
  onVideosUpdate,
  checkpoint,
  isLocked,
  isVideoUnlocked,
  getVideoCheckpoint
}: {
  section: Module
  categoryId: string
  isAdmin: boolean
  isSectionExpanded: boolean
  editing: { type: 'category' | 'section' | 'video', categoryId?: string, sectionId?: number, videoId?: string } | null
  expandedSections: Set<number>
  selectedVideo: { moduleId: number, video: Video } | null
  getVideoTitle: (video: Video) => string
  onToggleSection: (id: number) => void
  onEdit: (type: 'category' | 'section' | 'video', categoryId?: string, sectionId?: number, videoId?: string) => void
  onVideoSelect: (moduleId: number, video: Video) => void
  onEditVideo: (categoryId: string, sectionId: number, video: Video) => void
  onVideosUpdate?: (categoryId: string, sectionId: number, newVideos: Video[]) => void
  checkpoint?: any
  isLocked?: boolean
  isVideoUnlocked?: (section: Module, video: Video, videoIndex: number) => boolean
  getVideoCheckpoint?: (videoId: string) => any
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

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
        borderColor: 'rgba(34,211,238,0.1)'
      }}
      className="border-b last:border-b-0"
    >
      {/* Section Header */}
      <div className={`w-full px-4 py-2 pl-8 flex items-center gap-2.5 ${isLocked && !isAdmin ? 'opacity-50' : ''}`} style={{
        background: 'rgba(20,20,25,0.5)',
        position: 'relative'
      }}>
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{
          background: isLocked && !isAdmin 
            ? 'linear-gradient(to bottom, rgba(100,100,100,0.4), rgba(80,80,80,0.5), rgba(100,100,100,0.4))'
            : 'linear-gradient(to bottom, rgba(34,211,238,0.6), rgba(6,182,212,0.7), rgba(34,211,238,0.6))',
          boxShadow: isLocked && !isAdmin ? 'none' : '0 0 6px rgba(34,211,238,0.4), 0 0 12px rgba(34,211,238,0.2)',
          opacity: 0.8
        }} />
        {isAdmin && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1"
            style={{ color: 'rgba(100,100,105,0.3)' }}
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        {/* Lock icon for locked sections */}
        {isLocked && !isAdmin && (
          <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
        )}
        <button
          type="button"
          onClick={() => {
            if (isLocked && !isAdmin) {
              // Show locked message
              return
            }
            onToggleSection(section.id)
          }}
          onDoubleClick={() => isAdmin && !editing && onEdit('section', categoryId, section.id)}
          className={`flex-1 flex items-center gap-2.5 text-left transition-all ${isLocked && !isAdmin ? 'cursor-not-allowed' : ''}`}
          style={{ paddingLeft: '2px' }}
        >
          <svg
            className="transition-transform duration-200"
            style={{
              width: '9px',
              height: '9px',
              color: isLocked && !isAdmin ? 'rgba(100,100,100,0.4)' : 'rgba(34,211,238,0.4)',
              transform: isSectionExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{
              color: isLocked && !isAdmin ? 'rgba(100,100,100,0.7)' : 'rgba(34,211,238,0.9)',
              textShadow: isLocked && !isAdmin ? 'none' : '0 0 8px rgba(34,211,238,0.4), 0 0 15px rgba(34,211,238,0.2)',
              letterSpacing: '0.01em',
              fontWeight: 500
            }}>
              {section.title}
              {isLocked && !isAdmin && <span className="ml-2 text-slate-500">(Locked)</span>}
            </div>
            <div className="text-[10px] mt-0.5" style={{
              color: 'rgba(130,130,135,0.6)'
            }}>{section.videos.length} lessons</div>
          </div>
        </button>
      </div>

      {/* Section Videos - hidden when locked (non-admin) */}
      {isSectionExpanded && (!isLocked || isAdmin) && (
        <>
          <SortableVideoList
            videos={section.videos}
            sectionId={section.id}
            categoryId={categoryId}
            isAdmin={isAdmin}
            selectedVideo={selectedVideo}
            getVideoTitle={getVideoTitle}
            onVideoSelect={onVideoSelect}
            onVideosUpdate={onVideosUpdate}
            section={section}
            isVideoUnlocked={isVideoUnlocked}
            getVideoCheckpoint={getVideoCheckpoint}
          />
        </>
      )}
      {/* Locked message */}
      {isSectionExpanded && isLocked && !isAdmin && (
        <div className="px-8 py-4 text-slate-500 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Complete the previous section's checkpoint to unlock this content.
        </div>
      )}
    </div>
  )
}

// Sortable Category Component
function SortableCategoryItem({ 
  category,
  isCategoryExpanded,
  isAdmin,
  editing,
  editValues,
  expandedSections,
  selectedVideo,
  getVideoTitle,
  onToggleCategory,
  onToggleSection,
  onEdit,
  onUpdateEditValues,
  onSaveEdit,
  onCancelEdit,
  onVideoSelect,
  onEditVideo,
  onSectionDragEnd,
  sectionsList,
  onVideosUpdate,
  checkpoints,
  isModuleUnlocked,
  isVideoUnlocked,
  getVideoCheckpoint
}: {
  category: Category
  isCategoryExpanded: boolean
  isAdmin: boolean
  editing: { type: 'category' | 'section' | 'video', categoryId?: string, sectionId?: number, videoId?: string } | null
  editValues: any
  expandedSections: Set<number>
  selectedVideo: { moduleId: number, video: Video } | null
  getVideoTitle: (video: Video) => string
  onToggleCategory: (id: string) => void
  onToggleSection: (id: number) => void
  onEdit: (type: 'category' | 'section' | 'video', categoryId?: string, sectionId?: number, videoId?: string) => void
  onUpdateEditValues: (values: any) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onVideoSelect: (moduleId: number, video: Video) => void
  onEditVideo: (categoryId: string, sectionId: number, video: Video) => void
  onSectionDragEnd: (event: DragEndEvent, categoryId: string) => void
  sectionsList: Record<string, Module[]>
  onVideosUpdate: (categoryId: string, sectionId: number, newVideos: Video[]) => void
  checkpoints: Record<number, any>
  isModuleUnlocked: (moduleId: number) => boolean
  isVideoUnlocked?: (section: Module, video: Video, videoIndex: number) => boolean
  getVideoCheckpoint?: (videoId: string) => any
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

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
      {/* Category Header */}
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
          onClick={() => onToggleCategory(category.id)}
          className="flex-1 flex items-center gap-2.5 text-left transition-all"
          style={{ 
            paddingLeft: '2px'
          }}
        >
          <svg
            className="transition-transform duration-200"
            style={{
              width: '10px',
              height: '10px',
              color: 'rgba(34,211,238,0.5)',
              transform: isCategoryExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{
              color: 'rgba(220,220,225,0.95)',
              textShadow: '0 0 12px rgba(34,211,238,0.5), 0 0 20px rgba(34,211,238,0.3), 0 0 30px rgba(34,211,238,0.2)',
              letterSpacing: '0.08em',
              fontWeight: 600
            }}>
              {category.title}
            </div>
          </div>
        </button>
      </div>

      {/* Category Sections */}
      {isCategoryExpanded && (
        <SortableSectionList
          sections={sectionsList[category.id] || category.sections}
          categoryId={category.id}
          isAdmin={isAdmin}
          editing={editing}
          expandedSections={expandedSections}
          selectedVideo={selectedVideo}
          getVideoTitle={getVideoTitle}
          onToggleSection={onToggleSection}
          onEdit={onEdit}
          onVideoSelect={onVideoSelect}
          onEditVideo={onEditVideo}
          onSectionDragEnd={onSectionDragEnd}
          sectionsList={sectionsList}
          onVideosUpdate={onVideosUpdate}
          checkpoints={checkpoints}
          isModuleUnlocked={isModuleUnlocked}
          isVideoUnlocked={isVideoUnlocked}
          getVideoCheckpoint={getVideoCheckpoint}
        />
      )}
    </div>
  )
}

export function MindsetModuleList({ modules, categories, affiliate, onDataChange }: MindsetModuleListProps) {
  const isAdmin = affiliate?.role === 'admin' || affiliate?.role === 'moderator'
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['starthere', 'mindset', 'lifedesign', 'thinkingtools']))
  const getInitialExpandedSections = () => {
    if (categories && categories.length > 0) {
      return new Set(categories.map(cat => cat.sections[0]?.id).filter(Boolean) as number[])
    }
    return new Set(modules.map(m => m.id).slice(0, 3))
  }
  const [expandedSections, setExpandedSections] = useState<Set<number>>(getInitialExpandedSections())
  const [selectedVideo, setSelectedVideo] = useState<{ moduleId: number, video: Video } | null>(
    categories?.[0]?.sections[0]?.videos[0] ? { moduleId: categories[0].sections[0].id, video: categories[0].sections[0].videos[0] } :
    modules[0]?.videos[0] ? { moduleId: modules[0].id, video: modules[0].videos[0] } : null
  )
  
  // Ensure selected video always exists in the current DB-backed structure.
  // When course structure loads/reorders, the previously selected video can become stale
  // (e.g. fallback IDs vs DB IDs), which breaks checkpoint lookup and button state.
  useEffect(() => {
    if (!categories || categories.length === 0) return

    const flatSections = categories.flatMap(cat => cat.sections)
    const startHereCategory = categories.find(cat => cat.isStartHere)

    // Always keep Start Here expanded if present
    if (startHereCategory?.sections?.[0]) {
      setExpandedSections(prev => {
        const newSet = new Set(prev)
        newSet.add(startHereCategory.sections[0].id)
        return newSet
      })
    }

    const isSelectedValid = !!selectedVideo && flatSections.some(sec =>
      sec.id === selectedVideo.moduleId && sec.videos.some(v => v.id === selectedVideo.video.id)
    )

    if (isSelectedValid) return

    // Pick a deterministic, valid default selection
    const fallbackSection =
      (startHereCategory?.sections?.[0] && startHereCategory.sections[0]) ||
      flatSections.find(s => s.videos && s.videos.length > 0) ||
      null

    const fallbackVideo = fallbackSection?.videos?.[0] || null
    if (fallbackSection && fallbackVideo) {
      setSelectedVideo({ moduleId: fallbackSection.id, video: fallbackVideo })
    }
  }, [categories, selectedVideo])
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [notesSaved, setNotesSaved] = useState<Record<string, boolean>>({})
  const [attachments, setAttachments] = useState<Record<string, any[]>>({})
  const [loadingAttachments, setLoadingAttachments] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<{ type: 'category' | 'section' | 'video', categoryId?: string, sectionId?: number, videoId?: string } | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [categoriesList, setCategoriesList] = useState<Category[]>(categories || [])
  const [sectionsList, setSectionsList] = useState<Record<string, Module[]>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const [checkpoints, setCheckpoints] = useState<Record<number, any>>({}) // sectionId -> checkpoint
  const [unlockStatus, setUnlockStatus] = useState<Record<string, { unlocked: boolean; checkpointStatus?: string; checkpointId?: string }>>({}) // sectionId -> unlock status
  const [unlockDataState, setUnlockDataState] = useState<any>(null) // Store full unlock data
  const [loadingCheckpoints, setLoadingCheckpoints] = useState<Record<number, boolean>>({}) // Track which checkpoints are loading
  const [checkpointModalOpen, setCheckpointModalOpen] = useState(false) // Modal state
  const [successModalOpen, setSuccessModalOpen] = useState(false) // Success modal
  const [unlockedSectionId, setUnlockedSectionId] = useState<number | null>(null) // Recently unlocked section
  const [successNextVideo, setSuccessNextVideo] = useState<{ sectionId: number, video: Video } | null>(null) // For video-level unlocks
  // Dynamic unlock state - fetched from API
  const [unlockedModules, setUnlockedModules] = useState<Set<number>>(new Set([1]))
  const [defaultUnlockedIds, setDefaultUnlockedIds] = useState<number[]>([1])
  // Video-level locking state
  const [videoCheckpoints, setVideoCheckpoints] = useState<Record<string, any>>({}) // videoId -> checkpoint
  const [sectionsWithVideoLocking, setSectionsWithVideoLocking] = useState<Set<string>>(new Set()) // section UUIDs that use video locking
  const [unlockedVideos, setUnlockedVideos] = useState<Set<string>>(new Set()) // video IDs that are unlocked

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update lists when props change
  // Always use the order from the database (which reflects saved drag order)
  useEffect(() => {
    if (categories && categories.length > 0) {
      // Always update from props to reflect database order
      // This ensures real-time updates when another admin changes the order
      setCategoriesList(categories)
      const sectionsMap: Record<string, Module[]> = {}
      categories.forEach(cat => {
        sectionsMap[cat.id] = cat.sections
      })
      setSectionsList(sectionsMap)
      setIsInitialized(true)
    }
  }, [categories])

  // Fetch dynamic unlocks from API
  useEffect(() => {
    const fetchDynamicUnlocks = async () => {
      try {
        // Fetch course config to get default unlocked modules
        const configRes = await fetch('/api/courses/config?course=mindset')
        const configData = await configRes.json()
        console.log('[Mindset] Course config:', configData)
        
        if (configData.defaultUnlockedModuleIds) {
          setDefaultUnlockedIds(configData.defaultUnlockedModuleIds)
        }
        
        // Fetch user's unlocked modules
        const unlocksRes = await fetch('/api/user/module-unlocks?course=mindset')
        const unlocksData = await unlocksRes.json()
        console.log('[Mindset] User unlocks:', unlocksData)
        
        if (unlocksData.unlockedModules && Array.isArray(unlocksData.unlockedModules)) {
          setUnlockedModules(new Set(unlocksData.unlockedModules))
        }
        
        // Fetch user's unlocked videos
        const videoUnlocksRes = await fetch('/api/user/video-unlocks?course=mindset')
        const videoUnlocksData = await videoUnlocksRes.json()
        console.log('[Mindset] User video unlocks:', videoUnlocksData)
        
        if (videoUnlocksData.unlockedVideos && Array.isArray(videoUnlocksData.unlockedVideos)) {
          setUnlockedVideos(new Set(videoUnlocksData.unlockedVideos))
        }
      } catch (err) {
        console.error('[Mindset] Error fetching config/unlocks:', err)
      }
    }
    fetchDynamicUnlocks()
  }, [])

  // Check if a module is unlocked
  const isModuleUnlocked = (moduleId: number) => {
    if (defaultUnlockedIds.includes(moduleId)) return true
    if (unlockedModules.has(moduleId)) return true
    return false
  }

  // Check if a section uses video-level locking
  const sectionHasVideoLocking = (section: Module) => {
    // Check if section UUID is in the video locking set
    if (section.uuid && sectionsWithVideoLocking.has(section.uuid)) {
      return true
    }
    // Also check by checking if any video in this section has a checkpoint
    return section.videos.some(v => (v.uuid ? videoCheckpoints[v.uuid] : null) || videoCheckpoints[v.id])
  }

  // Check if a video is unlocked (for sections with video-level locking)
  const isVideoUnlocked = (section: Module, video: Video, videoIndex: number) => {
    // If section doesn't use video-level locking, video is unlocked if section is unlocked
    if (!sectionHasVideoLocking(section)) {
      return isModuleUnlocked(section.id)
    }

    // For video-level locking:
    // First video in section is always unlocked (if section is unlocked)
    if (videoIndex === 0) {
      return isModuleUnlocked(section.id)
    }

    // STRICT RULE:
    // A video checkpoint unlocks ONLY the immediate next video.
    // Therefore: a video is unlocked only if it is explicitly present in `unlockedVideos`.
    const unlockKey = video.uuid || video.id
    if (unlockedVideos.has(unlockKey)) {
      return true
    }

    return false
  }

  // Get the checkpoint for a specific video (if any)
  const getVideoCheckpoint = (videoId: string) => {
    return videoCheckpoints[videoId] || null
  }

  // Fetch checkpoints and unlock status for all sections
  useEffect(() => {
    const fetchCheckpointsAndUnlocks = async () => {
      try {
        // Fetch unlock status for all sections in the mindset course
        const unlockRes = await fetch('/api/user/unlocks?courseType=mindset')
        const unlockData = await unlockRes.json()
        
        if (unlockData.sections) {
          const unlockMap: Record<string, { unlocked: boolean; checkpointStatus?: string; checkpointId?: string; numericId?: number }> = {}
          
          // Create a mapping from UUID to unlock status
          // We also need to map UUIDs to numeric section IDs
          unlockData.sections.forEach((section: any) => {
            unlockMap[section.id] = {
              unlocked: section.unlocked,
              checkpointStatus: section.checkpointStatus,
              checkpointId: section.checkpointId,
              numericId: section.displayOrder // Use displayOrder as a proxy for numeric ID
            }
          })
          setUnlockStatus(unlockMap)
          
          // Also create reverse mapping: numeric ID -> UUID for easier lookup
          // We'll fetch section details to get the mapping
          const sectionMapping: Record<number, string> = {}
          unlockData.sections.forEach((section: any) => {
            // We need to match by displayOrder or title to find numeric ID
            const matchingSection = categoriesList
              .flatMap(cat => cat.sections)
              .find(s => {
                // Try to match by title or order
                return s.title === section.title || 
                       (categoriesList.find(cat => 
                         cat.sections.find(sec => sec.title === section.title)
                       )?.sections.findIndex(sec => sec.title === section.title) === section.displayOrder)
              })
            if (matchingSection) {
              sectionMapping[matchingSection.id] = section.id
            }
          })
          
          // Store mapping for later use
          ;(window as any).sectionUUIDMap = sectionMapping
        }

        // Get all sections from categories
        const allSections = categoriesList.flatMap(cat => cat.sections)
        console.log('[Checkpoint Fetch] All sections:', allSections.map((s: any) => ({ id: s.id, uuid: s.uuid, title: s.title })))
        
        const checkpointMap: Record<number, any> = {}
        // Also store by title for fallback lookup
        const checkpointByTitle: Record<string, any> = {}
        
        // Fetch all checkpoints from public API.
        // Single source: /api/checkpoints/by-course returns checkpoints across ALL categories for a course type.
        try {
          const checkpointRes = await fetch('/api/checkpoints/by-course?course=mindset', {
            credentials: 'include'
          })
          console.log('[Checkpoint Fetch] API status:', checkpointRes.status)

          if (!checkpointRes.ok) {
            console.error('[Checkpoint Fetch] Failed:', checkpointRes.status)
          } else {
            const checkpointData = await checkpointRes.json()
            console.log('[Checkpoint Fetch] Full API response:', JSON.stringify(checkpointData, null, 2))

            const {
              byUUID,
              byNumericId,
              byTitle,
              videoCheckpoints: videoCheckpointsData,
              videoCheckpointsByDisplayId,
              sectionsWithVideoLocking: videoLockingSections
            } = checkpointData

            // Store byTitle for later use
            if (byTitle) {
              Object.assign(checkpointByTitle, byTitle)
            }

            // Store video-level checkpoint data
            const combinedVideo = {
              ...(videoCheckpointsData || {}),
              ...(videoCheckpointsByDisplayId || {})
            }
            setVideoCheckpoints(combinedVideo)
            console.log('[Checkpoint Fetch] Video checkpoints:', Object.keys(combinedVideo).length)

            // Store sections that use video-level locking
            if (videoLockingSections && Array.isArray(videoLockingSections)) {
              setSectionsWithVideoLocking(new Set(videoLockingSections))
              console.log('[Checkpoint Fetch] Sections with video locking:', videoLockingSections)
            }

            // Map checkpoints to UI section IDs
            allSections.forEach((section: any) => {
              const sectionId = section.id
              const sectionTitle = section.title
              const sectionUUID = section.uuid

              console.log(`[Checkpoint Fetch] Checking section: id=${sectionId}, title="${sectionTitle}", uuid=${sectionUUID}`)

              // Method 1: By UUID
              if (sectionUUID && byUUID && byUUID[sectionUUID]) {
                checkpointMap[sectionId] = byUUID[sectionUUID]
                console.log(`[Checkpoint Fetch] ✓ Found by UUID for "${sectionTitle}"`)
                return
              }

              // Method 2: By numeric ID
              if (byNumericId && byNumericId[sectionId]) {
                checkpointMap[sectionId] = byNumericId[sectionId]
                console.log(`[Checkpoint Fetch] ✓ Found by numeric ID for "${sectionTitle}"`)
                return
              }

              // Method 3: By title (most reliable fallback)
              if (sectionTitle && byTitle && byTitle[sectionTitle]) {
                checkpointMap[sectionId] = byTitle[sectionTitle]
                console.log(`[Checkpoint Fetch] ✓ Found by title for "${sectionTitle}"`)
                return
              }

              console.log(`[Checkpoint Fetch] ✗ No checkpoint found for "${sectionTitle}"`)
            })

            console.log('[Checkpoint Fetch] MAPPED COUNT:', Object.keys(checkpointMap).length)
            console.log('[Checkpoint Fetch] MAPPED SECTIONS:', Object.keys(checkpointMap))
          }
        } catch (error) {
          console.error('[Checkpoint Fetch] Exception:', error)
        }
        
        // Store checkpointByTitle globally for button lookup
        ;(window as any).checkpointByTitle = checkpointByTitle
        
        console.log('[Checkpoint Fetch] Setting checkpoints state:', checkpointMap)
        setCheckpoints(checkpointMap)
      } catch (error) {
        console.error('Error fetching checkpoints and unlocks:', error)
      }
    }
    if (categoriesList.length > 0) {
      fetchCheckpointsAndUnlocks()
    }
  }, [categoriesList])

  // Fetch checkpoint for currently selected section if not already loaded
  useEffect(() => {
    if (!selectedVideo) return
    
    const sectionId = selectedVideo.moduleId
    const currentCheckpoint = checkpoints[sectionId]
    const hasCheckpoint = currentCheckpoint && currentCheckpoint.id && currentCheckpoint.title && currentCheckpoint.requirements
    const isLoading = loadingCheckpoints[sectionId]
    
    // If we already have full checkpoint data, skip
    if (hasCheckpoint) {
      console.log('[Checkpoint Fetch Effect] Already have checkpoint for section:', sectionId)
      return
    }
    
    // If already loading, skip
    if (isLoading) {
      console.log('[Checkpoint Fetch Effect] Already loading checkpoint for section:', sectionId)
      return
    }
    
    console.log('[Checkpoint Fetch Effect] Fetching for section:', sectionId)
    
    const section = categoriesList
      .flatMap(cat => cat.sections)
      .find(s => s.id === sectionId)
    
    if (!section) {
      console.log('[Checkpoint Fetch Effect] Section not found')
      return
    }
    
    // Try multiple methods to find checkpoint
    const fetchCheckpoint = async () => {
      setLoadingCheckpoints(prev => ({ ...prev, [sectionId]: true }))
      
      try {
        // Method 1: Check unlock status for checkpoint ID (MOST RELIABLE)
        if (unlockDataState?.sections) {
          const matchingUnlock = unlockDataState.sections.find((s: any) => 
            s.section_id === sectionId || s.title === section.title || s.id === sectionId
          )
          
          console.log('[Checkpoint Fetch Effect] Matching unlock section:', matchingUnlock)
          
          if (matchingUnlock?.checkpointId) {
            console.log('[Checkpoint Fetch Effect] ✅ Found checkpoint ID in unlock status:', matchingUnlock.checkpointId)
            
            // Try direct fetch by checkpoint ID (this is the most reliable method)
            const res = await fetch(`/api/checkpoints/${matchingUnlock.checkpointId}`)
            const data = await res.json()
            
            console.log('[Checkpoint Fetch Effect] Checkpoint fetch response:', data)
            
            if (data.checkpoint && data.checkpoint.id && data.checkpoint.title && data.checkpoint.requirements) {
              console.log('[Checkpoint Fetch Effect] ✅ Successfully fetched checkpoint:', data.checkpoint)
              setCheckpoints(prev => ({ ...prev, [sectionId]: data.checkpoint }))
              setLoadingCheckpoints(prev => ({ ...prev, [sectionId]: false }))
              return
            } else {
              console.warn('[Checkpoint Fetch Effect] Checkpoint data incomplete:', data.checkpoint)
            }
          } else {
            console.log('[Checkpoint Fetch Effect] No checkpointId in unlock status for section:', section.title)
          }
        }
        
        // Method 2: Try fetching by numeric section ID
        console.log('[Checkpoint Fetch Effect] Trying to fetch by section ID:', sectionId)
        const res2 = await fetch(`/api/checkpoints/${sectionId}`)
        const data2 = await res2.json()
        
        if (data2.checkpoint && data2.checkpoint.id && data2.checkpoint.title && data2.checkpoint.requirements) {
          console.log('[Checkpoint Fetch Effect] Successfully fetched checkpoint by section ID:', data2.checkpoint)
          setCheckpoints(prev => ({ ...prev, [sectionId]: data2.checkpoint }))
          setLoadingCheckpoints(prev => ({ ...prev, [sectionId]: false }))
          return
        }
        
        // Method 3: Try admin API and match by section title
        console.log('[Checkpoint Fetch Effect] Trying admin API')
        const res3 = await fetch(`/api/checkpoints/admin`)
        const data3 = await res3.json()
        
        if (data3.courses) {
          // Find checkpoint by matching section title
          for (const course of data3.courses) {
            if (course.sections) {
              for (const sec of course.sections) {
                if (sec.checkpoint && sec.title === section.title) {
                  console.log('[Checkpoint Fetch Effect] Found checkpoint by title match:', sec.checkpoint)
                  setCheckpoints(prev => ({ ...prev, [sectionId]: sec.checkpoint }))
                  setLoadingCheckpoints(prev => ({ ...prev, [sectionId]: false }))
                  return
                }
              }
            }
          }
          
          // Also try by section UUID from unlock data
          const matchingUnlock = unlockDataState?.sections?.find((s: any) => 
            s.title === section.title
          )
          
          if (matchingUnlock?.id) {
            const sectionUUID = matchingUnlock.id
            const res4 = await fetch(`/api/checkpoints/${sectionUUID}`)
            const data4 = await res4.json()
            
            if (data4.checkpoint) {
              console.log('[Checkpoint Fetch Effect] Found checkpoint by UUID:', data4.checkpoint)
              setCheckpoints(prev => ({ ...prev, [sectionId]: data4.checkpoint }))
              setLoadingCheckpoints(prev => ({ ...prev, [sectionId]: false }))
              return
            }
          }
        }
        
        console.log('[Checkpoint Fetch Effect] No checkpoint found')
        setLoadingCheckpoints(prev => ({ ...prev, [sectionId]: false }))
      } catch (error) {
        console.error('[Checkpoint Fetch Effect] Error:', error)
        setLoadingCheckpoints(prev => ({ ...prev, [sectionId]: false }))
      }
    }
    
    fetchCheckpoint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo?.moduleId, unlockDataState, categoriesList.length])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const handleVideoSelect = (moduleId: number, video: Video) => {
    // Check if module is unlocked (admins can bypass)
    if (!isModuleUnlocked(moduleId) && !isAdmin) {
      console.log('[Mindset] Cannot select video - module is locked:', moduleId)
      return
    }
    // If this section uses video-level locking, also enforce per-video lock
    if (!isAdmin) {
      const section = categoriesList.flatMap(cat => cat.sections).find(s => s.id === moduleId)
      if (section && sectionHasVideoLocking(section)) {
        const videoIndex = section.videos.findIndex(v => v.id === video.id)
        if (videoIndex >= 0 && !isVideoUnlocked(section, video, videoIndex)) {
          console.log('[Mindset] Cannot select video - video is locked:', { moduleId, videoId: video.id })
          return
        }
      }
    }
    // Immediately update state to make switch feel instant
    setSelectedVideo({ moduleId, video })
  }

  const handleSaveEdit = async () => {
    if (!editing) return

    try {
      // Extract YouTube/Loom IDs from URLs if provided
      const extractYouTubeId = (url: string) => {
        if (!url) return ''
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0].split('&')[0]
        if (url.includes('youtube.com/watch?v=')) return url.split('youtube.com/watch?v=')[1].split('&')[0]
        if (url.includes('youtube.com/embed/')) return url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0]
        return url
      }

      const extractLoomId = (url: string) => {
        if (!url) return ''
        const match = url.match(/loom\.com\/share\/([a-f0-9]+)/i)
        return match ? match[1] : url
      }

      // Save video updates
      if (editing.type === 'video') {
        const updateData: any = {
          title: editValues.title
        }
        if (editValues.youtubeId) updateData.youtubeId = extractYouTubeId(editValues.youtubeId)
        if (editValues.loomId) updateData.loomId = extractLoomId(editValues.loomId)

        const res = await fetch('/api/courses/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'video',
            categoryId: editing.categoryId,
            sectionId: editing.sectionId,
            videoId: editing.videoId,
            updates: updateData
          })
        })

        if (!res.ok) {
          alert('Error saving video changes')
          return
        }

        // Save section title if changed
        if (editValues.sectionTitle && editing.sectionId) {
          const sectionRes = await fetch('/api/admin/courses/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'section',
              categoryId: editing.categoryId,
              sectionId: editing.sectionId,
              updates: { title: editValues.sectionTitle }
            })
          })

          if (!sectionRes.ok) {
            alert('Video saved but error saving section title')
            return
          }
        }

        // Reload page to reflect changes
        window.location.reload()
      } else if (editing.type === 'category') {
        const updateData: any = { title: editValues.title }
        const res = await fetch('/api/courses/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'category',
            categoryId: editing.categoryId,
            updates: updateData
          })
        })
        if (res.ok) {
          window.location.reload()
        } else {
          alert('Error saving changes')
        }
      } else if (editing.type === 'section') {
        const updateData: any = {
          title: editValues.title,
          description: editValues.description
        }
        const res = await fetch('/api/courses/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'section',
            categoryId: editing.categoryId,
            sectionId: editing.sectionId,
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

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = categoriesList.findIndex((c) => c.id === active.id)
      const newIndex = categoriesList.findIndex((c) => c.id === over.id)

      const newOrder = arrayMove(categoriesList, oldIndex, newIndex)
      setCategoriesList(newOrder)

      // Save new order to API
      try {
        const res = await fetch('/api/courses/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'category',
            courseType: 'mindset',
            items: newOrder.map((c, index) => ({ id: c.id, sortOrder: index }))
          })
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error('Error saving category order:', errorData)
          // Revert on error
          setCategoriesList(categories || [])
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
        setCategoriesList(categories || [])
        alert('Error saving new order')
      }
    }
  }

  const handleSectionDragEnd = async (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event

    if (over && active.id !== over.id && sectionsList[categoryId]) {
      const sections = sectionsList[categoryId]
      const oldIndex = sections.findIndex((s) => s.id === active.id)
      const newIndex = sections.findIndex((s) => s.id === over.id)

      const newOrder = arrayMove(sections, oldIndex, newIndex)
      
      // Update local state immediately so changes are visible right away
      setSectionsList(prev => ({ ...prev, [categoryId]: newOrder }))
      
      // Also update categoriesList to reflect the change
      setCategoriesList(prev => prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, sections: newOrder }
          : cat
      ))

      // Save new order to API (autosave without page reload)
      try {
        const res = await fetch('/api/courses/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'section',
            courseType: 'mindset',
            categoryId,
            items: newOrder.map((s, index) => ({ id: s.id, sortOrder: index }))
          })
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error('Error saving section order:', errorData, {
            categoryId,
            items: newOrder.map((s, index) => ({ id: s.id, sortOrder: index }))
          })
          // Revert on error only
          const originalSections = categories?.find(c => c.id === categoryId)?.sections || []
          setSectionsList(prev => ({ ...prev, [categoryId]: originalSections }))
          setCategoriesList(prev => prev.map(cat => 
            cat.id === categoryId 
              ? { ...cat, sections: originalSections }
              : cat
          ))
          alert('Error saving new order: ' + (errorData.error || 'Unknown error'))
        } else {
          console.log('Successfully saved section order:', {
            categoryId,
            items: newOrder.map((s, index) => ({ id: s.id, sortOrder: index }))
          })
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
        // Revert on error only
        const originalSections = categories?.find(c => c.id === categoryId)?.sections || []
        setSectionsList(prev => ({ ...prev, [categoryId]: originalSections }))
        setCategoriesList(prev => prev.map(cat => 
          cat.id === categoryId 
            ? { ...cat, sections: originalSections }
            : cat
        ))
        alert('Error saving new order')
      }
    }
  }

  const handleVideosUpdate = (categoryId: string, sectionId: number, newVideos: Video[]) => {
    setSectionsList(prev => ({
      ...prev,
      [categoryId]: (prev[categoryId] || []).map(s => 
        s.id === sectionId ? { ...s, videos: newVideos } : s
      )
    }))
    setCategoriesList(prev => prev.map(cat => 
      cat.id === categoryId
        ? {
            ...cat,
            sections: cat.sections.map(s => 
              s.id === sectionId ? { ...s, videos: newVideos } : s
            )
          }
        : cat
    ))
  }

  const handleTitleChange = (videoId: string, newTitle: string) => {
    setVideoTitles(prev => ({ ...prev, [videoId]: newTitle }))
  }

  const handleNotesChange = (videoId: string, newNotes: string) => {
    setNotes(prev => ({ ...prev, [videoId]: newNotes }))
  }

  const fetchNotes = async (videoId: string) => {
    try {
      const res = await fetch(`/api/courses/video-notes?videoId=${videoId}&courseType=mindset`)
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
          courseType: 'mindset',
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
      const res = await fetch(`/api/courses/video-attachments?videoId=${videoId}&courseType=mindset`)
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
      formData.append('courseType', 'mindset')

      try {
        const res = await fetch('/api/courses/video-attachments', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (res.ok && data.attachment) {
          // Refresh attachments
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
        // Refresh attachments
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
    <div className="flex gap-6 w-full h-full px-4 sm:px-6 lg:px-8 py-8" style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}>
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
          {categories ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCategoryDragEnd}
            >
              <SortableContext
                items={categoriesList.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {categoriesList.filter(category => !category.isStartHere).map((category) => {
              const isCategoryExpanded = expandedCategories.has(category.id)
              
              return (
                <SortableCategoryItem
                  key={category.id}
                  category={category}
                  isCategoryExpanded={isCategoryExpanded}
                  isAdmin={isAdmin}
                  editing={editing}
                  editValues={editValues}
                  expandedSections={expandedSections}
                  selectedVideo={selectedVideo}
                  getVideoTitle={getVideoTitle}
                  onToggleCategory={toggleCategory}
                  onToggleSection={toggleSection}
                  onEdit={(type, categoryId, sectionId, videoId) => {
                    if (type === 'category') {
                      setEditing({ type: 'category', categoryId })
                      setEditValues({ title: category.title })
                    } else if (type === 'section') {
                      const section = category.sections.find(s => s.id === sectionId)
                      if (section) {
                        setEditing({ type: 'section', categoryId, sectionId })
                        setEditValues({ title: section.title, description: section.description })
                      }
                    } else if (type === 'video') {
                      const section = category.sections.find(s => s.id === sectionId)
                      const video = section?.videos.find(v => v.id === videoId)
                      if (video) {
                        setEditing({ type: 'video', categoryId, sectionId, videoId })
                        setEditValues({ title: getVideoTitle(video), youtubeId: video.youtubeId, loomId: video.loomId })
                      }
                    }
                  }}
                  onUpdateEditValues={setEditValues}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditing(null)}
                  onVideoSelect={handleVideoSelect}
                  onEditVideo={(categoryId, sectionId, video) => {
                    setEditing({ type: 'video', categoryId, sectionId, videoId: video.id })
                    setEditValues({ title: getVideoTitle(video), youtubeId: video.youtubeId, loomId: video.loomId })
                  }}
                  onSectionDragEnd={handleSectionDragEnd}
                  sectionsList={sectionsList}
                  onVideosUpdate={handleVideosUpdate}
                  checkpoints={checkpoints}
                  isModuleUnlocked={isModuleUnlocked}
                  isVideoUnlocked={isVideoUnlocked}
                  getVideoCheckpoint={getVideoCheckpoint}
                />
              )
            })}
              </SortableContext>
            </DndContext>
          ) : (
            // Fallback to old structure if categories not provided
            modules.map((module) => {
              const isExpanded = expandedSections.has(module.id)
              
              return (
                <div
                  key={module.id}
                  className="border-b-2 border-slate-700/50 last:border-b-0"
                >
                  <button
                    onClick={() => toggleSection(module.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800/50 transition-colors border-b border-slate-700/30 bg-slate-900/20"
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

                  {isExpanded && (
                    <div className="bg-slate-900/50 border-t border-slate-700/30">
                      {module.videos.map((video, index) => {
                        const isSelected = selectedVideo?.moduleId === module.id && selectedVideo?.video.id === video.id
                        const displayTitle = getVideoTitle(video)
                        const isLast = index === module.videos.length - 1
                        return (
                          <button
                            key={video.id}
                            onClick={() => handleVideoSelect(module.id, video)}
                            className={`w-full px-4 py-2.5 pl-11 text-left hover:bg-slate-800/50 transition-colors border-b border-slate-700/20 ${
                              isLast ? 'border-b-0' : ''
                            } ${
                              isSelected ? 'bg-emerald-500/20 border-l-2 border-emerald-500' : ''
                            }`}
                          >
                            <div className="text-sm text-slate-200">{index + 1}. {displayTitle}</div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
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
              ) : selectedVideo.video.loomId ? (
                <iframe
                  key={`${selectedVideo.video.id}-${selectedVideo.video.loomId}`}
                  src={`https://www.loom.com/embed/${selectedVideo.video.loomId}`}
                  frameBorder="0"
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
              {/* Editable Title & Video Info */}
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
                    <label className="block text-xs text-slate-400 mb-1">Loom ID/URL</label>
                    <input
                      type="text"
                      value={editValues.loomId || selectedVideo.video.loomId || ''}
                      onChange={(e) => setEditValues({ ...editValues, loomId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
                      placeholder="Loom ID or URL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Section Title</label>
                    <input
                      type="text"
                      value={editValues.sectionTitle || (categoriesList.find(cat => 
                        cat.sections.find(s => s.id === selectedVideo.moduleId)
                      )?.sections.find(s => s.id === selectedVideo.moduleId)?.title) || ''}
                      onChange={(e) => setEditValues({ ...editValues, sectionTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
                      placeholder="Section title"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2"
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
                      <p className="text-sm text-slate-400">
                        {categoriesList.find(cat => 
                          cat.sections.find(s => s.id === selectedVideo.moduleId)
                        )?.sections.find(s => s.id === selectedVideo.moduleId)?.title || 'Section'}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const section = categoriesList.find(cat => 
                            cat.sections.find(s => s.id === selectedVideo.moduleId)
                          )?.sections.find(s => s.id === selectedVideo.moduleId)
                          setEditing({ type: 'video', categoryId: categoriesList.find(cat => 
                            cat.sections.find(s => s.id === selectedVideo.moduleId)
                          )?.id, sectionId: selectedVideo.moduleId, videoId: selectedVideo.video.id })
                          setEditValues({ 
                            title: getVideoTitle(selectedVideo.video), 
                            youtubeId: selectedVideo.video.youtubeId || '',
                            loomId: selectedVideo.video.loomId || '',
                            sectionTitle: section?.title || ''
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
                <div className="mt-4 flex justify-center flex-col items-center gap-2">
                  {(() => {
                    const sectionId = selectedVideo.moduleId
                    const currentVideoId = selectedVideo.video.id
                    const currentVideoUuid = selectedVideo.video.uuid
                    const section = categoriesList
                      .flatMap(cat => cat.sections)
                      .find(s => s.id === sectionId)
                    const matchingUnlock = unlockDataState?.sections?.find((s: any) => 
                      s.section_id === sectionId || s.title === section?.title
                    )
                    
                    // FIRST: Check for VIDEO-LEVEL checkpoint on current video
                    let checkpoint = (currentVideoUuid ? videoCheckpoints[currentVideoUuid] : null) || videoCheckpoints[currentVideoId]
                    let isVideoCheckpoint = !!checkpoint
                    
                    if (checkpoint) {
                      console.log(`[Checkpoint Button] Found VIDEO checkpoint for "${selectedVideo.video.title}"`)
                    }
                    
                    // If no video checkpoint, look for SECTION-LEVEL checkpoint
                    if (!checkpoint) {
                      checkpoint = checkpoints[sectionId]
                      
                      // Fallback 1: Try by section title from global store
                      if (!checkpoint && section?.title) {
                        const globalByTitle = (window as any).checkpointByTitle
                        if (globalByTitle && globalByTitle[section.title]) {
                          checkpoint = globalByTitle[section.title]
                          console.log(`[Checkpoint Button] Found by title: "${section.title}"`)
                        }
                      }
                      
                      // Fallback 2: Search all checkpoints for matching unlock ID
                      if (!checkpoint && matchingUnlock?.checkpointId) {
                        const allCheckpoints = Object.values(checkpoints)
                        const matchingCheckpoint = allCheckpoints.find((cp: any) => cp?.id === matchingUnlock.checkpointId)
                        if (matchingCheckpoint) {
                          checkpoint = matchingCheckpoint as any
                          console.log(`[Checkpoint Button] Found by unlock checkpointId`)
                        }
                      }
                    }
                    
                    console.log(`[Checkpoint Button] Section "${section?.title}" (id=${sectionId}), Video "${selectedVideo.video.title}":`, checkpoint ? (isVideoCheckpoint ? 'VIDEO CHECKPOINT' : 'SECTION CHECKPOINT') : 'NOT FOUND')
                    
                    // Show button if checkpoint exists
                    if (checkpoint && checkpoint.id && checkpoint.title && checkpoint.requirements) {
                      // Store for modal use
                      if (!checkpoints[sectionId] && !isVideoCheckpoint) {
                        setCheckpoints(prev => ({ ...prev, [sectionId]: checkpoint }))
                      }
                      return (
                        <button
                          onClick={() => setCheckpointModalOpen(true)}
                          className={`px-8 py-4 ${isVideoCheckpoint 
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border-purple-500/50 text-purple-400' 
                            : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border-cyan-500/50 text-cyan-400'
                          } border rounded-lg font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg flex items-center gap-3`}
                        >
                          <FileCheck className="w-6 h-6" />
                          {isVideoCheckpoint ? 'Complete Video Checkpoint' : 'Submit Checkpoint'}
                        </button>
                      )
                    }
                    
                    // Show loading if we're still fetching or know there should be one
                    if (loadingCheckpoints[sectionId]) {
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
                    
                    // No checkpoint for this video/section
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
              {checkpointModalOpen && selectedVideo && (() => {
                // Get checkpoint with fallbacks - check VIDEO first, then SECTION
                const moduleId = selectedVideo.moduleId
                const currentVideoId = selectedVideo.video.id
                const currentVideoUuid = selectedVideo.video.uuid
                const section = categoriesList.flatMap(cat => cat.sections).find(s => s.id === moduleId)
                
                // First check for video-level checkpoint
                let cp = (currentVideoUuid ? videoCheckpoints[currentVideoUuid] : null) || videoCheckpoints[currentVideoId]
                
                // If no video checkpoint, check section-level
                if (!cp) {
                  cp = checkpoints[moduleId]
                  if (!cp && section?.title) {
                    const globalByTitle = (window as any).checkpointByTitle
                    if (globalByTitle && globalByTitle[section.title]) {
                      cp = globalByTitle[section.title]
                    }
                  }
                }
                return cp
              })() && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setCheckpointModalOpen(false)}>
                  <div className="bg-slate-900 rounded-xl border border-slate-700/50 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                      {(() => {
                        const moduleId = selectedVideo.moduleId
                        const currentVideoId = selectedVideo.video.id
                        const currentVideoUuid = selectedVideo.video.uuid
                        const section = categoriesList.flatMap(cat => cat.sections).find(s => s.id === moduleId)
                        
                        // First check for video-level checkpoint
                        let cp = (currentVideoUuid ? videoCheckpoints[currentVideoUuid] : null) || videoCheckpoints[currentVideoId]
                        const isVideoCheckpoint = !!cp
                        
                        // If no video checkpoint, check section-level
                        if (!cp) {
                          cp = checkpoints[moduleId]
                          if (!cp && section?.title) {
                            const globalByTitle = (window as any).checkpointByTitle
                            if (globalByTitle && globalByTitle[section.title]) {
                              cp = globalByTitle[section.title]
                            }
                          }
                        }
                        if (!cp) return null
                        return (
                      <CheckpointSubmission
                        checkpointId={cp.id}
                        checkpointTitle={cp.title}
                        requirements={cp.requirements}
                        sectionId={selectedVideo.moduleId.toString()}
                        onSuccess={(status) => {
                          console.log('[Mindset] Checkpoint submission result:', status)
                          
                          if (status === 'approved') {
                            const currentModuleId = selectedVideo?.moduleId
                            
                            // VIDEO-LEVEL: unlock next video in the same section
                            if (isVideoCheckpoint && section) {
                              const videoIndex = section.videos.findIndex(v => v.id === currentVideoId)
                              const nextVideo = videoIndex >= 0 ? section.videos[videoIndex + 1] : null
                              
                              if (nextVideo) {
                                setUnlockedVideos(prev => {
                                  const nextSet = new Set(prev)
                                  nextSet.add(nextVideo.uuid || nextVideo.id)
                                  return nextSet
                                })
                                setSuccessNextVideo({ sectionId: section.id, video: nextVideo })
                                setSuccessModalOpen(true)
                              }
                              
                              setCheckpointModalOpen(false)
                              return
                            }
                            
                            // SECTION-LEVEL: unlock next section as before
                            if (currentModuleId) {
                              const nextModuleId = currentModuleId + 1
                              console.log(`[Mindset] Unlocking module ${nextModuleId}`)
                              
                              setUnlockedModules(prev => {
                                const newSet = new Set(prev)
                                newSet.add(nextModuleId)
                                return newSet
                              })
                              
                              setUnlockedSectionId(nextModuleId)
                              setCheckpointModalOpen(false)
                              setSuccessModalOpen(true)
                            }
                          } else if (status === 'needs_review') {
                            setCheckpointModalOpen(false)
                            alert('⏳ Checkpoint submitted! Under review, you\'ll be notified within 24 hours.')
                          } else {
                            console.log('[Mindset] Checkpoint denied, keeping modal open')
                          }
                        }}
                      />
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Success Modal */}
              {successModalOpen && (unlockedSectionId || successNextVideo) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="bg-slate-900 rounded-xl border border-green-500/50 max-w-md w-full mx-4 p-8 text-center shadow-2xl shadow-green-500/20">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Checkpoint Complete!</h2>
                    <p className="text-slate-400 mb-6">
                      {successNextVideo ? "You've unlocked the next lesson." : "You've unlocked the next section."}
                    </p>
                    <div className="flex flex-col gap-3">
                      {successNextVideo ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSuccessModalOpen(false)
                            setSelectedVideo({ moduleId: successNextVideo.sectionId, video: successNextVideo.video })
                            setExpandedSections(prev => new Set([...Array.from(prev), successNextVideo.sectionId]))
                            setSuccessNextVideo(null)
                          }}
                          className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-lg font-semibold text-white transition-all shadow-lg shadow-purple-500/25"
                        >
                          Continue to Next Lesson →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const allSections = categoriesList.flatMap(cat => cat.sections)
                            const nextSection = allSections.find(s => s.id === unlockedSectionId)
                            if (nextSection && nextSection.videos.length > 0) {
                              setSuccessModalOpen(false)
                              setSelectedVideo({ moduleId: nextSection.id, video: nextSection.videos[0] })
                              setExpandedSections(prev => new Set([...Array.from(prev), nextSection.id]))
                            } else {
                              setSuccessModalOpen(false)
                            }
                          }}
                          className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-semibold text-white transition-all shadow-lg shadow-green-500/25"
                        >
                          Continue to Next Section →
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSuccessModalOpen(false)
                          setSuccessNextVideo(null)
                          setUnlockedSectionId(null)
                        }}
                        className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Section */}
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
                                  ? 'bg-emerald-600 text-white'
                                  : savingNotes[selectedVideo.video.id]
                                  ? 'bg-emerald-800 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
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
                            className="flex items-center gap-2 flex-1 hover:text-emerald-400 transition-colors"
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
                              className="p-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
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
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-slate-400">Select a video to start learning</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
