'use client'

import { format } from 'date-fns'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
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

const COL_HEADERS = ['Order', 'Customer', 'Product', 'City', 'Value', 'Status', 'Date']

export function LatestOrdersTable({ orders }: { orders: OrderRow[] }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Recent Orders
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Last {orders.length} orders across all landing pages
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            color: 'var(--accent-text)',
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#DBEAFE'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-light)'
          }}
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Connect a landing page with an API key to start receiving orders."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border)' }}>
                {COL_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="text-left"
                    style={{
                      padding: '10px 20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
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
                  className="transition-colors"
                  style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-mono font-bold text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--accent-text)' }}
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {order.customer_name}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {order.product?.product_name ?? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {order.city}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span
                      className="text-sm font-bold"
                      style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatCurrency(order.order_value, order.currency)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <StatusBadge status={order.status as OrderStatus} type="order" />
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {format(new Date(order.created_at), 'MMM d, HH:mm')}
                    </span>
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
