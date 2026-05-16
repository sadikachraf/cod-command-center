export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { StatCard } from '@/components/StatCard'
import { LatestOrdersTable } from '@/components/LatestOrdersTable'
import {
  ShoppingCart, DollarSign, CheckCircle, Truck, XCircle, RotateCcw, TrendingUp, Star,
} from 'lucide-react'
import type { Order } from '@/types'
import Link from 'next/link'

function formatCurrency(value: number | null, currency = 'USD') {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)

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

  const { data: latestOrdersData } = await supabase
    .from('orders')
    .select('*, product:products(product_name), landing_page:landing_pages(page_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  const latestOrders = (latestOrdersData ?? []) as typeof orders

  // Stats
  const ordersToday      = orders.length
  const totalValueToday  = orders.reduce((sum, o) => sum + (o.order_value || 0), 0)
  const newOrders        = orders.filter((o) => o.status === 'New').length
  const confirmedOrders  = orders.filter((o) => o.status === 'Confirmed').length
  const deliveredOrders  = orders.filter((o) => o.status === 'Delivered').length
  const cancelledOrders  = orders.filter((o) => o.status === 'Cancelled').length
  const returnedOrders   = orders.filter((o) => o.status === 'Returned').length

  // Breakdown by product
  const productCount = Object.values(orders.reduce((acc, o) => {
    if (o.product_id && o.product?.product_name) {
      if (!acc[o.product_id]) acc[o.product_id] = { name: o.product.product_name, count: 0, revenue: 0, currency: o.currency }
      acc[o.product_id].count++
      acc[o.product_id].revenue += (o.order_value || 0)
    }
    return acc
  }, {} as Record<string, { name: string; count: number; revenue: number; currency: string }>)).sort((a, b) => b.count - a.count)

  // Breakdown by landing page
  const lpCount = Object.values(orders.reduce((acc, o) => {
    if (o.landing_page_id && o.landing_page?.page_name) {
      if (!acc[o.landing_page_id]) acc[o.landing_page_id] = { name: o.landing_page.page_name, count: 0, revenue: 0, currency: o.currency }
      acc[o.landing_page_id].count++
      acc[o.landing_page_id].revenue += (o.order_value || 0)
    }
    return acc
  }, {} as Record<string, { name: string; count: number; revenue: number; currency: string }>)).sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6 fade-in max-w-7xl">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Good day 👋
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · today&apos;s performance
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: 'var(--accent)',
            color: '#ffffff',
          }}
          onMouseOver={() => {}}
        >
          <ShoppingCart size={13} />
          All orders
        </Link>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Orders Today"
          value={ordersToday}
          icon={<ShoppingCart size={16} style={{ color: '#2563eb' }} />}
          iconBg="#eff6ff"
          sub="since midnight"
          highlight={ordersToday > 0}
        />
        <StatCard
          label="Revenue Today"
          value={formatCurrency(totalValueToday)}
          icon={<DollarSign size={16} style={{ color: '#16a34a' }} />}
          iconBg="#f0fdf4"
          sub="total order value"
        />
        <StatCard
          label="New"
          value={newOrders}
          icon={<TrendingUp size={16} style={{ color: '#7c3aed' }} />}
          iconBg="#faf5ff"
          sub="awaiting call"
        />
        <StatCard
          label="Confirmed"
          value={confirmedOrders}
          icon={<CheckCircle size={16} style={{ color: '#16a34a' }} />}
          iconBg="#f0fdf4"
          sub="ready to ship"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Delivered"
          value={deliveredOrders}
          icon={<Truck size={16} style={{ color: '#d97706' }} />}
          iconBg="#fffbeb"
        />
        <StatCard
          label="Cancelled"
          value={cancelledOrders}
          icon={<XCircle size={16} style={{ color: '#dc2626' }} />}
          iconBg="#fef2f2"
        />
        <StatCard
          label="Returned"
          value={returnedOrders}
          icon={<RotateCcw size={16} style={{ color: '#c2410c' }} />}
          iconBg="#fff7ed"
        />
      </div>

      {/* Breakdown tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="By Product Today">
          {productCount.length === 0 ? (
            <div className="py-6 text-center">
              <Star size={24} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No product data yet today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {productCount.map((p) => (
                <div key={p.name} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg-surface-2)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.count} orders</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(p.revenue, p.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="By Landing Page Today">
          {lpCount.length === 0 ? (
            <div className="py-6 text-center">
              <Star size={24} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No landing page data yet today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lpCount.map((lp) => (
                <div key={lp.name} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg-surface-2)' }}>
                  <span className="text-sm font-medium truncate max-w-[160px]" style={{ color: 'var(--text-primary)' }}>{lp.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lp.count} orders</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(lp.revenue, lp.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Latest orders table */}
      <LatestOrdersTable orders={latestOrders} />
    </div>
  )
}
