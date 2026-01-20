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
    bio: string | null
    status: string
  }
}

export function SettingsClient({ affiliate }: SettingsClientProps) {
  const router = useRouter()
  const [avatarName, setAvatarName] = useState(affiliate.avatar_name || '')
  const [bio, setBio] = useState(affiliate.bio || '')
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
      formData.append('bio', bio.trim())
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
    <div className="min-h-screen bg-[#0f0f1a] relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[rgba(6,182,212,0.3)] bg-[rgba(15,15,26,0.8)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-[rgba(6,182,212,0.1)] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-cyan-400" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Platform Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[rgba(26,26,46,0.8)] backdrop-blur-[10px] rounded-xl border border-[rgba(6,182,212,0.3)] p-8" style={{ boxShadow: '0 0 30px rgba(6,182,212,0.2), 0 8px 32px rgba(0,0,0,0.8)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 rounded-xl pointer-events-none"></div>
          <div className="relative z-10">
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
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  Avatar Name *
                </label>
                <input
                  type="text"
                  value={avatarName}
                  onChange={(e) => {
                    setAvatarName(e.target.value)
                    setError('')
                  }}
                  className="w-full px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.3)] rounded-lg text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                  placeholder="Choose a unique name (3-20 characters)"
                  maxLength={20}
                  required
                />
                <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">
                  Letters, numbers, and underscores only.
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value)
                    setError('')
                  }}
                  className="w-full px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.3)] rounded-lg text-white placeholder-[rgba(255,255,255,0.4)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all resize-none"
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={200}
                />
                <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">
                  {bio.length}/200 characters
                </p>
              </div>

              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Avatar preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500/50"
                        style={{ boxShadow: '0 0 20px rgba(6,182,212,0.5)' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl(null)
                          setSelectedFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 border-2 border-cyan-500/50 flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
                      <User className="w-12 h-12 text-white" />
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
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 border border-cyan-400/50 rounded-lg text-white cursor-pointer inline-flex items-center gap-2 transition-all shadow-lg"
                      style={{ boxShadow: '0 0 15px rgba(6,182,212,0.4)' }}
                    >
                      <Upload className="w-4 h-4" />
                      {previewUrl ? 'Change' : 'Upload'} Photo
                    </label>
                    <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">Max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={affiliate.email}
                  disabled
                  className="w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(6,182,212,0.2)] rounded-lg text-[rgba(255,255,255,0.5)] cursor-not-allowed"
                />
                <p className="text-xs text-[rgba(255,255,255,0.5)] mt-1">Email cannot be changed</p>
              </div>

              {/* Subscription Status */}
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  Subscription Status
                </label>
                <div className="flex items-center justify-between px-4 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.3)] rounded-lg">
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
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
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
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-cyan-500/50 disabled:to-blue-500/50 text-white font-semibold rounded-lg transition-all shadow-lg"
                  style={{ boxShadow: loading ? 'none' : '0 0 20px rgba(6,182,212,0.5)' }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  href="/dashboard"
                  className="px-6 py-3 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] border border-[rgba(6,182,212,0.3)] text-white font-semibold rounded-lg transition-colors inline-flex items-center"
                >
                  Cancel
                </Link>
              </div>
            </form>

            {/* Email Preferences Section */}
            <div className="mt-8 pt-8 border-t border-[rgba(6,182,212,0.3)]">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                  <Mail className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Email Notifications</h2>
              </div>

              <div className="space-y-4">
                {/* Master Toggle */}
                <div className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.3)] rounded-lg">
                  <div>
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-sm text-[rgba(255,255,255,0.6)]">Receive email notifications for community activity</p>
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
                    <div className="w-11 h-6 bg-[rgba(255,255,255,0.1)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-500"></div>
                  </label>
                </div>

                {/* Individual Notification Types */}
                <div className="space-y-3 pl-4 border-l-2 border-[rgba(6,182,212,0.3)]">
                  <label className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.2)] rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                    <div>
                      <p className="text-white text-sm font-medium">Replies to my posts</p>
                      <p className="text-xs text-[rgba(255,255,255,0.6)]">Get notified when someone replies to your posts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailPreferences.notify_replies}
                      onChange={(e) => setEmailPreferences({ ...emailPreferences, notify_replies: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-[rgba(255,255,255,0.1)] border-[rgba(6,182,212,0.3)] rounded focus:ring-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.2)] rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                    <div>
                      <p className="text-white text-sm font-medium">Replies to my comments</p>
                      <p className="text-xs text-[rgba(255,255,255,0.6)]">Get notified when someone replies to your comments</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailPreferences.notify_reply_to_comment}
                      onChange={(e) => setEmailPreferences({ ...emailPreferences, notify_reply_to_comment: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-[rgba(255,255,255,0.1)] border-[rgba(6,182,212,0.3)] rounded focus:ring-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.2)] rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                    <div>
                      <p className="text-white text-sm font-medium">Mentions</p>
                      <p className="text-xs text-[rgba(255,255,255,0.6)]">Get notified when someone mentions you (@username)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailPreferences.notify_mentions}
                      onChange={(e) => setEmailPreferences({ ...emailPreferences, notify_mentions: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-[rgba(255,255,255,0.1)] border-[rgba(6,182,212,0.3)] rounded focus:ring-cyan-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.2)] rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                    <div>
                      <p className="text-white text-sm font-medium">Likes</p>
                      <p className="text-xs text-[rgba(255,255,255,0.6)]">Get notified when someone likes your posts (can be noisy)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailPreferences.notify_likes}
                      onChange={(e) => setEmailPreferences({ ...emailPreferences, notify_likes: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-[rgba(255,255,255,0.1)] border-[rgba(6,182,212,0.3)] rounded focus:ring-cyan-500"
                    />
                  </label>
                </div>

                {/* Digest Frequency */}
                <div className="p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.3)] rounded-lg">
                  <label className="block text-white text-sm font-medium mb-2">
                    Digest Emails
                  </label>
                  <select
                    value={emailPreferences.digest_frequency}
                    onChange={(e) => setEmailPreferences({ ...emailPreferences, digest_frequency: e.target.value as any })}
                    className="w-full px-4 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(6,182,212,0.3)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                  >
                    <option value="none">Off</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <p className="text-xs text-[rgba(255,255,255,0.6)] mt-1">
                    Receive a summary of community activity
                  </p>
                </div>

                <button
                  onClick={handleEmailPreferencesSave}
                  disabled={savingEmailPrefs}
                  className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-cyan-500/50 disabled:to-blue-500/50 text-white font-semibold rounded-lg transition-all shadow-lg"
                  style={{ boxShadow: savingEmailPrefs ? 'none' : '0 0 20px rgba(6,182,212,0.5)' }}
                >
                  {savingEmailPrefs ? 'Saving...' : 'Save Email Preferences'}
                </button>
              </div>
            </div>

            {/* Log Out */}
            <div className="mt-8 pt-8 border-t border-[rgba(6,182,212,0.3)]">
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

