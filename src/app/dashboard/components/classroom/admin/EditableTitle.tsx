'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X } from 'lucide-react'

interface EditableTitleProps {
  value: string
  isAdmin: boolean
  onSave: (newValue: string) => Promise<void> | void
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  forceEditing?: boolean
  onEditingChange?: (editing: boolean) => void
}

export function EditableTitle({
  value,
  isAdmin,
  onSave,
  className = '',
  style = {},
  placeholder = 'Enter title...',
  forceEditing = false,
  onEditingChange
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(forceEditing)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [inputWidth, setInputWidth] = useState(200)
  
  useEffect(() => {
    if (forceEditing) {
      setIsEditing(true)
    }
  }, [forceEditing])
  
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange(isEditing)
    }
  }, [isEditing, onEditingChange])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
      // Scroll to show cursor
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.scrollLeft = inputRef.current.scrollWidth
        }
      }, 0)
    }
  }, [isEditing])

  // Auto-resize input based on content
  useEffect(() => {
    if (isEditing && measureRef.current) {
      measureRef.current.textContent = editValue || placeholder
      const width = Math.max(200, measureRef.current.offsetWidth + 20)
      setInputWidth(width)
      // Scroll to show cursor
      if (inputRef.current) {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.scrollLeft = inputRef.current.scrollWidth
          }
        }, 0)
      }
    }
  }, [editValue, isEditing, placeholder])

  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleSave = async () => {
    if (!editValue.trim()) {
      setEditValue(value)
      setIsEditing(false)
      return
    }

    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save changes')
      setEditValue(value)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (!isAdmin || !isEditing) {
    return (
      <span
        className={className}
        onClick={() => isAdmin && setIsEditing(true)}
        onDoubleClick={() => isAdmin && setIsEditing(true)}
        title={isAdmin ? 'Click to edit' : undefined}
        style={{ ...style, cursor: isAdmin ? 'pointer' : style.cursor }}
      >
        {value}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0 relative" onClick={(e) => e.stopPropagation()}>
      {/* Hidden span to measure text width */}
      <span
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'pre',
          fontSize: style.fontSize || '1.25rem',
          fontWeight: style.fontWeight || 'bold',
          fontFamily: 'inherit',
          padding: '0 8px'
        }}
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value)
          // Scroll to end to show what we're typing
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.scrollLeft = inputRef.current.scrollWidth
            }
          }, 0)
        }}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          e.stopPropagation()
          // Scroll to cursor position
          setTimeout(() => {
            if (inputRef.current) {
              const cursorPos = inputRef.current.selectionStart || 0
              inputRef.current.scrollLeft = inputRef.current.scrollWidth
            }
          }, 0)
        }}
        disabled={isSaving}
        className={`bg-slate-800/80 border border-cyan-500/50 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${className}`}
        style={{
          ...style,
          minWidth: `${inputWidth}px`,
          width: `${inputWidth}px`,
          maxWidth: '100%',
          boxShadow: '0 0 10px rgba(34, 211, 238, 0.3)',
          overflow: 'visible'
        }}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleSave()
        }}
        disabled={isSaving}
        className="p-1 rounded bg-emerald-600/80 hover:bg-emerald-600 transition-colors disabled:opacity-50 flex-shrink-0"
        title="Save"
      >
        <Check className="w-4 h-4 text-white" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleCancel()
        }}
        disabled={isSaving}
        className="p-1 rounded bg-slate-700/80 hover:bg-slate-600 transition-colors disabled:opacity-50 flex-shrink-0"
        title="Cancel"
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  )
}

