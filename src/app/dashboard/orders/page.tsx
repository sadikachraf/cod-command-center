'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, RefreshCw, Filter, ChevronRight, Copy, Download, AlertTriangle } from 'lucide-react'
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

  // Bulk Actions
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('')
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [pendingBulkStatus, setPendingBulkStatus] = useState<OrderStatus | null>(null)

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
    setSelectedOrders([])
    setLoading(false)
  }, [supabase, statusFilter, productFilter, lpFilter, dateFrom, dateTo, search])

  useEffect(() => { fetchMeta() }, [fetchMeta])
  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleBulkSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus
    setBulkStatus('') // reset select UI
    if (!newStatus || selectedOrders.length === 0) return

    if (DANGEROUS_BULK_STATUSES.includes(newStatus)) {
      setPendingBulkStatus(newStatus)
      setBulkModalOpen(true)
    } else {
      executeBulkUpdate(newStatus)
    }
  }

  const executeBulkUpdate = async (newStatus: OrderStatus) => {
    if (selectedOrders.length === 0) return
    setIsBulkUpdating(true)
    
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).in('id', selectedOrders)
      if (error) throw error

      const eventsToInsert = orders
        .filter(o => selectedOrders.includes(o.id) && o.status !== newStatus)
        .map(o => ({
          order_id: o.id,
          product_id: o.product_id,
          landing_page_id: o.landing_page_id,
          event_type: 'status_changed',
          event_data: { from: o.status, to: newStatus }
        }))
        
      if (eventsToInsert.length > 0) {
        await supabase.from('order_events').insert(eventsToInsert)
      }

      setSelectedOrders([])
      fetchOrders()
    } catch (err) {
      console.error('Bulk update error', err)
      alert('Error updating orders')
    } finally {
      setIsBulkUpdating(false)
      setBulkModalOpen(false)
      setPendingBulkStatus(null)
    }
  }

  const toggleOrderSelection = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedOrders.length === orders.length) setSelectedOrders([])
    else setSelectedOrders(orders.map(o => o.id))
  }

  const exportCSV = () => {
    if (orders.length === 0) return alert('No orders to export.')
    
    const headers = [
      'order_number', 'created_at', 'status', 'product_name', 'landing_page_name',
      'customer_name', 'phone', 'city', 'address', 'package_name', 'quantity',
      'order_value', 'currency', 'notes', 'utm_source', 'utm_campaign', 'utm_content',
      'platform', 'device', 'browser'
    ]

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = orders.map(o => [
      o.order_number,
      new Date(o.created_at).toISOString(),
      o.status,
      o.product?.product_name,
      o.landing_page?.page_name,
      o.customer_name,
      o.phone,
      o.city,
      o.address,
      o.package_name,
      o.quantity,
      o.order_value,
      o.currency,
      o.notes,
      o.utm_source,
      o.utm_campaign,
      o.utm_content,
      o.platform,
      o.device,
      o.browser
    ].map(escapeCSV).join(','))

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `orders_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(phone)
  }

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
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
            style={{ color: 'var(--text-primary)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <Download size={14} /> Export CSV
          </button>
          <button onClick={fetchOrders} className="p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Filter size={14} />
            <span className="text-xs font-medium">Filters</span>
          </div>
          {(search || statusFilter || productFilter || lpFilter || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setProductFilter(''); setLpFilter(''); setDateFrom(''); setDateTo('') }}
              className="text-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Name, phone, order #…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm focus:outline-none" style={inputStyle} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} style={selectStyle}>
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
          </select>
          <select value={lpFilter} onChange={(e) => setLpFilter(e.target.value)} style={selectStyle}>
            <option value="">All pages</option>
            {landingPages.map((lp) => <option key={lp.id} value={lp.id}>{lp.page_name}</option>)}
          </select>
          <div className="flex gap-1.5 col-span-2 sm:col-span-1">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={inputStyle} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedOrders.length > 0 && (
        <div className="rounded-xl p-3 flex items-center justify-between fade-in" style={{ background: 'var(--accent-glow)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{selectedOrders.length} orders selected</span>
          <div className="flex gap-2 items-center">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Bulk update status:</span>
            <select value={bulkStatus} onChange={handleBulkSelect} className="px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none cursor-pointer" style={inputStyle} disabled={isBulkUpdating}>
              <option value="">Select status...</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '70vh' }}>
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
          <div className="overflow-x-auto overflow-y-auto relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 shadow-sm" style={{ background: 'var(--bg-card)' }}>
                <tr>
                  <th className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={selectedOrders.length > 0 && selectedOrders.length === orders.length} onChange={toggleAll} className="rounded border-gray-600 bg-transparent" />
                  </th>
                  {['Order #', 'Customer', 'Phone', 'City', 'Product', 'Landing Page', 'Value', 'Status', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
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
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => toggleOrderSelection(order.id)} className="rounded border-gray-600 bg-transparent" />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-medium" style={{ color: 'var(--accent)' }}>
                      <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">{order.order_number}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">{order.customer_name}</Link>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {order.phone}
                      <button onClick={(e) => copyPhone(order.phone, e)} title="Copy Phone" className="text-gray-500 hover:text-white transition-colors"><Copy size={12} /></button>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{order.city}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{order.product?.product_name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{order.landing_page?.page_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{formatCurrency(order.order_value, order.currency)}</td>
                    <td className="px-4 py-3">
                      <QuickStatusSelect
                        orderId={order.id}
                        productId={order.product_id}
                        landingPageId={order.landing_page_id}
                        currentStatus={order.status}
                        onStatusChange={(newStatus) => {
                          setOrders(orders.map(o => o.id === order.id ? { ...o, status: newStatus } : o))
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{format(new Date(order.created_at), 'MMM d, HH:mm')}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/orders/${order.id}`} className="p-1.5 rounded-lg inline-flex transition-all" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
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

      <Modal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Confirm Bulk Update" size="sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Are you sure?</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to mark <strong>{selectedOrders.length}</strong> orders as <strong>{pendingBulkStatus}</strong>?
            </p>
          </div>
          <div className="flex w-full gap-3 pt-4">
            <button onClick={() => setBulkModalOpen(false)} className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>Cancel</button>
            <button onClick={() => pendingBulkStatus && executeBulkUpdate(pendingBulkStatus)} disabled={isBulkUpdating} className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors" style={{ background: '#ef4444' }}>
              {isBulkUpdating ? 'Updating...' : 'Yes, update all'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
