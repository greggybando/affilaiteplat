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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
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
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(40, textareaRef.current.scrollHeight)}px`
    }
  }, [isEditing])

  // Auto-resize textarea on input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.max(40, e.target.scrollHeight)}px`
  }

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
    <div className="flex items-start gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={handleInput}
        onKeyDown={(e) => {
          // Allow Enter to create new line, but Ctrl/Cmd+Enter to save
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleSave()
          } else if (e.key === 'Escape') {
            handleCancel()
          }
        }}
        onClick={(e) => e.stopPropagation()}
        disabled={isSaving}
        rows={1}
        className={`bg-slate-800/80 border border-cyan-500/50 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none overflow-hidden w-full ${className}`}
        style={{
          ...style,
          minHeight: '40px',
          maxHeight: '200px',
          boxShadow: '0 0 10px rgba(34, 211, 238, 0.3)',
          overflowY: 'auto',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          lineHeight: '1.5'
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

