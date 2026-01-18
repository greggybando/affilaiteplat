'use client'

import { useState } from 'react'
import { ChevronRight, Lock, Plus } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { InlineEditWrapper } from './admin/InlineEditWrapper'
import { EditableTitle } from './admin/EditableTitle'
import { DragHandle } from './admin/DragHandle'
import { LessonItem } from './LessonItem'

interface Lesson {
  id: string
  title: string
}

interface ModuleSectionProps {
  module: {
    id: number
    title: string
    lessons: Lesson[]
  }
  isAdmin: boolean
  isExpanded: boolean
  isLocked?: boolean
  selectedLessonId?: string
  onToggle: () => void
  onLessonSelect: (lesson: Lesson) => void
  onUpdateTitle?: (moduleId: number, newTitle: string) => Promise<void>
  onDelete?: (moduleId: number) => Promise<void>
  onAddLesson?: (moduleId: number) => Promise<void>
  onUpdateLessonTitle?: (lessonId: string, newTitle: string) => Promise<void>
  onDeleteLesson?: (lessonId: string) => Promise<void>
}

export function ModuleSection({
  module,
  isAdmin,
  isExpanded,
  isLocked = false,
  selectedLessonId,
  onToggle,
  onLessonSelect,
  onUpdateTitle,
  onDelete,
  onAddLesson,
  onUpdateLessonTitle,
  onDeleteLesson
}: ModuleSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `module-${module.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const moduleHeader = (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: 'rgba(34,211,238,0.1)',
        background: 'rgba(20,20,25,0.5)'
      }}
      className="w-full"
    >
      <div 
        className={`px-4 py-2 pl-8 flex items-center gap-2.5 ${isLocked && !isAdmin ? 'opacity-50' : ''}`}
        style={{
          background: 'rgba(20,20,25,0.5)',
          position: 'relative'
        }}
      >
        {/* Lock Indicator */}
        {isLocked && !isAdmin && (
          <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
        )}
        
        {/* Drag Handle */}
        <DragHandle isAdmin={isAdmin} {...attributes} {...listeners} />

        {/* Expand/Collapse Button */}
        <button
          type="button"
          onClick={onToggle}
          className={`flex-1 flex items-center gap-2.5 text-left transition-all ${isLocked && !isAdmin ? 'cursor-not-allowed' : ''}`}
          style={{ paddingLeft: '2px' }}
        >
          <svg
            className="transition-transform duration-200"
            style={{
              width: '12px',
              height: '12px',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              color: isLocked && !isAdmin ? 'rgba(100,100,100,0.7)' : 'rgba(34,211,238,0.7)'
            }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          
          <div className="flex-1 min-w-0">
            {isAdmin && onUpdateTitle ? (
              <EditableTitle
                value={module.title}
                isAdmin={isAdmin}
                onSave={(newTitle) => onUpdateTitle(module.id, newTitle)}
                className="text-xs font-medium"
                style={{
                  color: isLocked && !isAdmin ? 'rgba(100,100,100,0.7)' : 'rgba(34,211,238,0.9)',
                  textShadow: isLocked && !isAdmin ? 'none' : '0 0 8px rgba(34,211,238,0.4), 0 0 15px rgba(34,211,238,0.2)',
                }}
              />
            ) : (
              <div className="text-xs font-medium truncate" style={{
                color: isLocked && !isAdmin ? 'rgba(100,100,100,0.7)' : 'rgba(34,211,238,0.9)',
                textShadow: isLocked && !isAdmin ? 'none' : '0 0 8px rgba(34,211,238,0.4), 0 0 15px rgba(34,211,238,0.2)',
                letterSpacing: '0.01em',
                fontWeight: 500
              }}>
                {module.title}
              </div>
            )}
            <div className="text-[10px]" style={{
              color: 'rgba(120,120,125,0.6)',
              marginTop: '2px'
            }}>
              {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
            </div>
          </div>
        </button>
      </div>

      {/* Lessons List */}
      {isExpanded && (
        <div className="bg-slate-900/50 border-t border-slate-700/30">
          {isLocked && !isAdmin ? (
            <div className="px-8 py-4 text-slate-500 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Complete the previous section's checkpoint to unlock this content.
            </div>
          ) : (
            <>
              <SortableContext
                items={module.lessons.map(l => `lesson-${module.id}-${l.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {module.lessons.map((lesson) => (
                  <LessonItem
                    key={lesson.id}
                    lesson={lesson}
                    sectionId={module.id}
                    isAdmin={isAdmin}
                    isSelected={selectedLessonId === lesson.id}
                    onSelect={() => onLessonSelect(lesson)}
                    onUpdateTitle={onUpdateLessonTitle}
                    onDelete={onDeleteLesson}
                  />
                ))}
              </SortableContext>
              
              {/* Add Lesson Button */}
              {isAdmin && onAddLesson && (
                <button
                  onClick={() => onAddLesson(module.id)}
                  className="w-full px-4 py-2 pl-12 text-left text-xs text-emerald-400 hover:bg-slate-800/50 transition-colors border-t border-slate-700/30 flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  Add Lesson
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )

  // Wrap with admin controls
  if (isAdmin && (onDelete || onAddLesson)) {
    return (
      <InlineEditWrapper
        isAdmin={isAdmin}
        onDelete={onDelete ? () => onDelete(module.id) : undefined}
        onAdd={onAddLesson ? () => onAddLesson(module.id) : undefined}
      >
        {moduleHeader}
      </InlineEditWrapper>
    )
  }

  return moduleHeader
}

