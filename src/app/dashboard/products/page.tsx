'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Package, RefreshCw } from 'lucide-react'
import type { Product, ProductStatus } from '@/types'
import { format } from 'date-fns'

const PRODUCT_STATUSES: ProductStatus[] = ['Testing', 'Scaling', 'Winner', 'Killed', 'Paused']

const emptyForm = {
  product_name: '',
  sku: '',
  country: '',
  currency: 'USD',
  selling_price: '',
  product_cost: '',
  shipping_cost: '',
  return_cost: '',
  call_center_cost: '',
  status: 'Testing' as ProductStatus,
}

// Shared input style helper
const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none'
const inputStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

type ProductStats = {
  total: number
  new: number
  confirmed: number
  delivered: number
  cancelled: number
  value: number
}

function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<Record<string, ProductStats>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchProductsAndStats = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, { data: orders }] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('product_id, status, order_value')
    ])
    
    setProducts((prods as Product[]) ?? [])
    
    const s: Record<string, ProductStats> = {}
    if (orders) {
      orders.forEach(o => {
        if (!o.product_id) return
        if (!s[o.product_id]) {
          s[o.product_id] = { total: 0, new: 0, confirmed: 0, delivered: 0, cancelled: 0, value: 0 }
        }
        s[o.product_id].total++
        s[o.product_id].value += (o.order_value || 0)
        if (o.status === 'New') s[o.product_id].new++
        if (o.status === 'Confirmed') s[o.product_id].confirmed++
        if (o.status === 'Delivered') s[o.product_id].delivered++
        if (o.status === 'Cancelled') s[o.product_id].cancelled++
      })
    }
    setStats(s)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchProductsAndStats()
  }, [fetchProductsAndStats])

  const openCreate = () => {
    setEditProduct(null)
    setForm({ ...emptyForm })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditProduct(p)
    setForm({
      product_name: p.product_name,
      sku: p.sku ?? '',
      country: p.country ?? '',
      currency: p.currency ?? 'USD',
      selling_price: p.selling_price?.toString() ?? '',
      product_cost: p.product_cost?.toString() ?? '',
      shipping_cost: p.shipping_cost?.toString() ?? '',
      return_cost: p.return_cost?.toString() ?? '',
      call_center_cost: p.call_center_cost?.toString() ?? '',
      status: p.status,
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.product_name.trim()) {
      setFormError('Product name is required.')
      return
    }
    setSaving(true)
    setFormError('')

    const payload = {
      product_name: form.product_name.trim(),
      sku: form.sku.trim() || null,
      country: form.country.trim() || null,
      currency: form.currency.trim() || null,
      selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
      product_cost: form.product_cost ? parseFloat(form.product_cost) : null,
      shipping_cost: form.shipping_cost ? parseFloat(form.shipping_cost) : null,
      return_cost: form.return_cost ? parseFloat(form.return_cost) : null,
      call_center_cost: form.call_center_cost ? parseFloat(form.call_center_cost) : null,
      status: form.status,
    }

    let error
    if (editProduct) {
      ;({ error } = await supabase.from('products').update(payload).eq('id', editProduct.id))
    } else {
      ;({ error } = await supabase.from('products').insert(payload))
    }

    if (error) {
      setFormError(error.message)
    } else {
      setModalOpen(false)
      fetchProductsAndStats()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await supabase.from('products').delete().eq('id', deleteId)
    setDeleteId(null)
    fetchProductsAndStats()
  }

  const field = (
    key: keyof typeof form,
    label: string,
    type = 'text',
    placeholder = ''
  ) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className={inputClass}
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)'
          e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border)'
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Products</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchProductsAndStats}
            className="p-2 rounded-lg transition-all"
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              background: 'transparent',
            }}
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            id="create-product-btn"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
          >
            <Plus size={16} />
            New Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="mx-auto mb-3 animate-spin opacity-40" />
            Loading products…
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No products yet.</p>
            <button
              onClick={openCreate}
              className="mt-3 px-4 py-1.5 rounded-lg text-sm font-medium"
              style={{ color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              Create your first product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Product', 'SKU', 'Orders', 'New', 'Conf', 'Deliv', 'Canc', 'Revenue', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const s = stats[p.id] || { total: 0, new: 0, confirmed: 0, delivered: 0, cancelled: 0, value: 0 }
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors"
                      style={{ borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-4 py-3 font-medium text-sm whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {p.product_name}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {p.sku ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.total}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#a78bfa' }}>{s.new}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#34d399' }}>{s.confirmed}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#fbbf24' }}>{s.delivered}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#9ca3af' }}>{s.cancelled}</td>
                      <td className="px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {s.value > 0 ? formatCurrency(s.value, p.currency || 'USD') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} type="product" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteId(p.id)}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct ? 'Edit Product' : 'New Product'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">{field('product_name', 'Product Name *', 'text', 'e.g. NeckZen Pro')}</div>
            {field('sku', 'SKU', 'text', 'e.g. NZP-001')}
            {field('country', 'Country / Market', 'text', 'e.g. Morocco')}
            {field('currency', 'Currency', 'text', 'e.g. USD, MAD, HUF')}

            {field('selling_price', 'Selling Price', 'number', '0.00')}
            {field('product_cost', 'Product Cost', 'number', '0.00')}
            {field('shipping_cost', 'Shipping Cost', 'number', '0.00')}
            {field('return_cost', 'Return Cost', 'number', '0.00')}
            <div className="col-span-2">
              {field('call_center_cost', 'Call Center Cost', 'number', '0.00')}
            </div>

            {/* Status */}
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))}
                className={inputClass}
                style={inputStyle}
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Cancel
            </button>
            <button
              id="save-product-btn"
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
              style={{
                background: saving ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : editProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Product" size="sm">
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete this product? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteId(null)}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#ef4444' }}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
