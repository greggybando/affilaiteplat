'use client'

import { ReactNode, useState } from 'react'
import { Edit2, Trash2, Plus } from 'lucide-react'

interface InlineEditWrapperProps {
  isAdmin: boolean
  onEdit?: () => void
  onDelete?: () => void
  onAdd?: () => void
  children: ReactNode
  className?: string
}

export function InlineEditWrapper({
  isAdmin,
  onEdit,
  onDelete,
  onAdd,
  children,
  className = ''
}: InlineEditWrapperProps) {
  const [isHovered, setIsHovered] = useState(false)

  if (!isAdmin) {
    return <>{children}</>
  }

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {/* Admin Controls - Only visible on hover */}
      {isHovered && (
        <div
          className="absolute top-2 right-2 flex items-center gap-1 z-50"
          style={{
            background: 'rgba(15, 15, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.4), 0 4px 12px rgba(0, 0, 0, 0.8)'
          }}
        >
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1.5 hover:bg-cyan-500/20 rounded transition-colors"
              title="Edit"
              style={{ color: 'rgba(34, 211, 238, 0.9)' }}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          
          {onAdd && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAdd()
              }}
              className="p-1.5 hover:bg-emerald-500/20 rounded transition-colors"
              title="Add"
              style={{ color: 'rgba(16, 185, 129, 0.9)' }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Are you sure you want to delete this item?')) {
                  onDelete()
                }
              }}
              className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
              title="Delete"
              style={{ color: 'rgba(239, 68, 68, 0.9)' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

