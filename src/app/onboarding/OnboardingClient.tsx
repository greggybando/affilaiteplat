'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, User, ArrowRight, Check, X } from 'lucide-react'
import { ImageCropper } from '@/app/affiliate/components/ImageCropper'

interface OnboardingClientProps {
  currentAvatarName?: string | null
  currentAvatarUrl?: string | null
}

export function OnboardingClient({ currentAvatarName, currentAvatarUrl }: OnboardingClientProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [avatarName, setAvatarName] = useState(currentAvatarName || '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleStep2Submit() {
    setError('')
    
    const trimmedName = avatarName.trim()
    if (trimmedName.length < 3 || trimmedName.length > 20) {
      setError('Avatar name must be between 3 and 20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
      setError('Avatar name can only contain letters, numbers, and underscores')
      return
    }

    // Save avatar if provided
    if (trimmedName && (selectedFile || previewUrl)) {
      setLoading(true)
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
          throw new Error(data.error || 'Failed to update avatar')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to update avatar')
        setLoading(false)
        return
      }
    }

    setStep(3)
    setLoading(false)
  }

  async function handleComplete() {
    if (!selectedPath) {
      setError('Please select a starting path')
      return
    }

    setLoading(true)
    try {
      // Mark onboarding as completed
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessLevel: selectedPath === 'affiliate' ? 'affiliate_only' : 'all' }),
      })

      if (!res.ok) {
        throw new Error('Failed to complete onboarding')
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding')
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step > s ? 'bg-green-500' : 'bg-gray-800'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-4">
                Welcome to LifeDesign Platform! 🎉
              </h1>
              <p className="text-gray-400 text-lg mb-8">
                We're excited to have you here. Let's get you set up in just a few steps.
              </p>
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 mx-auto"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Avatar Setup */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Set Up Your Profile</h2>
              <p className="text-gray-400 mb-6">Choose an avatar name and profile picture</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-6">
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
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Letters, numbers, and underscores only. This will be your display name.
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

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStep2Submit}
                    disabled={loading || !avatarName.trim()}
                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors"
                  >
                    {loading ? 'Saving...' : 'Continue'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Choose Path */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Starting Path</h2>
              <p className="text-gray-400 mb-6">
                All paths are available, but choose where you'd like to start:
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm mb-4">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Mindset */}
                <button
                  onClick={() => setSelectedPath('mindset')}
                  className={`p-6 rounded-lg border-2 text-left ${
                    selectedPath === 'mindset'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-4xl mb-3">🧠</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Mindset & Foundations</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Build your mental foundation for success
                  </p>
                  <span className="text-xs text-emerald-400 font-semibold">Active</span>
                </button>

                {/* Dream Job */}
                <button
                  onClick={() => setSelectedPath('dreamjob')}
                  disabled
                  className={`p-6 rounded-lg border-2 text-left ${
                    selectedPath === 'dreamjob'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-4xl mb-3">💼</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Get Your Dream Job</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Land the career you've always wanted
                  </p>
                  <span className="text-xs text-gray-500">Coming Soon</span>
                </button>

                {/* Side Income */}
                <button
                  onClick={() => setSelectedPath('affiliate')}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    selectedPath === 'affiliate'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-4xl mb-3">💰</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Build Your Side Income</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Start earning with our affiliate program
                  </p>
                  <span className="text-xs text-green-400 font-semibold">Active</span>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading || !selectedPath}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Completing...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

