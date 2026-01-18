'use client'

import { useState } from 'react'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { InlineEditWrapper } from './admin/InlineEditWrapper'
import { EditableTitle } from './admin/EditableTitle'

interface CategoryHeaderProps {
  category: {
    id: string
    title: string
    isStartHere?: boolean
  }
  isAdmin: boolean
  isExpanded: boolean
  onToggle: () => void
  onUpdateTitle?: (categoryId: string, newTitle: string) => Promise<void>
  onDelete?: (categoryId: string) => Promise<void>
  onAddSection?: (categoryId: string) => Promise<void>
  children?: React.ReactNode
}

export function CategoryHeader({
  category,
  isAdmin,
  isExpanded,
  onToggle,
  onUpdateTitle,
  onDelete,
  onAddSection,
  children
}: CategoryHeaderProps) {
  const headerContent = (
    <div className="border-b-2 border-slate-700/50">
      <button
        type="button"
        onClick={onToggle}
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
          {isAdmin && onUpdateTitle ? (
            <EditableTitle
              value={category.title}
              isAdmin={isAdmin}
              onSave={(newTitle) => onUpdateTitle(category.id, newTitle)}
              className="text-xs font-semibold uppercase tracking-wider"
              style={{
                color: 'rgba(220,220,225,0.95)',
                textShadow: '0 0 12px rgba(34,211,238,0.5), 0 0 20px rgba(34,211,238,0.3), 0 0 30px rgba(34,211,238,0.2)',
                letterSpacing: '0.08em',
              }}
            />
          ) : (
            <div className="text-xs font-semibold uppercase tracking-wider" style={{
              color: 'rgba(220,220,225,0.95)',
              textShadow: '0 0 12px rgba(34,211,238,0.5), 0 0 20px rgba(34,211,238,0.3), 0 0 30px rgba(34,211,238,0.2)',
              letterSpacing: '0.08em',
              fontWeight: 600
            }}>
              {category.title}
            </div>
          )}
        </div>
      </button>
      
      {/* Category Sections */}
      {isExpanded && children}
    </div>
  )

  // Wrap with admin controls
  if (isAdmin && (onDelete || onAddSection)) {
    return (
      <InlineEditWrapper
        isAdmin={isAdmin}
        onDelete={onDelete && !category.isStartHere ? () => onDelete(category.id) : undefined}
        onAdd={onAddSection ? () => onAddSection(category.id) : undefined}
      >
        {headerContent}
      </InlineEditWrapper>
    )
  }

  return headerContent
}

