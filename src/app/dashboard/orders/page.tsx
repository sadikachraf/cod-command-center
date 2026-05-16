'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/StatusBadge'
import { Search, RefreshCw, Filter, ChevronRight } from 'lucide-react'
import type { Order, OrderStatus, Product, LandingPage } from '@/types'
import { format } from 'date-fns'
import Link from 'next/link'

const ORDER_STATUSES: OrderStatus[] = [
  'New', 'Confirmed', 'No Answer', 'Wrong Number',
  'Cancelled', 'Shipped', 'Delivered', 'Returned', 'Paid',
]

function formatCurrency(value: number | null, currency = 'USD') {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

type OrderRow = Order & {
  product: Pick<Product, 'product_name'> | null
  landing_page: Pick<LandingPage, 'page_name'> | null
}

export default function OrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<Pick<Product, 'id' | 'product_name'>[]>([])
  const [landingPages, setLandingPages] = useState<Pick<LandingPage, 'id' | 'page_name'>[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [lpFilter, setLpFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
    let query = supabase
      .from('orders')
      .select('*, product:products(product_name), landing_page:landing_pages(page_name)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (statusFilter) query = query.eq('status', statusFilter)
    if (productFilter) query = query.eq('product_id', productFilter)
    if (lpFilter) query = query.eq('landing_page_id', lpFilter)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)

    const { data } = await query
    let rows = (data ?? []) as OrderRow[]

    // Client-side search (name / phone)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(q) ||
          o.phone.includes(q) ||
          o.order_number.toLowerCase().includes(q)
      )
    }

    setOrders(rows)
    setLoading(false)
  }, [supabase, statusFilter, productFilter, lpFilter, dateFrom, dateTo, search])

  useEffect(() => { fetchMeta() }, [fetchMeta])
  useEffect(() => { fetchOrders() }, [fetchOrders])

  const selectStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '8px',
    fontSize: '13px',
    padding: '6px 10px',
    outline: 'none',
  }

  const inputStyle = { ...selectStyle, color: 'var(--text-primary)' }

  return (
    <div className="space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Orders</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''} shown
          </p>
        </div>
        <button onClick={fetchOrders} className="p-2 rounded-lg"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
          <Filter size={14} />
          <span className="text-xs font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Name, phone, order #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Status */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Product */}
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} style={selectStyle}>
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
          </select>

          {/* Landing Page */}
          <select value={lpFilter} onChange={(e) => setLpFilter(e.target.value)} style={selectStyle}>
            <option value="">All pages</option>
            {landingPages.map((lp) => <option key={lp.id} value={lp.id}>{lp.page_name}</option>)}
          </select>

          {/* Date range */}
          <div className="flex gap-1.5 col-span-2 sm:col-span-1">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={inputStyle} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={inputStyle} />
          </div>
        </div>

        {/* Clear filters */}
        {(search || statusFilter || productFilter || lpFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setProductFilter(''); setLpFilter(''); setDateFrom(''); setDateTo('') }}
            className="mt-2 text-xs"
            style={{ color: 'var(--accent)' }}
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="mx-auto mb-3 animate-spin opacity-40" />
            Loading orders…
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">No orders match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Order #', 'Customer', 'Phone', 'City', 'Product', 'Landing Page', 'Value', 'Status', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
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
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td className="px-4 py-3 text-xs font-mono font-medium" style={{ color: 'var(--accent)' }}>
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {order.customer_name}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{order.phone}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{order.city}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {order.product?.product_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {order.landing_page?.page_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(order.order_value, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} type="order" />
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {format(new Date(order.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="p-1.5 rounded-lg inline-flex transition-all"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      >
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
