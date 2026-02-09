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
    }
  }, [isEditing])

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
    <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        disabled={isSaving}
        className={`bg-slate-800/80 border border-cyan-500/50 rounded px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 flex-1 min-w-0 ${className}`}
        style={{
          ...style,
          minWidth: '200px',
          width: '100%',
          maxWidth: 'none',
          flex: '1 1 auto',
          boxShadow: '0 0 10px rgba(34, 211, 238, 0.3)',
          overflow: 'visible',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          overflowWrap: 'anywhere'
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

