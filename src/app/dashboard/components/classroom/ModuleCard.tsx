'use client'

import { Module, Lesson } from '@/lib/types/courses'
import { Settings, Plus, Trash2, Lock } from 'lucide-react'
import { useState } from 'react'
import { LessonCard } from './LessonCard'

interface ModuleCardProps {
  module: Module
  lessons: Lesson[]
  isAdmin: boolean
  isExpanded?: boolean
  isLocked?: boolean
  onToggleExpand?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onAddLesson?: () => void
  onSelectLesson?: (lesson: Lesson) => void
  selectedLessonId?: string
  onEditLesson?: (lesson: Lesson) => void
  onDeleteLesson?: (lesson: Lesson) => void
}

export function ModuleCard({
  module,
  lessons,
  isAdmin,
  isExpanded = false,
  isLocked = false,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddLesson,
  onSelectLesson,
  selectedLessonId,
  onEditLesson,
  onDeleteLesson
}: ModuleCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      style={{
        borderColor: 'rgba(34,211,238,0.15)'
      }}
      className="border-b last:border-b-0"
    >
      {/* Module Header */}
      <div 
        className="w-full px-4 py-3 flex items-center gap-2.5" 
        style={{
          background: 'rgba(15,15,20,0.6)',
          borderLeft: '2px solid transparent',
          borderBottom: '1px solid rgba(34,211,238,0.1)',
          position: 'relative',
          overflow: 'hidden',
          opacity: isLocked ? 0.5 : 1
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{
          background: 'linear-gradient(to bottom, rgba(34,211,238,0.4), rgba(6,182,212,0.5), rgba(34,211,238,0.4))',
          boxShadow: '0 0 4px rgba(34,211,238,0.3)',
          opacity: 0.6
        }} />
        
        {isLocked && (
          <div className="absolute right-4 flex items-center gap-2 text-slate-400 text-xs">
            <Lock className="w-3 h-3" />
            <span>Complete checkpoint to unlock</span>
          </div>
        )}

        <button
          type="button"
          onClick={isLocked ? undefined : onToggleExpand}
          disabled={isLocked}
          className="flex-1 flex items-center gap-2.5 text-left transition-all"
          style={{ 
            paddingLeft: '2px',
            cursor: isLocked ? 'not-allowed' : 'pointer'
          }}
        >
          <svg
            className="transition-transform duration-200"
            style={{
              width: '10px',
              height: '10px',
              color: 'rgba(34,211,238,0.5)',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              opacity: isLocked ? 0.3 : 1
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{
              color: isLocked ? 'rgba(120,120,125,0.7)' : 'rgba(220,220,225,0.95)',
              textShadow: isLocked ? 'none' : '0 0 12px rgba(34,211,238,0.5), 0 0 20px rgba(34,211,238,0.3), 0 0 30px rgba(34,211,238,0.2)',
              letterSpacing: '0.08em',
              fontWeight: 600
            }}>
              {module.title}
            </div>
            {module.description && (
              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                {module.description}
              </div>
            )}
          </div>
        </button>

        {isAdmin && !isLocked && (isHovered || isExpanded) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onAddLesson && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAddLesson()
                }}
                className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
                title="Add lesson"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
                title="Edit module"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Are you sure you want to delete this module? All lessons will be deleted too.')) {
                    onDelete()
                  }
                }}
                className="text-slate-400 hover:text-red-400 transition-colors p-1"
                title="Delete module"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lessons List */}
      {isExpanded && !isLocked && lessons.length > 0 && (
        <div className="bg-slate-900/30 border-t border-slate-700/30">
          {lessons.map((lesson, index) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              isAdmin={isAdmin}
              isSelected={selectedLessonId === lesson.id}
              lessonIndex={index}
              onSelect={() => onSelectLesson?.(lesson)}
              onEdit={onEditLesson ? () => onEditLesson(lesson) : undefined}
              onDelete={onDeleteLesson ? () => onDeleteLesson(lesson) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

