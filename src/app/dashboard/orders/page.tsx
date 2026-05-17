'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Search, RefreshCw, Filter, ChevronRight, Copy,
  Download, AlertTriangle, X, CheckSquare, ShoppingCart,
} from 'lucide-react'
import type { Order, OrderStatus, Product, LandingPage } from '@/types'
import { format } from 'date-fns'
import Link from 'next/link'
import { QuickStatusSelect } from '@/components/QuickStatusSelect'
import Modal from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'

const ORDER_STATUSES: OrderStatus[] = [
  'New', 'Confirmed', 'No Answer', 'Wrong Number',
  'Cancelled', 'Shipped', 'Delivered', 'Returned', 'Paid',
]
const DANGEROUS_BULK: OrderStatus[] = ['Cancelled', 'Returned', 'Delivered', 'Paid']

function formatCurrency(v: number | null, c = 'USD') {
  if (v === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v)
}

type OrderRow = Order & {
  product: Pick<Product, 'product_name'> | null
  landing_page: Pick<LandingPage, 'page_name'> | null
}

// ── Shared control styles ──────────────────────────────────────────────────
const ctrlBase: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  borderRadius: '10px',
  fontSize: '13px',
  height: '36px',
  padding: '0 12px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--accent)'
  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border)'
  e.target.style.boxShadow = 'none'
}

// ── Column headers ──────────────────────────────────────────────────────────
const TH_COLS = ['Order', 'Customer', 'Phone', 'City', 'Product', 'Value', 'Status', 'Date', '']

export default function OrdersPage() {
  const supabase = createClient()
  const [orders, setOrders]         = useState<OrderRow[]>([])
  const [products, setProducts]     = useState<Pick<Product, 'id' | 'product_name'>[]>([])
  const [lps, setLps]               = useState<Pick<LandingPage, 'id' | 'page_name'>[]>([])
  const [loading, setLoading]       = useState(true)
  const [copiedPhone, setCopied]    = useState<string | null>(null)

  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [productFilter, setProduct] = useState('')
  const [lpFilter, setLp]           = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const [selected, setSelected]           = useState<string[]>([])
  const [bulkStatus, setBulkStatus]       = useState<OrderStatus | ''>('')
  const [bulkLoading, setBulkLoading]     = useState(false)
  const [bulkModalOpen, setBulkModal]     = useState(false)
  const [pendingBulk, setPendingBulk]     = useState<OrderStatus | null>(null)

  const fetchMeta = useCallback(async () => {
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from('products').select('id, product_name').order('product_name'),
      supabase.from('landing_pages').select('id, page_name').order('page_name'),
    ])
    setProducts((p ?? []) as typeof products)
    setLps((l ?? []) as typeof lps)
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
          o.order_number.toLowerCase().includes(sq),
      )
    }
    setOrders(rows)
    setSelected([])
    setLoading(false)
  }, [supabase, statusFilter, productFilter, lpFilter, dateFrom, dateTo, search])

  useEffect(() => { fetchMeta() }, [fetchMeta])
  useEffect(() => { fetchOrders() }, [fetchOrders])

  const hasFilters = !!(search || statusFilter || productFilter || lpFilter || dateFrom || dateTo)
  const clearFilters = () => {
    setSearch(''); setStatus(''); setProduct(''); setLp(''); setDateFrom(''); setDateTo('')
  }

  const metrics = useMemo(() => {
    return {
      total: orders.length,
      newOrders: orders.filter((o) => o.status === 'New').length,
      confirmed: orders.filter((o) => o.status === 'Confirmed').length,
      delivered: orders.filter((o) => o.status === 'Delivered').length,
      cancelled: orders.filter((o) => o.status === 'Cancelled').length,
    }
  }, [orders])

  const toggleOne = (id: string) =>
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  const toggleAll = () =>
    setSelected(selected.length === orders.length ? [] : orders.map((o) => o.id))

  const handleBulkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value as OrderStatus
    setBulkStatus('')
    if (!s || !selected.length) return
    if (DANGEROUS_BULK.includes(s)) { setPendingBulk(s); setBulkModal(true) }
    else executeBulk(s)
  }

  const executeBulk = async (newStatus: OrderStatus) => {
    setBulkLoading(true)
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
      if (events.length) await supabase.from('order_events').insert(events)
      setSelected([])
      fetchOrders()
    } catch { alert('Failed to update orders.') }
    finally { setBulkLoading(false); setBulkModal(false); setPendingBulk(null) }
  }

  const exportCSV = () => {
    if (!orders.length) return alert('No orders to export.')
    const headers = [
      'order_number','created_at','status','product_name','landing_page_name',
      'customer_name','phone','city','address','package_name','quantity',
      'order_value','currency','notes','utm_source','utm_campaign','platform',
    ]
    const esc = (v: unknown) => {
      if (v == null) return ''
      const s = String(v)
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = orders.map((o) => [
      o.order_number, new Date(o.created_at).toISOString(), o.status,
      o.product?.product_name, o.landing_page?.page_name,
      o.customer_name, o.phone, o.city, o.address, o.package_name,
      o.quantity, o.order_value, o.currency, o.notes,
      o.utm_source, o.utm_campaign, o.platform,
    ].map(esc).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `orders_${format(new Date(), 'yyyyMMdd_HHmm')}.csv` })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const copyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(phone)
    setCopied(phone)
    setTimeout(() => setCopied(null), 1500)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ maxWidth: '1400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Page header ── */}
      <PageHeader
        title="Orders"
        subtitle="Manage incoming COD orders, confirmations, delivery status, and exports."
        action={
          <button
            onClick={fetchOrders}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-xs)',
            }}
            title="Refresh"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        }
        secondaryAction={
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-xs)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <Download size={14} /> Export CSV
          </button>
        }
      />

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Orders', value: metrics.total },
          { label: 'New', value: metrics.newOrders, color: '#1D4ED8' },
          { label: 'Confirmed', value: metrics.confirmed, color: '#15803D' },
          { label: 'Delivered', value: metrics.delivered, color: '#15803D' },
          { label: 'Cancelled', value: metrics.cancelled, color: '#B91C1C' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: m.color || 'var(--text-primary)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters card ── */}
      <div
        className="rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '16px 20px',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              Filters
            </span>
            {hasFilters && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1"
                style={{ background: 'var(--accent-light)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
              >
                Active
              </span>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent-text)' }}
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search
              size={14}
              className="absolute pointer-events-none"
              style={{ color: 'var(--text-muted)', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search name, phone, order…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...ctrlBase, paddingLeft: '36px' }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} style={ctrlBase} onFocus={onFocus} onBlur={onBlur}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={productFilter} onChange={(e) => setProduct(e.target.value)} style={ctrlBase} onFocus={onFocus} onBlur={onBlur}>
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
          </select>

          <select value={lpFilter} onChange={(e) => setLp(e.target.value)} style={ctrlBase} onFocus={onFocus} onBlur={onBlur}>
            <option value="">All pages</option>
            {lps.map((l) => <option key={l.id} value={l.id}>{l.page_name}</option>)}
          </select>

          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={{ ...ctrlBase, flex: 1, padding: '0 8px', fontSize: '12px' }}
              title="From Date"
              onFocus={onFocus} onBlur={onBlur} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              style={{ ...ctrlBase, flex: 1, padding: '0 8px', fontSize: '12px' }}
              title="To Date"
              onFocus={onFocus} onBlur={onBlur} />
          </div>
        </div>
      </div>

      {/* ── Bulk bar ── */}
      {selected.length > 0 && (
        <div
          className="flex items-center justify-between rounded-2xl px-5 py-3 fade-in"
          style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-border)',
            boxShadow: '0 2px 8px rgba(37,99,235,0.12)',
          }}
        >
          <div className="flex items-center gap-3">
            <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>
              {selected.length} order{selected.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Move to:</span>
            <select
              value={bulkStatus}
              onChange={handleBulkChange}
              disabled={bulkLoading}
              style={{
                ...ctrlBase,
                width: 'auto',
                minWidth: '150px',
                height: '34px',
                borderColor: 'var(--accent-border)',
              }}
            >
              <option value="">Select status…</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Table card ── */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          maxHeight: '68vh',
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <RefreshCw size={24} className="animate-spin mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders found"
            description={hasFilters ? "Try adjusting your filters or search query." : "You have no orders yet."}
            action={
              hasFilters ? (
                <button onClick={clearFilters} className="text-xs font-medium hover:opacity-70" style={{ color: 'var(--accent-text)' }}>
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: 44, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <input
                      type="checkbox"
                      checked={selected.length === orders.length && orders.length > 0}
                      onChange={toggleAll}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                  </th>
                  {TH_COLS.map((h) => (
                    <th
                      key={h}
                      className="text-left"
                      style={{
                        padding: '12px 16px',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
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
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(order.id)}
                        onChange={() => toggleOne(order.id)}
                        style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-mono font-bold text-xs transition-opacity hover:opacity-70"
                        style={{ color: 'var(--accent-text)' }}
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-sm font-semibold transition-opacity hover:opacity-70"
                        style={{ color: 'var(--text-primary)', display: 'block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {order.customer_name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div className="flex items-center gap-2 group" style={{ minWidth: '110px' }}>
                        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {order.phone}
                        </span>
                        <button
                          onClick={(e) => copyPhone(order.phone, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                          title="Copy phone"
                          style={{ color: copiedPhone === order.phone ? 'var(--success)' : 'var(--text-muted)' }}
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{order.city}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {order.product?.product_name ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(order.order_value, order.currency)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <QuickStatusSelect
                        orderId={order.id}
                        productId={order.product_id}
                        landingPageId={order.landing_page_id}
                        currentStatus={order.status}
                        onStatusChange={(ns) =>
                          setOrders(orders.map((o) => (o.id === order.id ? { ...o, status: ns } : o)))
                        }
                      />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {format(new Date(order.created_at), 'MMM d, HH:mm')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
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

      {/* ── Bulk confirm modal ── */}
      <Modal isOpen={bulkModalOpen} onClose={() => setBulkModal(false)} title="Confirm Bulk Update" size="sm">
        <div className="flex flex-col items-center text-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Are you sure?</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Mark <strong>{selected.length}</strong> order{selected.length !== 1 ? 's' : ''} as{' '}
              <strong>{pendingBulk}</strong>? This cannot be undone.
            </p>
          </div>
          <div className="flex w-full gap-3 pt-1">
            <button
              onClick={() => setBulkModal(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >Cancel</button>
            <button
              onClick={() => pendingBulk && executeBulk(pendingBulk)}
              disabled={bulkLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--danger)' }}
            >
              {bulkLoading ? 'Updating…' : 'Yes, update all'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
