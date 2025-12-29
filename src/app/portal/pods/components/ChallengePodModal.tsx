'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Search } from 'lucide-react'
import { getWeightClassBadgeColor, getWeightClassIcon } from '@/lib/pod-battles'

type Pod = {
  id: string
  name: string
  weightClass: {
    level: number
    name: string
    sales: number
  }
}

type Product = {
  id: string
  name: string
  slug: string
}

interface ChallengePodModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentPodId: string
  currentWeightClass: { level: number; name: string; sales: number } | null
}

export function ChallengePodModal({
  isOpen,
  onClose,
  onSuccess,
  currentPodId,
  currentWeightClass,
}: ChallengePodModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Pod[]>([])
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [durationDays, setDurationDays] = useState<number>(7)
  const [prizeType, setPrizeType] = useState<'bragging_rights' | 'commission_boost' | 'member_steal'>('bragging_rights')
  const [trashTalk, setTrashTalk] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchProducts()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeout = setTimeout(() => {
        searchPods()
      }, 300)
      return () => clearTimeout(timeout)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }, [searchQuery])

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data.products || [])
      if (data.products && data.products.length > 0) {
        setSelectedProduct(data.products[0].id)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  async function searchPods() {
    try {
      const res = await fetch(`/api/pods/battles/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.pods || [])
      setShowDropdown((data.pods || []).length > 0)
    } catch (error) {
      console.error('Error searching pods:', error)
    }
  }

  async function sendChallenge() {
    if (!selectedPod || !selectedProduct) {
      alert('Please select a pod and product')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/pods/battles/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defenderPodId: selectedPod.id,
          productId: selectedProduct,
          durationDays,
          prizeType,
          trashTalk: trashTalk.trim() || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        onSuccess()
      } else {
        alert(data.error || 'Failed to send challenge')
      }
    } catch (error) {
      console.error('Error sending challenge:', error)
      alert('Failed to send challenge')
    } finally {
      setLoading(false)
    }
  }

  const classDifference = selectedPod && currentWeightClass
    ? selectedPod.weightClass.level - currentWeightClass.level
    : 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-lg w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-6">Challenge a Pod</h3>

        <div className="space-y-4">
          {/* Pod Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Pod
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.length >= 2) {
                    setShowDropdown(true)
                  }
                }}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowDropdown(true)
                  }
                }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Type pod name..."
              />
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto shadow-lg">
                {searchResults.map((pod) => (
                  <button
                    key={pod.id}
                    type="button"
                    onClick={() => {
                      setSelectedPod(pod)
                      setSearchQuery(pod.name)
                      setShowDropdown(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{pod.name}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs border ${getWeightClassBadgeColor(
                          pod.weightClass.level
                        )}`}
                      >
                        {getWeightClassIcon(pod.weightClass.level)} {pod.weightClass.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Pod Warning */}
          {selectedPod && classDifference > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium text-sm">
                  This pod is {classDifference} level{classDifference > 1 ? 's' : ''} above yours
                </p>
                <p className="text-yellow-300/70 text-xs mt-1">
                  Are you sure you want to challenge them?
                </p>
              </div>
            </div>
          )}

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product to Compete On
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Battle Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[7, 14, 30, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    durationDays === days
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          {/* Prize Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prize
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPrizeType('bragging_rights')}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                  prizeType === 'bragging_rights'
                    ? 'bg-green-500/20 border-2 border-green-500'
                    : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
                }`}
              >
                <p className="text-white font-medium">Bragging Rights</p>
                <p className="text-xs text-gray-400">Winner gets bragging rights</p>
              </button>
              <button
                type="button"
                onClick={() => setPrizeType('commission_boost')}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                  prizeType === 'commission_boost'
                    ? 'bg-green-500/20 border-2 border-green-500'
                    : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
                }`}
              >
                <p className="text-white font-medium">+10% Commission Boost</p>
                <p className="text-xs text-gray-400">All winning pod members get +10% commission for 1 week</p>
              </button>
              <button
                type="button"
                onClick={() => setPrizeType('member_steal')}
                className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                  prizeType === 'member_steal'
                    ? 'bg-green-500/20 border-2 border-green-500'
                    : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
                }`}
              >
                <p className="text-white font-medium">Winner Takes a Pick</p>
                <p className="text-xs text-gray-400">Winner can recruit ONE member (if win margin &gt; 20%)</p>
              </button>
            </div>
          </div>

          {/* Trash Talk */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trash Talk (Optional)
            </label>
            <textarea
              value={trashTalk}
              onChange={(e) => setTrashTalk(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Send a message to your opponent..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{trashTalk.length}/500</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={sendChallenge}
              disabled={loading || !selectedPod || !selectedProduct}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Send Challenge'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

