'use client'

import React, { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useAdmin } from '@/lib/hooks/useAdmin'
import { CourseProgressBar } from '@/app/dashboard/components/classroom/CourseProgressBar'
import { ModuleSection } from '@/app/dashboard/components/classroom/ModuleSection'
import { VideoPlayer } from '@/app/dashboard/components/classroom/VideoPlayer'
import { Plus } from 'lucide-react'

// Type definitions
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

interface DreamJobModuleListProps {
  modules: Module[]
  affiliate?: {
    role?: string
    [key: string]: any
  }
  onVideoSelect?: (video: Video, module: Module) => void
  onDataChange?: () => void
}

export function DreamJobModuleListRefactored({ modules, affiliate, onVideoSelect, onDataChange }: DreamJobModuleListProps) {
  const isAdmin = useAdmin(affiliate)
  
  // ===== STATE MANAGEMENT =====
  const getInitialExpandedModules = () => {
    if (modules && modules.length > 0) {
      return new Set(modules.slice(0, 2).map(m => m.id))
    }
    return new Set<number>()
  }
  
  const [expandedModules, setExpandedModules] = useState<Set<number>>(getInitialExpandedModules())
  
  const [selectedVideo, setSelectedVideo] = useState<{ moduleId: number, video: Video } | null>(
    modules[0]?.videos[0] ? { moduleId: modules[0].id, video: modules[0].videos[0] } : null
  )

  const [modulesList, setModulesList] = useState<Module[]>(modules || [])
  const [unlockedModules, setUnlockedModules] = useState<Set<number>>(new Set([1]))

  // ===== DRAG & DROP SENSORS =====
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ===== DATA INITIALIZATION =====
  useEffect(() => {
    if (modules && modules.length > 0) {
      setModulesList(modules)
    }
  }, [modules])

  useEffect(() => {
    if (!selectedVideo && modules[0]?.videos[0]) {
      setSelectedVideo({ moduleId: modules[0].id, video: modules[0].videos[0] })
    }
  }, [modules, selectedVideo])

  // ===== TOGGLE FUNCTIONS =====
  const toggleModule = (moduleId: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }

  // ===== ADMIN HANDLER FUNCTIONS =====
  const handleUpdateModuleTitle = async (moduleId: number, newTitle: string) => {
    console.log('[Admin] Update module title:', { moduleId, newTitle })
    alert(`Update module ${moduleId} to: ${newTitle}\n(API integration pending)`)
  }

  const handleDeleteModule = async (moduleId: number) => {
    console.log('[Admin] Delete module:', moduleId)
    alert(`Delete module ${moduleId}\n(API integration pending)`)
  }

  const handleAddLesson = async (moduleId: number) => {
    console.log('[Admin] Add lesson to module:', moduleId)
    alert(`Add lesson to module ${moduleId}\n(API integration pending)`)
  }

  const handleUpdateLessonTitle = async (lessonId: string, newTitle: string) => {
    console.log('[Admin] Update lesson title:', { lessonId, newTitle })
    alert(`Update lesson ${lessonId} to: ${newTitle}\n(API integration pending)`)
  }

  const handleDeleteLesson = async (lessonId: string) => {
    console.log('[Admin] Delete lesson:', lessonId)
    alert(`Delete lesson ${lessonId}\n(API integration pending)`)
  }

  const handleAddModule = async () => {
    console.log('[Admin] Add new module')
    alert('Add new module\n(API integration pending)')
  }

  // ===== LESSON SELECTION =====
  const handleLessonSelect = (moduleId: number, lesson: Video) => {
    setSelectedVideo({ moduleId, video: lesson })
    if (onVideoSelect) {
      const module = modulesList.find(m => m.id === moduleId)
      if (module) {
        onVideoSelect(lesson, module)
      }
    }
  }

  // ===== UNLOCK LOGIC =====
  const isModuleUnlocked = (moduleId: number) => {
    return unlockedModules.has(moduleId) || isAdmin
  }

  // ===== CALCULATE PROGRESS =====
  const totalLessons = modulesList.reduce((sum, module) => sum + module.videos.length, 0)
  const completedLessons = 0 // TODO: Track actual completion

  // ===== RENDER =====
  return (
    <div className="flex gap-6 w-full px-4 sm:px-6 lg:px-8 py-8" style={{ boxSizing: 'border-box' }}>
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
          <DndContext sensors={sensors} collisionDetection={closestCenter}>
            <SortableContext
              items={modulesList.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {modulesList.map((module) => (
                <ModuleSection
                  key={module.id}
                  module={{
                    id: module.id,
                    title: module.title,
                    lessons: module.videos.map(v => ({ id: v.id, title: v.title }))
                  }}
                  isAdmin={isAdmin}
                  isExpanded={expandedModules.has(module.id)}
                  isLocked={!isModuleUnlocked(module.id)}
                  selectedLessonId={selectedVideo?.video.id}
                  onToggle={() => toggleModule(module.id)}
                  onLessonSelect={(lesson) => handleLessonSelect(module.id, lesson as Video)}
                  onUpdateTitle={handleUpdateModuleTitle}
                  onDelete={handleDeleteModule}
                  onAddLesson={handleAddLesson}
                  onUpdateLessonTitle={handleUpdateLessonTitle}
                  onDeleteLesson={handleDeleteLesson}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add Module Button */}
          {isAdmin && (
            <button
              onClick={handleAddModule}
              className="w-full px-4 py-3 text-left text-sm text-emerald-400 hover:bg-slate-800/50 transition-colors border-t border-slate-700/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Module
            </button>
          )}
        </div>
      </div>

      {/* Right Main Content - Video Player */}
      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Course Progress */}
        <div className="p-6 pb-0">
          <CourseProgressBar
            courseName="the Dream Job method"
            completedLessons={completedLessons}
            totalLessons={totalLessons}
            color="cyan"
          />
        </div>

        {selectedVideo ? (
          <div className="space-y-0">
            {/* Video Player */}
            <div className="aspect-video bg-slate-900 border-b border-slate-700/50 relative">
              <VideoPlayer
                videoId={selectedVideo.video.id}
                youtubeId={selectedVideo.video.youtubeId}
                title={selectedVideo.video.title}
              />
            </div>

            {/* Video Info */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                {selectedVideo.video.title}
              </h2>
              {/* TODO: Add notes, attachments, checkpoint UI */}
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

