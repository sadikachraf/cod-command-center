'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/StatusBadge'
import { Search, RefreshCw, Filter, ChevronRight, Copy, Download, AlertTriangle, X, CheckSquare } from 'lucide-react'
import type { Order, OrderStatus, Product, LandingPage } from '@/types'
import { format } from 'date-fns'
import Link from 'next/link'
import { QuickStatusSelect } from '@/components/QuickStatusSelect'
import Modal from '@/components/Modal'

const ORDER_STATUSES: OrderStatus[] = [
  'New', 'Confirmed', 'No Answer', 'Wrong Number',
  'Cancelled', 'Shipped', 'Delivered', 'Returned', 'Paid',
]
const DANGEROUS_BULK_STATUSES: OrderStatus[] = ['Cancelled', 'Returned', 'Delivered', 'Paid']

function formatCurrency(value: number | null, currency = 'USD') {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

type OrderRow = Order & {
  product: Pick<Product, 'product_name'> | null
  landing_page: Pick<LandingPage, 'page_name'> | null
}

// Shared input/select style
const inputCls = "px-3 py-1.5 rounded-lg text-sm transition-all focus:outline-none w-full"
const inputSty = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}
const focusSty = { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-light)' }
const blurSty  = { borderColor: 'var(--border)', boxShadow: 'none' }

export default function OrdersPage() {
  const supabase = createClient()
  const [orders, setOrders]             = useState<OrderRow[]>([])
  const [products, setProducts]         = useState<Pick<Product, 'id' | 'product_name'>[]>([])
  const [landingPages, setLandingPages] = useState<Pick<LandingPage, 'id' | 'page_name'>[]>([])
  const [loading, setLoading]           = useState(true)
  const [copied, setCopied]             = useState<string | null>(null)

  // Filters
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [productFilter, setProduct] = useState('')
  const [lpFilter, setLp]           = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  // Bulk
  const [selected, setSelected]               = useState<string[]>([])
  const [bulkStatus, setBulkStatus]           = useState<OrderStatus | ''>('')
  const [isBulkUpdating, setIsBulkUpdating]   = useState(false)
  const [bulkModalOpen, setBulkModalOpen]     = useState(false)
  const [pendingBulkStatus, setPendingBulk]   = useState<OrderStatus | null>(null)

  const fetchMeta = useCallback(async () => {
    const [{ data: prods }, { data: lps }] = await Promise.all([
      supabase.from('products').select('id, product_name').order('product_name'),
      supabase.from('landing_pages').select('id, page_name').order('page_name'),
    ])
    setProducts((prods ?? []) as typeof products)
    setLandingPages((lps ?? []) as typeof landingPages)
  }, [supabase])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('orders')
      .select('*, product:products(product_name), landing_page:landing_pages(page_name)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (statusFilter)  q = q.eq('status', statusFilter)
    if (productFilter) q = q.eq('product_id', productFilter)
    if (lpFilter)      q = q.eq('landing_page_id', lpFilter)
    if (dateFrom)      q = q.gte('created_at', `${dateFrom}T00:00:00`)
    if (dateTo)        q = q.lte('created_at', `${dateTo}T23:59:59`)

    const { data } = await q
    let rows = (data ?? []) as OrderRow[]

    if (search.trim()) {
      const sq = search.toLowerCase()
      rows = rows.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(sq) ||
          o.phone.includes(sq) ||
          o.order_number.toLowerCase().includes(sq)
      )
    }

    setOrders(rows)
    setSelected([])
    setLoading(false)
  }, [supabase, statusFilter, productFilter, lpFilter, dateFrom, dateTo, search])

  useEffect(() => { fetchMeta() }, [fetchMeta])
  useEffect(() => { fetchOrders() }, [fetchOrders])

  const hasFilters = !!(search || statusFilter || productFilter || lpFilter || dateFrom || dateTo)
  const clearFilters = () => { setSearch(''); setStatus(''); setProduct(''); setLp(''); setDateFrom(''); setDateTo('') }

  // Selection
  const toggleOne = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleAll = () =>
    setSelected(selected.length === orders.length ? [] : orders.map((o) => o.id))

  // Bulk status
  const handleBulkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value as OrderStatus
    setBulkStatus('')
    if (!s || selected.length === 0) return
    if (DANGEROUS_BULK_STATUSES.includes(s)) {
      setPendingBulk(s)
      setBulkModalOpen(true)
    } else {
      executeBulk(s)
    }
  }

  const executeBulk = async (newStatus: OrderStatus) => {
    setIsBulkUpdating(true)
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).in('id', selected)
      if (error) throw error
      const events = orders
        .filter((o) => selected.includes(o.id) && o.status !== newStatus)
        .map((o) => ({
          order_id: o.id,
          product_id: o.product_id,
          landing_page_id: o.landing_page_id,
          event_type: 'status_changed',
          event_data: { from: o.status, to: newStatus },
        }))
      if (events.length > 0) await supabase.from('order_events').insert(events)
      setSelected([])
      fetchOrders()
    } catch { alert('Error updating orders') }
    finally {
      setIsBulkUpdating(false)
      setBulkModalOpen(false)
      setPendingBulk(null)
    }
  }

  // CSV export
  const exportCSV = () => {
    if (orders.length === 0) return alert('No orders to export.')
    const headers = ['order_number','created_at','status','product_name','landing_page_name','customer_name','phone','city','address','package_name','quantity','order_value','currency','notes','utm_source','utm_campaign','utm_content','platform','device','browser']
    const esc = (v: any) => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = orders.map((o) => [
      o.order_number, new Date(o.created_at).toISOString(), o.status,
      o.product?.product_name, o.landing_page?.page_name,
      o.customer_name, o.phone, o.city, o.address, o.package_name,
      o.quantity, o.order_value, o.currency, o.notes,
      o.utm_source, o.utm_campaign, o.utm_content, o.platform, o.device, o.browser,
    ].map(esc).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const copyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(phone)
    setCopied(phone)
    setTimeout(() => setCopied(null), 1500)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 fade-in max-w-[1400px]">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Orders</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)' }}
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-1.5 p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Filters</span>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'var(--accent-text)' }}
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Name, phone, order #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm focus:outline-none w-full"
              style={inputSty}
              onFocus={(e) => Object.assign(e.target.style, focusSty)}
              onBlur={(e) => Object.assign(e.target.style, blurSty)}
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} style={inputSty} className={inputCls}
            onFocus={(e) => Object.assign(e.target.style, focusSty)} onBlur={(e) => Object.assign(e.target.style, blurSty)}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={productFilter} onChange={(e) => setProduct(e.target.value)} style={inputSty} className={inputCls}
            onFocus={(e) => Object.assign(e.target.style, focusSty)} onBlur={(e) => Object.assign(e.target.style, blurSty)}>
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
          </select>

          <select value={lpFilter} onChange={(e) => setLp(e.target.value)} style={inputSty} className={inputCls}
            onFocus={(e) => Object.assign(e.target.style, focusSty)} onBlur={(e) => Object.assign(e.target.style, blurSty)}>
            <option value="">All pages</option>
            {landingPages.map((lp) => <option key={lp.id} value={lp.id}>{lp.page_name}</option>)}
          </select>

          <div className="flex gap-1.5">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={inputSty}
              onFocus={(e) => Object.assign(e.target.style, focusSty)} onBlur={(e) => Object.assign(e.target.style, blurSty)} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={inputSty}
              onFocus={(e) => Object.assign(e.target.style, focusSty)} onBlur={(e) => Object.assign(e.target.style, blurSty)} />
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div
          className="rounded-xl px-4 py-2.5 flex items-center justify-between fade-in"
          style={{ background: '#eff6ff', border: '1px solid var(--accent-border)' }}
        >
          <div className="flex items-center gap-2">
            <CheckSquare size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
              {selected.length} order{selected.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Move to:</span>
            <select
              value={bulkStatus}
              onChange={handleBulkChange}
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg text-xs font-medium focus:outline-none"
              style={{ ...inputSty, minWidth: '140px' }}
            >
              <option value="">Select status…</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          maxHeight: '70vh',
        }}
      >
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw size={24} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-24 text-center">
            <Search size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No orders found</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs font-medium" style={{ color: 'var(--accent-text)' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-surface-2)' }}>
                <tr>
                  <th className="px-4 py-3 text-left" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input
                      type="checkbox"
                      checked={selected.length === orders.length && orders.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </th>
                  {['Order #', 'Customer', 'Phone', 'City', 'Product', 'Page', 'Value', 'Status', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap"
                      style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(order.id)}
                        onChange={() => toggleOne(order.id)}
                        style={{ accentColor: 'var(--accent)' }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-xs font-mono font-semibold transition-colors"
                        style={{ color: 'var(--accent-text)' }}
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-sm font-medium transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {order.customer_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 group">
                        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {order.phone}
                        </span>
                        <button
                          onClick={(e) => copyPhone(order.phone, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy phone"
                          style={{ color: copied === order.phone ? 'var(--success)' : 'var(--text-muted)' }}
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{order.city}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {order.product?.product_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {order.landing_page?.page_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(order.order_value, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <QuickStatusSelect
                        orderId={order.id}
                        productId={order.product_id}
                        landingPageId={order.landing_page_id}
                        currentStatus={order.status}
                        onStatusChange={(newStatus) =>
                          setOrders(orders.map((o) => o.id === order.id ? { ...o, status: newStatus } : o))
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {format(new Date(order.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="p-1.5 rounded-lg inline-flex transition-all"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                        }}
                      >
                        <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk confirm modal */}
      <Modal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Confirm Bulk Update" size="sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Are you sure?</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Mark <strong>{selected.length}</strong> order{selected.length !== 1 ? 's' : ''} as <strong>{pendingBulkStatus}</strong>?
            </p>
          </div>
          <div className="flex w-full gap-2.5 pt-2">
            <button
              onClick={() => setBulkModalOpen(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => pendingBulkStatus && executeBulk(pendingBulkStatus)}
              disabled={isBulkUpdating}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--danger)' }}
            >
              {isBulkUpdating ? 'Updating…' : 'Yes, update all'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
