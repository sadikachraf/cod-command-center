export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { StatCard } from '@/components/StatCard'
import { LatestOrdersTable } from '@/components/LatestOrdersTable'
import {
  ShoppingCart,
  DollarSign,
  CheckCircle,
  Truck,
  Globe,
  Star,
  TrendingUp,
} from 'lucide-react'
import type { Order } from '@/types'
import Link from 'next/link'

function formatCurrency(value: number | null, currency = 'USD') {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Date range: today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Fetch today's orders
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('*, product:products(product_name), landing_page:landing_pages(page_name)')
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())
    .order('created_at', { ascending: false })

  const orders = (todayOrders ?? []) as (Order & {
    product: { product_name: string } | null
    landing_page: { page_name: string } | null
  })[]

  // Fetch last 20 orders for the table
  const { data: latestOrdersData } = await supabase
    .from('orders')
    .select('*, product:products(product_name), landing_page:landing_pages(page_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  const latestOrders = (latestOrdersData ?? []) as typeof orders

  // Stats
  const ordersToday = orders.length
  const totalValueToday = orders.reduce((sum, o) => sum + (o.order_value || 0), 0)
  const newOrders = orders.filter((o) => o.status === 'New').length
  const confirmedOrders = orders.filter((o) => o.status === 'Confirmed').length
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length

  // Top product today
  const productCount: Record<string, { name: string; count: number }> = {}
  orders.forEach((o) => {
    if (o.product_id && o.product?.product_name) {
      if (!productCount[o.product_id]) {
        productCount[o.product_id] = { name: o.product.product_name, count: 0 }
      }
      productCount[o.product_id].count++
    }
  })
  const topProduct = Object.values(productCount).sort((a, b) => b.count - a.count)[0]

  // Top landing page today
  const lpCount: Record<string, { name: string; count: number }> = {}
  orders.forEach((o) => {
    if (o.landing_page_id && o.landing_page?.page_name) {
      if (!lpCount[o.landing_page_id]) {
        lpCount[o.landing_page_id] = { name: o.landing_page.page_name, count: 0 }
      }
      lpCount[o.landing_page_id].count++
    }
  })
  const topLP = Object.values(lpCount).sort((a, b) => b.count - a.count)[0]

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Good day 👋
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: 'var(--accent-glow)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: 'var(--accent)',
          }}
        >
          View all orders
        </Link>
      </div>

      {/* Stats Grid — StatCard is a Client Component, safe to use here */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Orders Today"
          value={ordersToday}
          icon={<ShoppingCart size={18} style={{ color: '#60a5fa' }} />}
          iconBg="rgba(59,130,246,0.12)"
          sub="since midnight"
        />
        <StatCard
          label="Revenue Today"
          value={formatCurrency(totalValueToday)}
          icon={<DollarSign size={18} style={{ color: '#34d399' }} />}
          iconBg="rgba(16,185,129,0.12)"
          sub="combined order value"
        />
        <StatCard
          label="New Orders"
          value={newOrders}
          icon={<TrendingUp size={18} style={{ color: '#a78bfa' }} />}
          iconBg="rgba(139,92,246,0.12)"
          sub="awaiting confirmation"
        />
        <StatCard
          label="Confirmed"
          value={confirmedOrders}
          icon={<CheckCircle size={18} style={{ color: '#34d399' }} />}
          iconBg="rgba(16,185,129,0.12)"
          sub="ready to ship"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Delivered Today"
          value={deliveredOrders}
          icon={<Truck size={18} style={{ color: '#fbbf24' }} />}
          iconBg="rgba(245,158,11,0.12)"
        />
        <StatCard
          label="Top Product"
          value={topProduct?.name ?? '—'}
          icon={<Star size={18} style={{ color: '#a78bfa' }} />}
          iconBg="rgba(139,92,246,0.12)"
          sub={topProduct ? `${topProduct.count} orders` : 'No orders yet'}
        />
        <StatCard
          label="Top Landing Page"
          value={topLP?.name ?? '—'}
          icon={<Globe size={18} style={{ color: '#60a5fa' }} />}
          iconBg="rgba(59,130,246,0.12)"
          sub={topLP ? `${topLP.count} orders` : 'No orders yet'}
        />
      </div>

      {/* Latest Orders — Client Component handles the interactive table rows */}
      <LatestOrdersTable orders={latestOrders} />
    </div>
  )
}
