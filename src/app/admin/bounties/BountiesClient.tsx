'use client'

import { useState, useEffect } from 'react'

interface Pod {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
}

interface Bounty {
  id: string
  target_pod: { id: string; name: string } | null
  product: { id: string; name: string } | null
  reward_amount_cents: number
  reward_type: 'cash' | 'commission_boost'
  description: string | null
  status: 'active' | 'claimed' | 'expired'
  claimed_by_pod: { id: string; name: string } | null
  expires_at: string | null
  created_at: string
}

export function BountiesClient({
  pods,
  products,
  initialBounties,
}: {
  pods: Pod[]
  products: Product[]
  initialBounties: Bounty[]
}) {
  const [bounties, setBounties] = useState<Bounty[]>(initialBounties)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    targetPodId: '',
    productId: '',
    rewardAmountCents: '',
    rewardType: 'cash' as 'cash' | 'commission_boost',
    description: '',
    expiresAt: '',
  })

  async function fetchBounties() {
    try {
      const res = await fetch('/api/admin/bounties')
      const data = await res.json()
      if (res.ok) {
        setBounties(data.bounties || [])
      }
    } catch (err) {
      console.error('Error fetching bounties:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Validate form
      if (!formData.targetPodId || !formData.productId || !formData.rewardAmountCents || !formData.expiresAt) {
        setError('All fields are required')
        setLoading(false)
        return
      }

      const rewardAmountCents = parseInt(formData.rewardAmountCents)
      if (isNaN(rewardAmountCents) || rewardAmountCents <= 0) {
        setError('Reward amount must be a positive number')
        setLoading(false)
        return
      }

      const res = await fetch('/api/admin/bounties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPodId: formData.targetPodId,
          productId: formData.productId,
          rewardAmountCents,
          rewardType: formData.rewardType,
          description: formData.description || null,
          expiresAt: formData.expiresAt,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create bounty')
      }

      setSuccess('Bounty created successfully!')
      setFormData({
        targetPodId: '',
        productId: '',
        rewardAmountCents: '',
        rewardType: 'cash',
        description: '',
        expiresAt: '',
      })
      setShowCreateForm(false)
      fetchBounties()
    } catch (err: any) {
      setError(err.message || 'Failed to create bounty')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      claimed: 'bg-blue-500/20 text-blue-400',
      expired: 'bg-gray-500/20 text-gray-400',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.expired}`}>
        {status}
      </span>
    )
  }

  return (
    <div>
      {/* Create Bounty Section */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Create New Bounty</h2>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm)
              setError('')
              setSuccess('')
            }}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
          >
            {showCreateForm ? 'Cancel' : 'New Bounty'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
                {success}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Target Pod *</label>
                <select
                  value={formData.targetPodId}
                  onChange={(e) => setFormData({ ...formData, targetPodId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select a pod</option>
                  {pods.map((pod) => (
                    <option key={pod.id} value={pod.id}>
                      {pod.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Product *</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Reward Amount (cents) *</label>
                <input
                  type="number"
                  value={formData.rewardAmountCents}
                  onChange={(e) => setFormData({ ...formData, rewardAmountCents: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="5000 (for $50.00)"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Reward Type *</label>
                <select
                  value={formData.rewardType}
                  onChange={(e) => setFormData({ ...formData, rewardType: e.target.value as 'cash' | 'commission_boost' })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="commission_boost">Commission Boost</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows={3}
                placeholder="Optional description for the bounty"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Expires At *</label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Bounty'}
            </button>
          </form>
        )}
      </section>

      {/* Bounties List */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">All Bounties</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Target Pod</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Product</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Reward</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Claimed By</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Expires</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody>
              {bounties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    No bounties yet
                  </td>
                </tr>
              ) : (
                bounties.map((bounty) => (
                  <tr key={bounty.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-3 px-4 text-white">{bounty.target_pod?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-white">{bounty.product?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-right text-white">
                      ${(bounty.reward_amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-gray-300 capitalize">{bounty.reward_type.replace('_', ' ')}</td>
                    <td className="py-3 px-4">{getStatusBadge(bounty.status)}</td>
                    <td className="py-3 px-4 text-gray-300">
                      {bounty.claimed_by_pod?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {bounty.expires_at
                        ? new Date(bounty.expires_at).toLocaleDateString()
                        : 'No expiry'}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(bounty.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

