'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/StatusBadge'
import Modal from '@/components/Modal'
import { Plus, Pencil, Trash2, Globe, RefreshCw, Copy, CheckCheck, ExternalLink } from 'lucide-react'
import type { LandingPage, LandingPageStatus, Product } from '@/types'

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

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition-all'
const inputSty = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}
const focusSty = { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-light)' }
const blurSty  = { borderColor: 'var(--border)', boxShadow: 'none' }

type LPStats = { total: number; new: number; confirmed: number; delivered: number; cancelled: number; value: number }

function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export default function LandingPagesPage() {
  const supabase = createClient()
  const [pages, setPages]       = useState<(LandingPage & { product: Pick<Product, 'product_name'> | null })[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats]       = useState<Record<string, LPStats>>({})
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [editPage, setEditPage]   = useState<LandingPage | null>(null)
  const [form, setForm]       = useState({ ...emptyForm })
  const [saving, setSaving]   = useState(false)
  const [formError, setFormError] = useState('')
  const [copiedId, setCopiedId]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: lps }, { data: prods }, { data: orders }] = await Promise.all([
      supabase.from('landing_pages').select('*, product:products(product_name)').order('created_at', { ascending: false }),
      supabase.from('products').select('id, product_name, status, currency').order('product_name'),
      supabase.from('orders').select('landing_page_id, status, order_value'),
    ])
    setPages((lps ?? []) as typeof pages)
    setProducts((prods ?? []) as Product[])
    const s: Record<string, LPStats> = {}
    if (orders) {
      orders.forEach((o) => {
        if (!o.landing_page_id) return
        if (!s[o.landing_page_id]) s[o.landing_page_id] = { total: 0, new: 0, confirmed: 0, delivered: 0, cancelled: 0, value: 0 }
        s[o.landing_page_id].total++
        s[o.landing_page_id].value += (o.order_value || 0)
        if (o.status === 'New')       s[o.landing_page_id].new++
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
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000)
  }

  const openCreate = () => {
    setEditPage(null); setForm({ ...emptyForm, product_id: products[0]?.id ?? '' })
    setFormError(''); setModalOpen(true)
  }
  const openEdit = (lp: LandingPage) => {
    setEditPage(lp)
    setForm({ product_id: lp.product_id, page_name: lp.page_name, live_url: lp.live_url ?? '',
      market: lp.market ?? '', language: lp.language ?? '', offer_name: lp.offer_name ?? '', status: lp.status })
    setFormError(''); setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.page_name.trim()) { setFormError('Page name is required.'); return }
    if (!form.product_id) { setFormError('Please select a product.'); return }
    setSaving(true); setFormError('')
    const payload = {
      product_id: form.product_id, page_name: form.page_name.trim(),
      live_url: form.live_url.trim() || null, market: form.market.trim() || null,
      language: form.language.trim() || null, offer_name: form.offer_name.trim() || null, status: form.status,
    }
    let error
    if (editPage) { ;({ error } = await supabase.from('landing_pages').update(payload).eq('id', editPage.id)) }
    else          { ;({ error } = await supabase.from('landing_pages').insert(payload)) }
    if (error) { setFormError(error.message) }
    else { setModalOpen(false); fetchData() }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await supabase.from('landing_pages').delete().eq('id', deleteId)
    setDeleteId(null); fetchData()
  }

  const getProductCurrency = (productId: string) =>
    products.find((p) => p.id === productId)?.currency || 'USD'

  const tf = (key: keyof typeof form, label: string, placeholder = '', type = 'text') => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input type={type} value={form[key] as string} placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={inputCls} style={inputSty}
        onFocus={(e) => Object.assign(e.target.style, focusSty)}
        onBlur={(e) => Object.assign(e.target.style, blurSty)} />
    </div>
  )

  return (
    <div className="space-y-5 fade-in max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Landing Pages</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {pages.length} page{pages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button id="create-lp-btn" onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            <Plus size={15} /> New Landing Page
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw size={22} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="py-24 text-center">
            <Globe size={36} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No landing pages yet</p>
            <button onClick={openCreate} className="mt-2 text-xs font-medium" style={{ color: 'var(--accent-text)' }}>
              Add your first landing page
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  {['Page Name', 'Product', 'API Key', 'Total', 'New', 'Conf', 'Deliv', 'Canc', 'Revenue', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pages.map((lp, i) => {
                  const s = stats[lp.id] || { total: 0, new: 0, confirmed: 0, delivered: 0, cancelled: 0, value: 0 }
                  return (
                    <tr key={lp.id} style={{ borderBottom: i < pages.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{lp.page_name}</span>
                          {lp.live_url && (
                            <a href={lp.live_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }}>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                        {lp.language && (
                          <span className="text-xs mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                            {lp.language}{lp.market ? ` · ${lp.market}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {lp.product?.product_name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs px-2 py-0.5 rounded-md font-mono" style={{
                            background: 'var(--bg-muted)', color: 'var(--text-secondary)',
                            border: '1px solid var(--border)', maxWidth: '120px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                          }}>
                            {lp.api_key.substring(0, 16)}…
                          </code>
                          <button onClick={() => copyApiKey(lp.api_key, lp.id)}
                            className="p-1 rounded transition-all" title="Copy API key"
                            style={{ color: copiedId === lp.id ? 'var(--success)' : 'var(--text-muted)' }}>
                            {copiedId === lp.id ? <CheckCheck size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.total}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold" style={{ color: 'var(--status-new-text)' }}>{s.new}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold" style={{ color: 'var(--status-confirmed-text)' }}>{s.confirmed}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold" style={{ color: 'var(--status-delivered-text)' }}>{s.delivered}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold" style={{ color: 'var(--status-cancelled-text)' }}>{s.cancelled}</td>
                      <td className="px-4 py-3.5 text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {s.value > 0 ? formatCurrency(s.value, getProductCurrency(lp.product_id)) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={lp.status} type="landing_page" /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(lp)} className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => setDeleteId(lp.id)} className="p-1.5 rounded-lg transition-all"
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editPage ? 'Edit Landing Page' : 'New Landing Page'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--danger-light)', border: '1px solid var(--status-cancelled-border)', color: 'var(--danger)' }}>
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Product *</label>
              <select value={form.product_id} onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                className={inputCls} style={inputSty}>
                <option value="">— Select a product —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
              </select>
            </div>
            <div className="col-span-2">{tf('page_name', 'Page Name *', 'e.g. NeckZen Morocco FR')}</div>
            <div className="col-span-2">{tf('live_url', 'Live URL', 'https://your-domain.com/lp')}</div>
            {tf('market', 'Market', 'e.g. Morocco')}
            {tf('language', 'Language', 'e.g. fr, ar, en')}
            <div className="col-span-2">{tf('offer_name', 'Offer Name', 'e.g. TRIO Bundle')}</div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as LandingPageStatus }))}
                className={inputCls} style={inputSty}>
                {LP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {editPage && (
            <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent-text)' }}>API Key:</strong>{' '}
              <code className="font-mono">{editPage.api_key}</code>
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
              Cancel
            </button>
            <button id="save-lp-btn" type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: saving ? 'rgba(37,99,235,0.6)' : 'var(--accent)' }}>
              {saving ? 'Saving…' : editPage ? 'Save Changes' : 'Create Landing Page'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Landing Page" size="sm">
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Deleting a landing page will invalidate its API key. Existing orders remain in the system.
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
