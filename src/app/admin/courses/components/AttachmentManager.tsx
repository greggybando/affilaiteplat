'use client'

import { useState, useEffect } from 'react'
import { Upload, X, File, Download, Trash2, Loader2 } from 'lucide-react'

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  display_name: string | null
  display_order: number
}

interface AttachmentManagerProps {
  parentId: string
  parentType: 'video_id' | 'section_id' | 'category_id'
  courseType: 'mindset' | 'dreamjob' | 'affiliate'
  onClose: () => void
}

export function AttachmentManager({ parentId, parentType, courseType, onClose }: AttachmentManagerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    loadAttachments()
  }, [parentId, parentType, courseType])

  const loadAttachments = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/courses/attachments?parentId=${parentId}&parentType=${parentType}&courseType=${courseType}`
      )
      const data = await res.json()
      setAttachments(data.attachments || [])
    } catch (error) {
      console.error('Error loading attachments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!displayName) {
        setDisplayName(selectedFile.name)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('parentId', parentId)
      formData.append('parentType', parentType)
      formData.append('courseType', courseType)
      if (displayName) {
        formData.append('displayName', displayName)
      }

      const res = await fetch('/api/admin/courses/attachments', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await res.json()
      setAttachments([...attachments, data.attachment])
      setFile(null)
      setDisplayName('')
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error: any) {
      alert(error.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    try {
      const res = await fetch('/api/admin/courses/attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId })
      })

      if (!res.ok) throw new Error('Delete failed')

      setAttachments(attachments.filter(a => a.id !== attachmentId))
    } catch (error: any) {
      alert(error.message || 'Failed to delete attachment')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('zip') || fileType.includes('compressed')) return '📦'
    return '📎'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Manage Attachments</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Upload Section */}
        <div className="p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload File
              </label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.zip"
              />
            </div>
            {file && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={file.name}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            )}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload File
                </>
              )}
            </button>
          </div>
        </div>

        {/* Attachments List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading attachments...</div>
          ) : attachments.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No attachments yet</div>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{getFileIcon(attachment.file_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {attachment.display_name || attachment.file_name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatFileSize(attachment.file_size)} • {attachment.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


