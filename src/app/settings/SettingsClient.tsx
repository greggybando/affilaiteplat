'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, User, X, LogOut, Mail } from 'lucide-react'
import { ImageCropper } from '@/app/affiliate/components/ImageCropper'

interface SettingsClientProps {
  affiliate: {
    id: string
    name: string
    email: string
    avatar_name: string | null
    avatar_url: string | null
    status: string
  }
}

export function SettingsClient({ affiliate }: SettingsClientProps) {
  const router = useRouter()
  const [avatarName, setAvatarName] = useState(affiliate.avatar_name || '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(affiliate.avatar_url || null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [emailPreferences, setEmailPreferences] = useState({
    notify_replies: true,
    notify_reply_to_comment: true,
    notify_mentions: true,
    notify_likes: false,
    digest_frequency: 'weekly' as 'none' | 'daily' | 'weekly'
  })
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchEmailPreferences()
  }, [])

  const fetchEmailPreferences = async () => {
    try {
      const res = await fetch('/api/email/preferences')
      const data = await res.json()
      if (data.preferences) {
        setEmailPreferences({
          notify_replies: data.preferences.notify_replies ?? true,
          notify_reply_to_comment: data.preferences.notify_reply_to_comment ?? true,
          notify_mentions: data.preferences.notify_mentions ?? true,
          notify_likes: data.preferences.notify_likes ?? false,
          digest_frequency: data.preferences.digest_frequency || 'weekly'
        })
      }
    } catch (error) {
      console.error('Error fetching email preferences:', error)
    }
  }

  const handleEmailPreferencesSave = async () => {
    setSavingEmailPrefs(true)
    try {
      const res = await fetch('/api/email/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPreferences)
      })

      if (!res.ok) throw new Error('Failed to save email preferences')

      setSuccess('Email preferences saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to save email preferences')
      setTimeout(() => setError(''), 3000)
    } finally {
      setSavingEmailPrefs(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('File must be an image')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setSelectedFile(file)
    setError('')

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
    setSuccess('')
    setLoading(true)

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
      if (selectedFile) {
        formData.append('avatarFile', selectedFile)
      }

      const res = await fetch('/api/avatar/update', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setSuccess('Profile updated successfully!')
      setSelectedFile(null)
      // Reload to get updated avatar URL
      setTimeout(() => window.location.reload(), 1000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
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
          setPreviewUrl(affiliate.avatar_url || null)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <h1 className="text-xl font-bold text-white">Platform Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Avatar Name *
              </label>
              <input
                type="text"
                value={avatarName}
                onChange={(e) => {
                  setAvatarName(e.target.value)
                  setError('')
                }}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Choose a unique name (3-20 characters)"
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Letters, numbers, and underscores only.
              </p>
            </div>

            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Avatar preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null)
                        setSelectedFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white cursor-pointer inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {previewUrl ? 'Change' : 'Upload'} Photo
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                </div>
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={affiliate.email}
                disabled
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Subscription Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subscription Status
              </label>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg">
                <span className={`capitalize ${
                  affiliate.status === 'active' ? 'text-green-400' :
                  affiliate.status === 'trial' ? 'text-yellow-400' :
                  'text-red-400'
                } font-medium`}>
                  {affiliate.status}
                </span>
                {affiliate.status === 'expired' || affiliate.status === 'cancelled' ? (
                  <Link
                    href="/resubscribe"
                    className="text-green-400 hover:text-green-300 text-sm font-medium"
                  >
                    Resubscribe →
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors inline-flex items-center"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* Email Preferences Section */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <Mail className="w-5 h-5 text-gray-400" />
              <h2 className="text-2xl font-bold text-white">Email Notifications</h2>
            </div>

            <div className="space-y-4">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-400">Receive email notifications for community activity</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailPreferences.notify_replies || emailPreferences.notify_reply_to_comment || emailPreferences.notify_mentions}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      setEmailPreferences({
                        ...emailPreferences,
                        notify_replies: enabled,
                        notify_reply_to_comment: enabled,
                        notify_mentions: enabled
                      })
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              {/* Individual Notification Types */}
              <div className="space-y-3 pl-4 border-l-2 border-gray-700">
                <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
                  <div>
                    <p className="text-white text-sm font-medium">Replies to my posts</p>
                    <p className="text-xs text-gray-400">Get notified when someone replies to your posts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailPreferences.notify_replies}
                    onChange={(e) => setEmailPreferences({ ...emailPreferences, notify_replies: e.target.checked })}
                    className="w-4 h-4 text-green-500 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
                  <div>
                    <p className="text-white text-sm font-medium">Replies to my comments</p>
                    <p className="text-xs text-gray-400">Get notified when someone replies to your comments</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailPreferences.notify_reply_to_comment}
                    onChange={(e) => setEmailPreferences({ ...emailPreferences, notify_reply_to_comment: e.target.checked })}
                    className="w-4 h-4 text-green-500 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
                  <div>
                    <p className="text-white text-sm font-medium">Mentions</p>
                    <p className="text-xs text-gray-400">Get notified when someone mentions you (@username)</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailPreferences.notify_mentions}
                    onChange={(e) => setEmailPreferences({ ...emailPreferences, notify_mentions: e.target.checked })}
                    className="w-4 h-4 text-green-500 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
                  <div>
                    <p className="text-white text-sm font-medium">Likes</p>
                    <p className="text-xs text-gray-400">Get notified when someone likes your posts (can be noisy)</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailPreferences.notify_likes}
                    onChange={(e) => setEmailPreferences({ ...emailPreferences, notify_likes: e.target.checked })}
                    className="w-4 h-4 text-green-500 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                  />
                </label>
              </div>

              {/* Digest Frequency */}
              <div className="p-4 bg-gray-800 rounded-lg">
                <label className="block text-white text-sm font-medium mb-2">
                  Digest Emails
                </label>
                <select
                  value={emailPreferences.digest_frequency}
                  onChange={(e) => setEmailPreferences({ ...emailPreferences, digest_frequency: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="none">Off</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Receive a summary of community activity
                </p>
              </div>

              <button
                onClick={handleEmailPreferencesSave}
                disabled={savingEmailPrefs}
                className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors"
              >
                {savingEmailPrefs ? 'Saving...' : 'Save Email Preferences'}
              </button>
            </div>
          </div>

          {/* Log Out */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

