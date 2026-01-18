'use client'

import React, { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useAdmin } from '@/lib/hooks/useAdmin'
import { CourseProgressBar } from '@/app/dashboard/components/classroom/CourseProgressBar'
import { CategoryHeader } from '@/app/dashboard/components/classroom/CategoryHeader'
import { ModuleSection } from '@/app/dashboard/components/classroom/ModuleSection'
import { VideoPlayer } from '@/app/dashboard/components/classroom/VideoPlayer'
import { Plus } from 'lucide-react'

// Type definitions
interface Video {
  id: string
  uuid?: string
  title: string
  loomId?: string
  youtubeId?: string
}

interface Module {
  id: number
  uuid?: string
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

interface MindsetModuleListProps {
  modules: Module[]
  categories?: Category[]
  affiliate?: {
    role?: string
    [key: string]: any
  }
  onDataChange?: () => void
}

export function MindsetModuleListRefactored({ modules, categories, affiliate, onDataChange }: MindsetModuleListProps) {
  const isAdmin = useAdmin(affiliate)
  
  // ===== STATE MANAGEMENT =====
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['starthere', 'mindset', 'lifedesign', 'thinkingtools'])
  )
  
  const getInitialExpandedSections = () => {
    if (categories && categories.length > 0) {
      return new Set(categories.map(cat => cat.sections[0]?.id).filter(Boolean) as number[])
    }
    return new Set(modules.map(m => m.id).slice(0, 3))
  }
  
  const [expandedSections, setExpandedSections] = useState<Set<number>>(getInitialExpandedSections())
  
  const [selectedVideo, setSelectedVideo] = useState<{ moduleId: number, video: Video } | null>(
    categories?.[0]?.sections[0]?.videos[0] 
      ? { moduleId: categories[0].sections[0].id, video: categories[0].sections[0].videos[0] }
      : modules[0]?.videos[0] 
        ? { moduleId: modules[0].id, video: modules[0].videos[0] } 
        : null
  )

  const [categoriesList, setCategoriesList] = useState<Category[]>(categories || [])
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
    if (categories && categories.length > 0) {
      setCategoriesList(categories)
    }
  }, [categories])

  // ===== TOGGLE FUNCTIONS =====
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

  const handleUpdateCategoryTitle = async (categoryId: string, newTitle: string) => {
    console.log('[Admin] Update category title:', { categoryId, newTitle })
    alert(`Update category ${categoryId} to: ${newTitle}\n(API integration pending)`)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    console.log('[Admin] Delete category:', categoryId)
    alert(`Delete category ${categoryId}\n(API integration pending)`)
  }

  const handleAddSectionToCategory = async (categoryId: string) => {
    console.log('[Admin] Add section to category:', categoryId)
    alert(`Add section to category ${categoryId}\n(API integration pending)`)
  }

  const handleAddCategory = async () => {
    console.log('[Admin] Add new category')
    alert('Add new category\n(API integration pending)')
  }

  // ===== LESSON SELECTION =====
  const handleLessonSelect = (moduleId: number, lesson: Video) => {
    setSelectedVideo({ moduleId, video: lesson })
  }

  // ===== UNLOCK LOGIC =====
  const isModuleUnlocked = (moduleId: number) => {
    return unlockedModules.has(moduleId) || isAdmin
  }

  // ===== CALCULATE PROGRESS =====
  const totalLessons = categoriesList.reduce((sum, cat) => 
    sum + cat.sections.reduce((sectionSum, section) => sectionSum + section.videos.length, 0), 0
  )
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
              items={categoriesList.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {categoriesList.map((category) => (
                <CategoryHeader
                  key={category.id}
                  category={category}
                  isAdmin={isAdmin}
                  isExpanded={expandedCategories.has(category.id)}
                  onToggle={() => toggleCategory(category.id)}
                  onUpdateTitle={handleUpdateCategoryTitle}
                  onDelete={handleDeleteCategory}
                  onAddSection={handleAddSectionToCategory}
                >
                  {category.sections.map((section) => (
                    <ModuleSection
                      key={section.id}
                      module={{
                        id: section.id,
                        title: section.title,
                        lessons: section.videos.map(v => ({ id: v.id, title: v.title }))
                      }}
                      isAdmin={isAdmin}
                      isExpanded={expandedSections.has(section.id)}
                      isLocked={!isModuleUnlocked(section.id)}
                      selectedLessonId={selectedVideo?.video.id}
                      onToggle={() => toggleSection(section.id)}
                      onLessonSelect={(lesson) => handleLessonSelect(section.id, lesson as Video)}
                      onUpdateTitle={handleUpdateModuleTitle}
                      onDelete={handleDeleteModule}
                      onAddLesson={handleAddLesson}
                      onUpdateLessonTitle={handleUpdateLessonTitle}
                      onDeleteLesson={handleDeleteLesson}
                    />
                  ))}
                </CategoryHeader>
              ))}
            </SortableContext>
          </DndContext>

          {/* Add Category Button */}
          {isAdmin && (
            <button
              onClick={handleAddCategory}
              className="w-full px-4 py-3 text-left text-sm text-emerald-400 hover:bg-slate-800/50 transition-colors border-t border-slate-700/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          )}
        </div>
      </div>

      {/* Right Main Content - Video Player */}
      <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Course Progress */}
        <div className="p-6 pb-0">
          <CourseProgressBar
            courseName="the Mindset method"
            completedLessons={completedLessons}
            totalLessons={totalLessons}
            color="emerald"
          />
        </div>

        {selectedVideo ? (
          <div className="space-y-0">
            {/* Video Player */}
            <div className="aspect-video bg-slate-900 border-b border-slate-700/50 relative">
              <VideoPlayer
                videoId={selectedVideo.video.id}
                loomId={selectedVideo.video.loomId}
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

