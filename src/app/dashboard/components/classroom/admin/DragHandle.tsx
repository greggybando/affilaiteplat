'use client'

import { GripVertical } from 'lucide-react'

interface DragHandleProps {
  isAdmin: boolean
  className?: string
}

export function DragHandle({ isAdmin, className = '' }: DragHandleProps) {
  if (!isAdmin) {
    return null
  }

  return (
    <div
      className={`cursor-grab active:cursor-grabbing ${className}`}
      title="Drag to reorder"
      style={{
        color: 'rgba(100, 116, 139, 0.6)',
        transition: 'color 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'rgba(34, 211, 238, 0.8)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'rgba(100, 116, 139, 0.6)'
      }}
    >
      <GripVertical className="w-4 h-4" />
    </div>
  )
}

