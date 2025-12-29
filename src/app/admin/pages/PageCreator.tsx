'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  name: string
  slug: string
}

export function PageCreator({ products }: { products: Product[] }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)
    const data = {
      product_id: formData.get('product_id'),
      name: formData.get('name'),
      slug: formData.get('slug'),
      variant_name: formData.get('variant_name') || null,
      meta_title: formData.get('meta_title') || null,
      meta_description: formData.get('meta_description') || null,
      content: formData.get('content'),
    }

    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create page')
      }

      setSuccess('Landing page created successfully!')
      router.refresh()
      
      // Reset form
      e.currentTarget.reset()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product *
            </label>
            <select
              name="product_id"
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Page Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Page Name (internal) *
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., Main Sales Page"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL Slug *
            </label>
            <input
              type="text"
              name="slug"
              required
              pattern="[a-z0-9-]+"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., main"
            />
            <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and dashes only</p>
          </div>

          {/* Variant Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Variant Name (optional)
            </label>
            <input
              type="text"
              name="variant_name"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., urgency, social-proof"
            />
          </div>

          {/* Meta Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Meta Title
            </label>
            <input
              type="text"
              name="meta_title"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Page title for SEO"
            />
          </div>

          {/* Meta Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Meta Description
            </label>
            <textarea
              name="meta_description"
              rows={2}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Page description for SEO"
            />
          </div>
        </div>

        {/* Right Column - Content */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Page Content (HTML) *
          </label>
          <textarea
            name="content"
            required
            rows={20}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm resize-none"
            placeholder="Paste your Claude-generated HTML here..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Available placeholders: {'{{PRODUCT_NAME}}'}, {'{{PRODUCT_PRICE}}'}, {'{{STRIPE_PRICE_ID}}'}, {'{{AFF_CODE}}'}, {'{{VISITOR_ID}}'}
          </p>
        </div>
      </div>

      {/* Error/Success */}
      {error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-6 bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Submit */}
      <div className="mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold rounded-lg transition-colors"
        >
          {isLoading ? 'Creating...' : 'Create Landing Page'}
        </button>
      </div>
    </form>
  )
}
