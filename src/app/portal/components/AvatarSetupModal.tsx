'use client'

import { useState, useRef } from 'react'
import { X, Upload, User } from 'lucide-react'
import { ImageCropper } from './ImageCropper'

interface AvatarSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentAvatarName?: string | null
  currentAvatarUrl?: string | null
  currentSignature?: string | null
}

export function AvatarSetupModal({
  isOpen,
  onClose,
  onSuccess,
  currentAvatarName,
  currentAvatarUrl,
  currentSignature,
}: AvatarSetupModalProps) {
  const [avatarName, setAvatarName] = useState(currentAvatarName || '')
  const [signature, setSignature] = useState(currentSignature || '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File must be an image')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setSelectedFile(file)
    setError('')

    // Create preview and show cropper
    const reader = new FileReader()
    reader.onloadend = () => {
      const imageUrl = reader.result as string
      setOriginalImageUrl(imageUrl)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
  }

  async function handleCropComplete(croppedImage: string) {
    setPreviewUrl(croppedImage)
    setShowCropper(false)
    setError('')
    // Convert data URL back to File for upload
    try {
      const response = await fetch(croppedImage)
      const blob = await response.blob()
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      setSelectedFile(file)
    } catch (err) {
      console.error('Error converting cropped image to file:', err)
      setError('Failed to process cropped image. Please try again.')
      setShowCropper(true)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate avatar name
    const trimmedName = avatarName.trim()
    if (trimmedName.length < 3 || trimmedName.length > 20) {
      setError('Avatar name must be between 3 and 20 characters')
      setLoading(false)
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
      setError('Avatar name can only contain letters, numbers, and underscores')
      setLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('avatarName', trimmedName)
      formData.append('signature', signature.trim())
      if (selectedFile) {
        formData.append('avatarFile', selectedFile)
      }

      const res = await fetch('/api/avatar/update', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update avatar')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update avatar')
    } finally {
      setLoading(false)
    }
  }

  if (showCropper && originalImageUrl) {
    return (
      <ImageCropper
        image={originalImageUrl}
        onCropComplete={handleCropComplete}
        onCancel={() => {
          setShowCropper(false)
          setOriginalImageUrl(null)
          setSelectedFile(null)
          setPreviewUrl(currentAvatarUrl || null)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">
          {currentAvatarName ? 'Edit Profile' : 'Set Up Your Avatar'}
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          {currentAvatarName
            ? 'Update your avatar name and profile picture'
            : 'Choose an avatar name and optional profile picture to get started'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Preview/Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-600" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              {selectedFile ? 'Change Picture' : 'Upload Picture (Optional)'}
            </button>
            {selectedFile && (
              <p className="text-xs text-gray-500">{selectedFile.name}</p>
            )}
          </div>

          {/* Avatar Name Input */}
          <div>
            <label htmlFor="avatarName" className="block text-sm font-medium text-gray-300 mb-2">
              Avatar Name <span className="text-red-400">*</span>
            </label>
            <input
              id="avatarName"
              type="text"
              value={avatarName}
              onChange={(e) => {
                setAvatarName(e.target.value)
                setError('')
              }}
              placeholder="Enter avatar name (3-20 characters)"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
            />
            <p className="text-xs text-gray-500 mt-1">
              Letters, numbers, and underscores only. Must be unique.
            </p>
          </div>

          {/* Signature Input */}
          <div>
            <label htmlFor="signature" className="block text-sm font-medium text-gray-300 mb-2">
              Signature (Quote/Saying)
            </label>
            <textarea
              id="signature"
              value={signature}
              onChange={(e) => {
                setSignature(e.target.value)
                setError('')
              }}
              placeholder="Enter a quote or saying that will appear on the leaderboard (optional)"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              This will appear as your signature on the leaderboard. Max 200 characters.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !avatarName.trim()}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : currentAvatarName ? 'Update Profile' : 'Save Avatar'}
            </button>
            {currentAvatarName && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

