export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { StatCard } from '@/components/StatCard'
import { LatestOrdersTable } from '@/components/LatestOrdersTable'
import {
  ShoppingCart, DollarSign, CheckCircle, Truck,
  XCircle, RotateCcw, TrendingUp, Package2, Star,
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

// ─── Reusable card for breakdown sections ────────────────────────────────────
function DashCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: '16px 24px' }}>{children}</div>
    </div>
  )
}

// ─── Row inside breakdown card ────────────────────────────────────────────────
function BreakdownRow({
  name,
  count,
  revenue,
  currency,
  rank,
}: {
  name: string
  count: number
  revenue: number
  currency: string
  rank: number
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
      style={{ background: rank === 1 ? 'var(--accent-light)' : 'var(--bg-surface-2)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = rank === 1 ? '#DBEAFE' : 'var(--bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = rank === 1 ? 'var(--accent-light)' : 'var(--bg-surface-2)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{
            background: rank === 1 ? 'var(--accent)' : 'var(--border-strong)',
            color: rank === 1 ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {rank}
        </span>
        <span
          className="text-sm font-medium truncate"
          style={{ color: rank === 1 ? 'var(--accent-text)' : 'var(--text-primary)' }}
        >
          {name}
        </span>
      </div>
      <div className="flex items-center gap-5 flex-shrink-0 ml-4">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {count} orders
        </span>
        <span
          className="text-sm font-bold"
          style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
        >
          {formatCurrency(revenue, currency)}
        </span>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

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

  // ── Stats ──
  const ordersToday     = orders.length
  const totalValue      = orders.reduce((s, o) => s + (o.order_value || 0), 0)
  const newOrders       = orders.filter((o) => o.status === 'New').length
  const confirmedOrders = orders.filter((o) => o.status === 'Confirmed').length
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length
  const cancelledOrders = orders.filter((o) => o.status === 'Cancelled').length
  const returnedOrders  = orders.filter((o) => o.status === 'Returned').length

  // ── Product breakdown ──
  const productMap = orders.reduce((acc, o) => {
    if (o.product_id && o.product?.product_name) {
      if (!acc[o.product_id]) {
        acc[o.product_id] = { name: o.product.product_name, count: 0, revenue: 0, currency: o.currency || 'USD' }
      }
      acc[o.product_id].count++
      acc[o.product_id].revenue += o.order_value || 0
    }
    return acc
  }, {} as Record<string, { name: string; count: number; revenue: number; currency: string }>)
  const productBreakdown = Object.values(productMap).sort((a, b) => b.count - a.count)

  // ── Landing page breakdown ──
  const lpMap = orders.reduce((acc, o) => {
    if (o.landing_page_id && o.landing_page?.page_name) {
      if (!acc[o.landing_page_id]) {
        acc[o.landing_page_id] = { name: o.landing_page.page_name, count: 0, revenue: 0, currency: o.currency || 'USD' }
      }
      acc[o.landing_page_id].count++
      acc[o.landing_page_id].revenue += o.order_value || 0
    }
    return acc
  }, {} as Record<string, { name: string; count: number; revenue: number; currency: string }>)
  const lpBreakdown = Object.values(lpMap).sort((a, b) => b.count - a.count)

  return (
    <div className="fade-in" style={{ maxWidth: '1280px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* ── Page header ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Good day 👋
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {format(new Date(), "EEEE, MMMM d, yyyy")} &mdash; here&apos;s your daily performance
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 flex-shrink-0"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
          >
            <ShoppingCart size={15} />
            View all orders
          </Link>
        </div>

        {/* ── Primary KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Orders Today"
            value={ordersToday}
            icon={<ShoppingCart size={18} style={{ color: '#2563EB' }} />}
            iconBg="#EFF6FF"
            sub={ordersToday === 0 ? 'none yet today' : 'received since midnight'}
            highlight={ordersToday > 0}
          />
          <StatCard
            label="Revenue Today"
            value={formatCurrency(totalValue)}
            icon={<DollarSign size={18} style={{ color: '#16A34A' }} />}
            iconBg="#F0FDF4"
            sub="total order value"
          />
          <StatCard
            label="New"
            value={newOrders}
            icon={<TrendingUp size={18} style={{ color: '#7C3AED' }} />}
            iconBg="#F5F3FF"
            sub="awaiting confirmation"
          />
          <StatCard
            label="Confirmed"
            value={confirmedOrders}
            icon={<CheckCircle size={18} style={{ color: '#16A34A' }} />}
            iconBg="#F0FDF4"
            sub="ready to ship"
          />
        </div>

        {/* ── Secondary KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Delivered"
            value={deliveredOrders}
            icon={<Truck size={18} style={{ color: '#D97706' }} />}
            iconBg="#FFFBEB"
            sub="completed today"
          />
          <StatCard
            label="Cancelled"
            value={cancelledOrders}
            icon={<XCircle size={18} style={{ color: '#DC2626' }} />}
            iconBg="#FEF2F2"
            sub="this session"
          />
          <StatCard
            label="Returned"
            value={returnedOrders}
            icon={<RotateCcw size={18} style={{ color: '#C2410C' }} />}
            iconBg="#FFF7ED"
            sub="processed today"
          />
        </div>

        {/* ── Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DashCard
            title="By Product"
            subtitle={`${productBreakdown.length} product${productBreakdown.length !== 1 ? 's' : ''} with orders today`}
          >
            {productBreakdown.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center" style={{ background: 'var(--bg-muted)' }}>
                  <Package2 size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No orders today yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Breakdown will appear when orders arrive</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {productBreakdown.map((p, i) => (
                  <BreakdownRow key={p.name} name={p.name} count={p.count} revenue={p.revenue} currency={p.currency} rank={i + 1} />
                ))}
              </div>
            )}
          </DashCard>

          <DashCard
            title="By Landing Page"
            subtitle={`${lpBreakdown.length} page${lpBreakdown.length !== 1 ? 's' : ''} active today`}
          >
            {lpBreakdown.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center" style={{ background: 'var(--bg-muted)' }}>
                  <Star size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No landing page data yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Breakdown will appear when orders arrive</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {lpBreakdown.map((lp, i) => (
                  <BreakdownRow key={lp.name} name={lp.name} count={lp.count} revenue={lp.revenue} currency={lp.currency} rank={i + 1} />
                ))}
              </div>
            )}
          </DashCard>
        </div>

        {/* ── Recent orders ── */}
        <LatestOrdersTable orders={latestOrders} />

      </div>
    </div>
  )
}
