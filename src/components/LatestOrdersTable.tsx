'use client'

import { format } from 'date-fns'
import { StatusBadge } from '@/components/StatusBadge'
import { Package } from 'lucide-react'
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
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Latest Orders
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--accent-glow)',
            color: 'var(--accent)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          {orders.length} recent
        </span>
      </div>

      <div className="overflow-x-auto">
        {orders.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No orders yet. Connect a landing page to start receiving orders.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Order #', 'Customer', 'Product', 'Landing Page', 'City', 'Value', 'Status', 'Time'].map((h) => (
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-xs font-mono font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {order.customer_name}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {order.product?.product_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {order.landing_page?.page_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {order.city}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
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
        )}
      </div>
    </div>
  )
}
