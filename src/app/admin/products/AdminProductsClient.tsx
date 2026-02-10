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
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
        {editing ? `Edit: ${editing.name}` : 'Create New Product'}
      </h2>

      {message && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          marginBottom: 16,
          background: message.startsWith('Error') ? '#2a1515' : '#0a1a0a',
          border: message.startsWith('Error') ? '1px solid #5a2020' : '1px solid #1a4a1a',
          color: message.startsWith('Error') ? '#ff6b6b' : '#4ade80',
          fontSize: 14,
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
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
          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
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
      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 24, marginBottom: 12, color: '#f5c542' }}>
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

      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Subheadline</label>
        <input
          style={inputStyle}
          value={form.subheadline}
          onChange={(e) => setForm((f: any) => ({ ...f, subheadline: e.target.value }))}
          placeholder="Learn the exact frameworks that make people magnetic"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Bullets (one per line)</label>
        {form.bullets.map((bullet: string, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
                style={{ background: '#2a1515', color: '#ff6b6b', border: '1px solid #5a2020', borderRadius: 6, padding: '0 12px', cursor: 'pointer' }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setForm((f: any) => ({ ...f, bullets: [...f.bullets, ''] }))}
          style={{ background: '#1a1a2e', color: '#f5c542', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
        >
          + Add Bullet
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Short Description (for upsell shop card)</label>
        <input
          style={inputStyle}
          value={form.short_description}
          onChange={(e) => setForm((f: any) => ({ ...f, short_description: e.target.value }))}
          placeholder="Master the art of instant connection and influence"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={labelStyle}>Sales Body (HTML or markdown for long-form copy)</label>
        <textarea
          style={{ ...inputStyle, minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
          value={form.sales_body}
          onChange={(e) => setForm((f: any) => ({ ...f, sales_body: e.target.value }))}
          placeholder="<p>Your long-form sales copy goes here...</p>"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
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
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={editing ? handleUpdate : handleCreate}
          disabled={saving || !form.name || !form.slug || !form.price_cents}
          style={{
            background: saving ? '#555' : 'linear-gradient(135deg, #f5c542 0%, #f0a500 100%)',
            color: '#000',
            border: 'none',
            padding: '12px 32px',
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 8,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
        </button>

        <button
          onClick={() => { setEditing(null); setCreating(false); setForm(emptyProduct); setMessage('') }}
          style={{
            background: 'transparent',
            color: '#888',
            border: '1px solid #333',
            padding: '12px 24px',
            fontSize: 16,
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )

  // ===== MAIN RENDER =====
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Product Manager</h1>
            <p style={{ color: '#888', fontSize: 14 }}>
              Create products here → sales pages, affiliate links, and upsell shop auto-populate
            </p>
          </div>
          {!creating && !editing && (
            <button
              onClick={startCreate}
              style={{
                background: 'linear-gradient(135deg, #f5c542 0%, #f0a500 100%)',
                color: '#000',
                border: 'none',
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              + New Product
            </button>
          )}
        </div>

        {/* Form */}
        {(creating || editing) && renderForm()}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['all', 'active', 'draft', 'archived'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#222' : 'transparent',
                color: filter === f ? '#fff' : '#888',
                border: '1px solid #333',
                padding: '6px 16px',
                fontSize: 13,
                borderRadius: 6,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f} ({f === 'all' ? products.length : products.filter(p => p.status === f).length})
            </button>
          ))}
        </div>

        {/* Products list */}
        {loading ? (
          <p style={{ color: '#888' }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            <p style={{ fontSize: 18, marginBottom: 8 }}>No products yet</p>
            <p style={{ fontSize: 14 }}>Create your first product to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredProducts.map(product => (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 16,
                  background: '#111',
                  border: '1px solid #222',
                  borderRadius: 10,
                }}
              >
                {/* Status dot */}
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: statusColor(product.status),
                  flexShrink: 0,
                }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{product.name}</span>
                    <span style={{ fontSize: 12, color: '#888', background: '#1a1a1a', padding: '2px 8px', borderRadius: 4 }}>
                      /p/{product.slug}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4, display: 'flex', gap: 16 }}>
                    <span>{product.price_display}</span>
                    <span>{product.commission_percent}% commission</span>
                    <span>Priority: {product.upsell_priority}</span>
                    {product.stripe_price_id && <span style={{ color: '#4ade80' }}>✓ Stripe</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {product.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(product.id, 'active')}
                      style={actionBtnStyle('#0a1a0a', '#1a4a1a', '#4ade80')}
                    >
                      Activate
                    </button>
                  )}
                  {product.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(product.id, 'draft')}
                      style={actionBtnStyle('#1a1a0a', '#4a4a1a', '#f5c542')}
                    >
                      Unpublish
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(product)}
                    style={actionBtnStyle('#0a0a1a', '#1a1a4a', '#6b9fff')}
                  >
                    Edit
                  </button>
                  {product.status !== 'archived' && (
                    <button
                      onClick={() => handleArchive(product.id)}
                      style={actionBtnStyle('#1a0a0a', '#4a1a1a', '#ff6b6b')}
                    >
                      Archive
                    </button>
                  )}
                  {product.status === 'archived' && (
                    <button
                      onClick={() => handleStatusChange(product.id, 'draft')}
                      style={actionBtnStyle('#0a0a1a', '#1a1a4a', '#6b9fff')}
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#888',
  marginBottom: 4,
  fontWeight: 500,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#0a0a0a',
  border: '1px solid #333',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
}

function actionBtnStyle(bg: string, border: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    border: `1px solid ${border}`,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}

