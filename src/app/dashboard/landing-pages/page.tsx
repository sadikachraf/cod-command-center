'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import {
  Plus, Pencil, Trash2, Globe, RefreshCw, Copy, CheckCheck, ExternalLink,
} from 'lucide-react'
import type { LandingPage, LandingPageStatus, Product } from '@/types'
import { format } from 'date-fns'

const LP_STATUSES: LandingPageStatus[] = ['Active', 'Paused', 'Archived']

const emptyForm = {
  product_id: '',
  page_name: '',
  live_url: '',
  market: '',
  language: '',
  offer_name: '',
  status: 'Active' as LandingPageStatus,
}

const inputClass = 'w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-none'
const inputStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

type LPStats = {
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

export default function LandingPagesPage() {
  const supabase = createClient()
  const [pages, setPages] = useState<(LandingPage & { product: Pick<Product, 'product_name'> | null })[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<Record<string, LPStats>>({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editPage, setEditPage] = useState<LandingPage | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: lps }, { data: prods }, { data: orders }] = await Promise.all([
      supabase
        .from('landing_pages')
        .select('*, product:products(product_name)')
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, product_name, status, currency').order('product_name'),
      supabase.from('orders').select('landing_page_id, status, order_value')
    ])
    setPages((lps ?? []) as typeof pages)
    setProducts((prods ?? []) as Product[])
    
    const s: Record<string, LPStats> = {}
    if (orders) {
      orders.forEach(o => {
        if (!o.landing_page_id) return
        if (!s[o.landing_page_id]) {
          s[o.landing_page_id] = { total: 0, new: 0, confirmed: 0, delivered: 0, cancelled: 0, value: 0 }
        }
        s[o.landing_page_id].total++
        s[o.landing_page_id].value += (o.order_value || 0)
        if (o.status === 'New') s[o.landing_page_id].new++
        if (o.status === 'Confirmed') s[o.landing_page_id].confirmed++
        if (o.status === 'Delivered') s[o.landing_page_id].delivered++
        if (o.status === 'Cancelled') s[o.landing_page_id].cancelled++
      })
    }
    setStats(s)
    
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const copyApiKey = async (key: string, id: string) => {
    await navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openCreate = () => {
    setEditPage(null)
    setForm({ ...emptyForm, product_id: products[0]?.id ?? '' })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (lp: LandingPage) => {
    setEditPage(lp)
    setForm({
      product_id: lp.product_id,
      page_name: lp.page_name,
      live_url: lp.live_url ?? '',
      market: lp.market ?? '',
      language: lp.language ?? '',
      offer_name: lp.offer_name ?? '',
      status: lp.status,
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.page_name.trim()) { setFormError('Page name is required.'); return }
    if (!form.product_id) { setFormError('Please select a product.'); return }
    setSaving(true)
    setFormError('')

    const payload = {
      product_id: form.product_id,
      page_name: form.page_name.trim(),
      live_url: form.live_url.trim() || null,
      market: form.market.trim() || null,
      language: form.language.trim() || null,
      offer_name: form.offer_name.trim() || null,
      status: form.status,
    }

    let error
    if (editPage) {
      ;({ error } = await supabase.from('landing_pages').update(payload).eq('id', editPage.id))
    } else {
      ;({ error } = await supabase.from('landing_pages').insert(payload))
    }

    if (error) { setFormError(error.message) }
    else { setModalOpen(false); fetchData() }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await supabase.from('landing_pages').delete().eq('id', deleteId)
    setDeleteId(null)
    fetchData()
  }

  const tf = (key: keyof typeof form, label: string, placeholder = '', type = 'text') => (
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
        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)' }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )

  const getProductCurrency = (productId: string) => {
    return products.find(p => p.id === productId)?.currency || 'USD'
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Landing Pages</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {pages.length} page{pages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            id="create-lp-btn"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
          >
            <Plus size={16} />
            New Landing Page
          </button>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="mx-auto mb-3 animate-spin opacity-40" />
            Loading…
          </div>
        ) : pages.length === 0 ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
            <Globe size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No landing pages yet.</p>
            <button onClick={openCreate} className="mt-3 px-4 py-1.5 rounded-lg text-sm font-medium"
              style={{ color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)' }}>
              Add your first landing page
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Page Name', 'Product', 'API Key', 'Orders', 'New', 'Conf', 'Deliv', 'Canc', 'Revenue', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pages.map((lp, i) => {
                  const s = stats[lp.id] || { total: 0, new: 0, confirmed: 0, delivered: 0, cancelled: 0, value: 0 }
                  return (
                    <tr
                      key={lp.id}
                      style={{ borderBottom: i < pages.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                            {lp.page_name}
                          </span>
                          {lp.live_url && (
                            <a href={lp.live_url} target="_blank" rel="noreferrer"
                              style={{ color: 'var(--text-muted)' }}>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        {lp.language && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {lp.language} {lp.market ? `· ${lp.market}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {lp.product?.product_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs px-2 py-0.5 rounded" style={{
                            background: 'var(--bg-primary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                            maxWidth: '130px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}>
                            {lp.api_key.substring(0, 16)}…
                          </code>
                          <button
                            onClick={() => copyApiKey(lp.api_key, lp.id)}
                            className="p-1 rounded transition-all"
                            style={{ color: copiedId === lp.id ? '#34d399' : 'var(--text-muted)' }}
                            title="Copy API key"
                          >
                            {copiedId === lp.id ? <CheckCheck size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.total}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#a78bfa' }}>{s.new}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#34d399' }}>{s.confirmed}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#fbbf24' }}>{s.delivered}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: '#9ca3af' }}>{s.cancelled}</td>
                      <td className="px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {s.value > 0 ? formatCurrency(s.value, getProductCurrency(lp.product_id)) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lp.status} type="landing_page" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(lp)} className="p-1.5 rounded-lg"
                            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteId(lp.id)} className="p-1.5 rounded-lg"
                            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editPage ? 'Edit Landing Page' : 'New Landing Page'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Product select */}
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Product *
              </label>
              <select
                value={form.product_id}
                onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              >
                <option value="">— Select a product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.product_name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">{tf('page_name', 'Page Name *', 'e.g. NeckZen Morocco FR')}</div>
            <div className="col-span-2">{tf('live_url', 'Live URL', 'https://your-domain.com/lp')}</div>
            {tf('market', 'Market', 'e.g. Morocco')}
            {tf('language', 'Language', 'e.g. fr, ar, en')}
            <div className="col-span-2">{tf('offer_name', 'Offer Name', 'e.g. TRIO Bundle')}</div>

            {/* Status */}
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Status
              </label>
              <select value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as LandingPageStatus }))}
                className={inputClass} style={inputStyle}>
                {LP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {editPage && (
            <div className="p-3 rounded-lg text-xs" style={{
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: 'var(--text-secondary)'
            }}>
              <strong style={{ color: 'var(--accent)' }}>API Key:</strong>{' '}
              <code>{editPage.api_key}</code>
              <br />
              <span style={{ color: 'var(--text-muted)' }}>
                The API key is generated automatically and cannot be changed.
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button id="save-lp-btn" type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: saving ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              {saving ? 'Saving…' : editPage ? 'Save Changes' : 'Create Landing Page'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Landing Page" size="sm">
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Deleting a landing page will make its API key invalid. Existing orders will remain but will lose the landing page link.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            Cancel
          </button>
          <button onClick={handleDelete} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#ef4444' }}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
