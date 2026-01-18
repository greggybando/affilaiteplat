'use client'

import { GripVertical, Lock, CheckCircle2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { InlineEditWrapper } from './admin/InlineEditWrapper'
import { EditableTitle } from './admin/EditableTitle'

interface LessonItemProps {
  lesson: {
    id: string
    title: string
  }
  sectionId: number
  isAdmin: boolean
  isSelected: boolean
  isLocked?: boolean
  hasCheckpoint?: boolean
  onSelect: () => void
  onUpdateTitle?: (lessonId: string, newTitle: string) => Promise<void>
  onDelete?: (lessonId: string) => Promise<void>
}

export function LessonItem({
  lesson,
  sectionId,
  isAdmin,
  isSelected,
  isLocked = false,
  hasCheckpoint = false,
  onSelect,
  onUpdateTitle,
  onDelete
}: LessonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `lesson-${sectionId}-${lesson.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (isLocked ? 0.5 : 1),
  }

  const content = (
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
      {/* Drag Handle */}
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

      {/* Lesson Content */}
      <button
        type="button"
        onClick={() => !isLocked && onSelect()}
        className={`flex-1 text-left ${isLocked ? 'cursor-not-allowed' : ''}`}
        disabled={isLocked}
      >
        <div className="text-xs leading-relaxed flex items-center gap-2" style={{
          color: isLocked 
            ? 'rgba(100,100,105,0.6)' 
            : isSelected 
              ? 'rgba(34,211,238,0.9)' 
              : 'rgba(170,170,175,0.85)',
          textShadow: isSelected ? '0 0 8px rgba(34,211,238,0.4)' : 'none'
        }}>
          {isAdmin && onUpdateTitle ? (
            <EditableTitle
              value={lesson.title}
              isAdmin={isAdmin}
              onSave={(newTitle) => onUpdateTitle(lesson.id, newTitle)}
              className="text-xs"
              style={{
                color: isLocked 
                  ? 'rgba(100,100,105,0.6)' 
                  : isSelected 
                    ? 'rgba(34,211,238,0.9)' 
                    : 'rgba(170,170,175,0.85)',
              }}
            />
          ) : (
            <span>{lesson.title}</span>
          )}
          
          {/* Status Icons */}
          {isLocked && <Lock className="w-3 h-3 ml-auto opacity-60" />}
          {hasCheckpoint && <CheckCircle2 className="w-3 h-3 ml-auto text-cyan-400" />}
        </div>
      </button>
    </div>
  )

  // Wrap with admin controls if admin
  if (isAdmin && onDelete) {
    return (
      <InlineEditWrapper
        isAdmin={isAdmin}
        onDelete={() => onDelete(lesson.id)}
      >
        {content}
      </InlineEditWrapper>
    )
  }

  return content
}

