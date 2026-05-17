'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Plus, Pencil, Trash2, Package, RefreshCw, TrendingUp } from 'lucide-react'
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

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-all'
const inputSty = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}
const focusSty = { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-light)' }
const blurSty  = { borderColor: 'var(--border)', boxShadow: 'none' }

type ProductStats = { total: number; new: number; confirmed: number; delivered: number; cancelled: number; value: number }

function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-semibold" style={{ color }}>{value}</span>
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats]       = useState<Record<string, ProductStats>>({})
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm]   = useState({ ...emptyForm })
  const [saving, setSaving]   = useState(false)
  const [formError, setFormError] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, { data: orders }] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('product_id, status, order_value'),
    ])
    setProducts((prods as Product[]) ?? [])
    const s: Record<string, ProductStats> = {}
    if (orders) {
      orders.forEach((o) => {
        if (!o.product_id) return
        if (!s[o.product_id]) s[o.product_id] = { total: 0, new: 0, confirmed: 0, delivered: 0, cancelled: 0, value: 0 }
        s[o.product_id].total++
        s[o.product_id].value += (o.order_value || 0)
        if (o.status === 'New')       s[o.product_id].new++
        if (o.status === 'Confirmed') s[o.product_id].confirmed++
        if (o.status === 'Delivered') s[o.product_id].delivered++
        if (o.status === 'Cancelled') s[o.product_id].cancelled++
      })
    }
    setStats(s)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreate = () => { setEditProduct(null); setForm({ ...emptyForm }); setFormError(''); setModalOpen(true) }
  const openEdit   = (p: Product) => {
    setEditProduct(p)
    setForm({
      product_name: p.product_name, sku: p.sku ?? '', country: p.country ?? '',
      currency: p.currency ?? 'USD', selling_price: p.selling_price?.toString() ?? '',
      product_cost: p.product_cost?.toString() ?? '', shipping_cost: p.shipping_cost?.toString() ?? '',
      return_cost: p.return_cost?.toString() ?? '', call_center_cost: p.call_center_cost?.toString() ?? '',
      status: p.status,
    })
    setFormError(''); setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.product_name.trim()) { setFormError('Product name is required.'); return }
    setSaving(true); setFormError('')
    const payload = {
      product_name: form.product_name.trim(), sku: form.sku.trim() || null,
      country: form.country.trim() || null, currency: form.currency.trim() || null,
      selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
      product_cost: form.product_cost ? parseFloat(form.product_cost) : null,
      shipping_cost: form.shipping_cost ? parseFloat(form.shipping_cost) : null,
      return_cost: form.return_cost ? parseFloat(form.return_cost) : null,
      call_center_cost: form.call_center_cost ? parseFloat(form.call_center_cost) : null,
      status: form.status,
    }
    let error
    if (editProduct) { ;({ error } = await supabase.from('products').update(payload).eq('id', editProduct.id)) }
    else             { ;({ error } = await supabase.from('products').insert(payload)) }
    if (error) { setFormError(error.message) }
    else { setModalOpen(false); fetchAll() }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await supabase.from('products').delete().eq('id', deleteId)
    setDeleteId(null); fetchAll()
  }

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input type={type} value={form[key] as string} placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={inputCls} style={inputSty}
        onFocus={(e) => Object.assign(e.target.style, focusSty)}
        onBlur={(e)  => Object.assign(e.target.style, blurSty)} />
    </div>
  )

  return (
    <div className="space-y-5 fade-in max-w-[1400px]">

      {/* Header */}
      <PageHeader
        title="Products"
        subtitle={`${products.length} product${products.length !== 1 ? 's' : ''}`}
        action={
          <button id="create-product-btn" onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}>
            <Plus size={15} /> New Product
          </button>
        }
        secondaryAction={
          <button onClick={fetchAll} className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw size={22} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product to start tracking performance."
            action={
              <button onClick={openCreate} className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--accent-text)' }}>
                Create your first product
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  {['Product', 'SKU', 'Country', 'Currency', 'Total', 'New', 'Conf', 'Deliv', 'Canc', 'Revenue', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const s = stats[p.id] || { total: 0, new: 0, confirmed: 0, delivered: 0, cancelled: 0, value: 0 }
                  return (
                    <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                      <td className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{p.product_name}</td>
                      <td className="px-4 py-3.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{p.sku ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{p.country ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{p.currency ?? '—'}</td>
                      <td className="px-4 py-3.5 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.total}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold" style={{ color: 'var(--status-new-text)' }}>{s.new}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold" style={{ color: 'var(--status-confirmed-text)' }}>{s.confirmed}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold" style={{ color: 'var(--status-delivered-text)' }}>{s.delivered}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold" style={{ color: 'var(--status-cancelled-text)' }}>{s.cancelled}</td>
                      <td className="px-4 py-3.5 text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {s.value > 0 ? formatCurrency(s.value, p.currency || 'USD') : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={p.status} type="product" /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--status-cancelled-border)'; e.currentTarget.style.background = 'var(--danger-light)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
                            <Trash2 size={12} />
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

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editProduct ? 'Edit Product' : 'New Product'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--danger-light)', border: '1px solid var(--status-cancelled-border)', color: 'var(--danger)' }}>
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
            <div className="col-span-2">{field('call_center_cost', 'Call Center Cost', 'number', '0.00')}</div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))}
                className={inputCls} style={inputSty}>
                {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
              Cancel
            </button>
            <button id="save-product-btn" type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: saving ? 'rgba(37,99,235,0.6)' : 'var(--accent)' }}>
              {saving ? 'Saving…' : editProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Product" size="sm">
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete this product? This cannot be undone.
        </p>
        <div className="flex gap-2.5">
          <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
            Cancel
          </button>
          <button onClick={handleDelete} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--danger)' }}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
