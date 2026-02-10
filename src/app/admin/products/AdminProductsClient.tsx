// src/app/admin/products/AdminProductsClient.tsx
// Admin panel for managing products. Create, edit, activate, archive.
// Auto-creates Stripe products/prices on save.

'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price_cents: number
  price_display: string
  commission_percent: number
  commission_fixed_cents: number
  status: string
  headline: string | null
  subheadline: string | null
  bullets: string[]
  sales_body: string | null
  short_description: string | null
  thumbnail_url: string | null
  delivery_url: string | null
  delivery_type: string
  upsell_priority: number
  cta_text: string
  guarantee_text: string | null
  product_type: string
  stripe_product_id: string | null
  stripe_price_id: string | null
  created_at: string
}

const emptyProduct = {
  name: '',
  slug: '',
  description: '',
  price_cents: 4700,
  price_display: '$47',
  commission_percent: 30,
  commission_fixed_cents: 0,
  status: 'draft',
  headline: '',
  subheadline: '',
  bullets: [''],
  sales_body: '',
  short_description: '',
  thumbnail_url: '',
  delivery_url: '',
  delivery_type: 'redirect',
  upsell_priority: 0,
  cta_text: 'Get Instant Access',
  guarantee_text: '30-day money-back guarantee',
  product_type: 'one_time',
}

export default function AdminProductsClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<any>(emptyProduct)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/products')
    const data = await res.json()
    setProducts(data.products || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          bullets: form.bullets.filter((b: string) => b.trim()),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(`Error: ${data.error}`)
      } else {
        setMessage('Product created! Stripe product & price auto-generated.')
        setCreating(false)
        setForm(emptyProduct)
        fetchProducts()
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    setSaving(true)
    setMessage('')

    try {
      const res = await fetch(`/api/admin/products/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          bullets: form.bullets.filter((b: string) => b.trim()),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(`Error: ${data.error}`)
      } else {
        setMessage('Product updated!')
        setEditing(null)
        setForm(emptyProduct)
        fetchProducts()
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this product? It will be hidden from sales pages and affiliate links.')) return

    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMessage('Product archived')
      fetchProducts()
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      fetchProducts()
    }
  }

  const startEdit = (product: Product) => {
    setEditing(product)
    setCreating(false)
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price_cents: product.price_cents,
      price_display: product.price_display,
      commission_percent: product.commission_percent,
      commission_fixed_cents: product.commission_fixed_cents,
      status: product.status,
      headline: product.headline || '',
      subheadline: product.subheadline || '',
      bullets: product.bullets?.length ? product.bullets : [''],
      sales_body: product.sales_body || '',
      short_description: product.short_description || '',
      thumbnail_url: product.thumbnail_url || '',
      delivery_url: product.delivery_url || '',
      delivery_type: product.delivery_type || 'redirect',
      upsell_priority: product.upsell_priority,
      cta_text: product.cta_text || 'Get Instant Access',
      guarantee_text: product.guarantee_text || '',
      product_type: product.product_type || 'one_time',
    })
  }

  const startCreate = () => {
    setCreating(true)
    setEditing(null)
    setForm(emptyProduct)
  }

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const filteredProducts = filter === 'all'
    ? products
    : products.filter(p => p.status === filter)

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4ade80'
      case 'draft': return '#f5c542'
      case 'archived': return '#888'
      default: return '#888'
    }
  }

  // ===== FORM UI =====
  const renderForm = () => (
    <div 
      className="rounded-xl p-6 relative overflow-hidden mb-6"
      style={{
        background: 'rgba(26,26,46,0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(6,182,212,0.2)',
        boxShadow: '0 0 20px rgba(6,182,212,0.1), 0 8px 32px rgba(0,0,0,0.8)'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
      <div className="relative z-10">
      <h2 className="text-xl font-semibold text-white mb-6">
        {editing ? `Edit: ${editing.name}` : 'Create New Product'}
      </h2>

      {message && (
        <div 
          className="p-3 rounded-lg mb-4 text-sm"
          style={{
            background: message.startsWith('Error') ? 'rgba(90,32,32,0.3)' : 'rgba(10,50,10,0.3)',
            border: message.startsWith('Error') ? '1px solid rgba(255,107,107,0.3)' : '1px solid rgba(74,222,128,0.3)',
            color: message.startsWith('Error') ? '#ff6b6b' : '#4ade80',
          }}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label style={labelStyle}>Product Name *</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => {
              const name = e.target.value
              setForm((f: any) => ({
                ...f,
                name,
                ...(!editing ? { slug: autoSlug(name) } : {}),
              }))
            }}
            placeholder="Psychology of the Super Charismatic"
          />
        </div>

        {/* Slug */}
        <div>
          <label style={labelStyle}>URL Slug * {editing && <span style={{ color: '#888' }}>(cannot change)</span>}</label>
          <input
            style={{ ...inputStyle, ...(editing ? { opacity: 0.5 } : {}) }}
            value={form.slug}
            onChange={(e) => setForm((f: any) => ({ ...f, slug: e.target.value }))}
            disabled={!!editing}
            placeholder="charisma"
          />
          <p className="text-xs text-slate-400 mt-2">
            Sales page: /p/{form.slug || 'slug'}
          </p>
        </div>

        {/* Price */}
        <div>
          <label style={labelStyle}>Price (cents) *</label>
          <input
            style={inputStyle}
            type="number"
            value={form.price_cents}
            onChange={(e) => {
              const cents = parseInt(e.target.value) || 0
              setForm((f: any) => ({
                ...f,
                price_cents: cents,
                price_display: `$${(cents / 100).toFixed(0)}`,
              }))
            }}
            placeholder="4700"
          />
          <p className="text-xs text-slate-400 mt-2">
            Display: {form.price_display}
          </p>
        </div>

        {/* Commission */}
        <div>
          <label style={labelStyle}>Commission %</label>
          <input
            style={inputStyle}
            type="number"
            value={form.commission_percent}
            onChange={(e) => setForm((f: any) => ({ ...f, commission_percent: parseFloat(e.target.value) || 0 }))}
            placeholder="30"
          />
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <select
            style={inputStyle}
            value={form.status}
            onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}
          >
            <option value="draft">Draft (only you can see)</option>
            <option value="active">Active (live for sales)</option>
            <option value="archived">Archived (hidden)</option>
          </select>
        </div>

        {/* Upsell Priority */}
        <div>
          <label style={labelStyle}>Upsell Priority (lower = shown first)</label>
          <input
            style={inputStyle}
            type="number"
            value={form.upsell_priority}
            onChange={(e) => setForm((f: any) => ({ ...f, upsell_priority: parseInt(e.target.value) || 0 }))}
            placeholder="0"
          />
        </div>
      </div>

      {/* Sales Page Content */}
      <h3 className="text-base font-semibold mt-6 mb-4 text-cyan-400">
        Sales Page Content
      </h3>

      <div>
        <label style={labelStyle}>Headline</label>
        <input
          style={inputStyle}
          value={form.headline}
          onChange={(e) => setForm((f: any) => ({ ...f, headline: e.target.value }))}
          placeholder="The hidden psychology behind instant charisma..."
        />
      </div>

      <div className="mt-3">
        <label style={labelStyle}>Subheadline</label>
        <input
          style={inputStyle}
          value={form.subheadline}
          onChange={(e) => setForm((f: any) => ({ ...f, subheadline: e.target.value }))}
          placeholder="Learn the exact frameworks that make people magnetic"
        />
      </div>

      <div className="mt-3">
        <label style={labelStyle}>Bullets (one per line)</label>
        {form.bullets.map((bullet: string, i: number) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={bullet}
              onChange={(e) => {
                const newBullets = [...form.bullets]
                newBullets[i] = e.target.value
                setForm((f: any) => ({ ...f, bullets: newBullets }))
              }}
              placeholder={`Benefit ${i + 1}`}
            />
            {form.bullets.length > 1 && (
              <button
                onClick={() => {
                  const newBullets = form.bullets.filter((_: any, idx: number) => idx !== i)
                  setForm((f: any) => ({ ...f, bullets: newBullets }))
                }}
                className="px-3 py-2 rounded-lg text-red-400 border border-red-400/30 bg-red-400/10 hover:bg-red-400/20 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setForm((f: any) => ({ ...f, bullets: [...f.bullets, ''] }))}
          className="px-3 py-1.5 rounded-lg text-cyan-400 border border-cyan-400/30 bg-cyan-400/10 hover:bg-cyan-400/20 transition-colors text-sm"
        >
          + Add Bullet
        </button>
      </div>

      <div className="mt-3">
        <label style={labelStyle}>Short Description (for upsell shop card)</label>
        <input
          style={inputStyle}
          value={form.short_description}
          onChange={(e) => setForm((f: any) => ({ ...f, short_description: e.target.value }))}
          placeholder="Master the art of instant connection and influence"
        />
      </div>

      <div className="mt-3">
        <label style={labelStyle}>Sales Body (HTML or markdown for long-form copy)</label>
        <textarea
          style={{ ...inputStyle, minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
          value={form.sales_body}
          onChange={(e) => setForm((f: any) => ({ ...f, sales_body: e.target.value }))}
          placeholder="<p>Your long-form sales copy goes here...</p>"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <label style={labelStyle}>CTA Button Text</label>
          <input
            style={inputStyle}
            value={form.cta_text}
            onChange={(e) => setForm((f: any) => ({ ...f, cta_text: e.target.value }))}
            placeholder="Get Instant Access"
          />
        </div>
        <div>
          <label style={labelStyle}>Guarantee Text</label>
          <input
            style={inputStyle}
            value={form.guarantee_text}
            onChange={(e) => setForm((f: any) => ({ ...f, guarantee_text: e.target.value }))}
            placeholder="30-day money-back guarantee"
          />
        </div>
        <div>
          <label style={labelStyle}>Thumbnail URL</label>
          <input
            style={inputStyle}
            value={form.thumbnail_url}
            onChange={(e) => setForm((f: any) => ({ ...f, thumbnail_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        <div>
          <label style={labelStyle}>Delivery URL (where buyer goes after purchase)</label>
          <input
            style={inputStyle}
            value={form.delivery_url}
            onChange={(e) => setForm((f: any) => ({ ...f, delivery_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={editing ? handleUpdate : handleCreate}
          disabled={saving || !form.name || !form.slug || !form.price_cents}
          className="px-8 py-3 rounded-lg font-bold text-base transition-all transform hover:scale-[1.02] relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: saving ? 'rgba(85,85,85,0.5)' : 'linear-gradient(135deg, #22d3ee, #06b6d4)',
            color: saving ? 'rgba(255,255,255,0.5)' : '#0f0f1a',
            boxShadow: saving ? 'none' : '0 0 20px rgba(34,211,238,0.5), 0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <span className="relative z-10">
            {saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
          </span>
          {!saving && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
          )}
        </button>

        <button
          onClick={() => { setEditing(null); setCreating(false); setForm(emptyProduct); setMessage('') }}
          className="px-6 py-3 rounded-lg text-base border transition-colors"
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            borderColor: 'rgba(6,182,212,0.2)',
          }}
        >
          Cancel
        </button>
      </div>
      </div>
    </div>
  )

  // ===== MAIN RENDER =====
  return (
    <div className="mt-6">
      {/* Header */}
      <div 
        className="rounded-xl p-6 relative overflow-hidden mb-6"
        style={{
          background: 'rgba(26,26,46,0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(6,182,212,0.2)',
          boxShadow: '0 0 20px rgba(6,182,212,0.1), 0 8px 32px rgba(0,0,0,0.8)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Product Manager</h2>
            <p className="text-sm text-slate-400">
              Create products here → sales pages, affiliate links, and upsell shop auto-populate
            </p>
          </div>
          {!creating && !editing && (
            <button
              onClick={startCreate}
              className="px-6 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-[1.02] relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                color: '#0f0f1a',
                boxShadow: '0 0 20px rgba(34,211,238,0.5), 0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <span className="relative z-10">+ New Product</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </button>
          )}
        </div>
      </div>

        {/* Form */}
        {(creating || editing) && renderForm()}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {['all', 'active', 'draft', 'archived'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-lg text-sm capitalize transition-colors"
              style={{
                background: filter === f ? 'rgba(6,182,212,0.2)' : 'transparent',
                color: filter === f ? '#fff' : 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(6,182,212,0.2)',
              }}
            >
              {f} ({f === 'all' ? products.length : products.filter(p => p.status === f).length})
            </button>
          ))}
        </div>

        {/* Products list */}
        {loading ? (
          <div 
            className="rounded-xl p-6 text-center"
            style={{
              background: 'rgba(26,26,46,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(6,182,212,0.2)',
            }}
          >
            <p className="text-slate-400">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div 
            className="rounded-xl p-12 text-center"
            style={{
              background: 'rgba(26,26,46,0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(6,182,212,0.2)',
            }}
          >
            <p className="text-lg text-white mb-2">No products yet</p>
            <p className="text-sm text-slate-400">Create your first product to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="rounded-xl p-4 relative overflow-hidden flex items-center gap-4"
                style={{
                  background: 'rgba(26,26,46,0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.1), 0 8px 32px rgba(0,0,0,0.8)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-4 flex-1">
                  {/* Status dot */}
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: statusColor(product.status) }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{product.name}</span>
                      <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
                        /p/{product.slug}
                      </span>
                    </div>
                    <div className="text-sm text-slate-400 flex gap-4">
                      <span>{product.price_display}</span>
                      <span>{product.commission_percent}% commission</span>
                      <span>Priority: {product.upsell_priority}</span>
                      {product.stripe_price_id && <span className="text-green-400">✓ Stripe</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {product.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(product.id, 'active')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: 'rgba(10,50,10,0.3)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
                      >
                        Activate
                      </button>
                    )}
                    {product.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(product.id, 'draft')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: 'rgba(26,26,10,0.3)', color: '#f5c542', border: '1px solid rgba(245,197,66,0.3)' }}
                      >
                        Unpublish
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(product)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: 'rgba(10,10,26,0.3)', color: '#6b9fff', border: '1px solid rgba(107,159,255,0.3)' }}
                    >
                      Edit
                    </button>
                    {product.status !== 'archived' && (
                      <button
                        onClick={() => handleArchive(product.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: 'rgba(26,10,10,0.3)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.3)' }}
                      >
                        Archive
                      </button>
                    )}
                    {product.status === 'archived' && (
                      <button
                        onClick={() => handleStatusChange(product.id, 'draft')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: 'rgba(10,10,26,0.3)', color: '#6b9fff', border: '1px solid rgba(107,159,255,0.3)' }}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: 'rgba(255,255,255,0.6)',
  marginBottom: 6,
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(15,15,26,0.6)',
  border: '1px solid rgba(6,182,212,0.2)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  transition: 'all 0.2s',
}


