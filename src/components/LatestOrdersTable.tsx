'use client'

import { format } from 'date-fns'
import { StatusBadge } from '@/components/StatusBadge'
import { Package, ArrowRight } from 'lucide-react'
import type { Order, OrderStatus } from '@/types'
import Link from 'next/link'

type OrderRow = Order & {
  product: { product_name: string } | null
  landing_page: { page_name: string } | null
}

function formatCurrency(value: number | null, currency = 'USD') {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function LatestOrdersTable({ orders }: { orders: OrderRow[] }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Recent Orders
        </h3>
        <Link
          href="/dashboard/orders"
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: 'var(--accent-text)' }}
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <Package size={36} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No orders yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Connect a landing page to start receiving orders
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border)' }}>
                {['Order #', 'Customer', 'Product', 'City', 'Value', 'Status', 'Time'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
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
                  className="transition-colors"
                  style={{
                    borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-2)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-xs font-mono font-semibold transition-colors"
                      style={{ color: 'var(--accent-text)' }}
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {order.customer_name}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {order.product?.product_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {order.city}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(order.order_value, order.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status as OrderStatus} type="order" />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {format(new Date(order.created_at), 'MMM d, HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
