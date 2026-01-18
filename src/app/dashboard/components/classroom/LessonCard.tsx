'use client'

import { Lesson } from '@/lib/types/courses'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface LessonCardProps {
  lesson: Lesson
  isAdmin: boolean
  isSelected?: boolean
  lessonIndex: number
  onSelect?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function LessonCard({
  lesson,
  isAdmin,
  isSelected = false,
  lessonIndex,
  onSelect,
  onEdit,
  onDelete
}: LessonCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      style={{
        borderColor: 'rgba(34,211,238,0.05)',
        background: isSelected 
          ? 'rgba(25,25,30,0.5)'
          : 'rgba(20,20,25,0.3)',
        borderLeft: isSelected ? '2px solid rgba(34,211,238,0.4)' : '2px solid transparent',
        boxShadow: isSelected ? 'inset 0 0 15px rgba(34,211,238,0.08)' : 'none'
      }}
      className="w-full px-4 py-1.5 pl-12 flex items-center gap-2.5 transition-all border-b last:border-b-0 cursor-pointer group"
      onMouseEnter={(e) => {
        setIsHovered(true)
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(25,25,30,0.4)'
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false)
        if (!isSelected) {
          e.currentTarget.style.background = 'rgba(20,20,25,0.3)'
        }
      }}
      onClick={onSelect}
    >
      <button
        type="button"
        className="flex-1 text-left"
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.()
        }}
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
          }}>{lessonIndex + 1}.</span>
          {lesson.title}
        </div>
      </button>
      
      {isAdmin && (isHovered || isSelected) && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
              title="Edit lesson"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Are you sure you want to delete this lesson?')) {
                  onDelete()
                }
              }}
              className="text-slate-400 hover:text-red-400 transition-colors p-1"
              title="Delete lesson"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

