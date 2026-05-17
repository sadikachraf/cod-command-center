'use client'

import { useMemo, useState } from 'react'
import { subDays, startOfDay, endOfDay, format as fmtDate } from 'date-fns'
import { Filter, X } from 'lucide-react'
import type { Order, Product, LandingPage } from '@/types'
import {
  calcKPIs, groupByDay, groupByProduct, groupByLP,
  groupBySource, groupByCampaign,
} from '@/lib/analytics'
import {
  KpiCard, SectionCard, DecisionBadge, ExportBtn,
  TH, TD, TD_STRONG, TD_NUM, RateCell, EmptyRow, fmt, pct, num,
} from './AnalyticsUI'
import { OrdersBarChart, RevenueLineChart } from './AnalyticsCharts'
import { PageHeader } from '@/components/PageHeader'

// ── Date range presets ────────────────────────────────────────────────────────
type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

function resolveRange(preset: Preset, from: string, to: string): [Date, Date] {
  const now = new Date()
  switch (preset) {
    case 'today':     return [startOfDay(now), endOfDay(now)]
    case 'yesterday': { const y = subDays(now, 1); return [startOfDay(y), endOfDay(y)] }
    case '7d':        return [startOfDay(subDays(now, 6)), endOfDay(now)]
    case '30d':       return [startOfDay(subDays(now, 29)), endOfDay(now)]
    case 'custom':    return [
      from ? startOfDay(new Date(from)) : startOfDay(subDays(now, 6)),
      to   ? endOfDay(new Date(to))     : endOfDay(now),
    ]
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  orders:   Order[]
  products: Product[]
  lps:      LandingPage[]
}

// ── Control style ─────────────────────────────────────────────────────────────
const ctrl: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', borderRadius: '10px',
  fontSize: '13px', height: '34px', padding: '0 10px', outline: 'none',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard({ orders, products, lps }: Props) {
  // ── Filter state ──
  const [preset, setPreset]   = useState<Preset>('7d')
  const [fromDate, setFrom]   = useState('')
  const [toDate, setTo]       = useState('')
  const [prodFilter, setProd] = useState('')
  const [lpFilter, setLp]     = useState('')
  const [srcFilter, setSrc]   = useState('')

  // ── Lookup maps ──
  const productNames  = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.product_name])), [products])
  const lpNames       = useMemo(() => Object.fromEntries(lps.map((l) => [l.id, l.page_name])), [lps])
  const lpProductMap  = useMemo(() => Object.fromEntries(lps.map((l) => [l.id, l.product_id])), [lps])

  // ── Filtered orders ──
  const filtered = useMemo(() => {
    const [start, end] = resolveRange(preset, fromDate, toDate)
    return orders.filter((o) => {
      const t = new Date(o.created_at)
      if (t < start || t > end) return false
      if (prodFilter && o.product_id !== prodFilter) return false
      if (lpFilter   && o.landing_page_id !== lpFilter) return false
      if (srcFilter  && (o.utm_source ?? '(direct)') !== srcFilter) return false
      return true
    })
  }, [orders, preset, fromDate, toDate, prodFilter, lpFilter, srcFilter])

  // ── Computed data ──
  const kpis           = useMemo(() => calcKPIs(filtered), [filtered])
  const dayRows        = useMemo(() => groupByDay(filtered), [filtered])
  const productRows    = useMemo(() => groupByProduct(filtered, productNames), [filtered, productNames])
  const lpRows         = useMemo(() => groupByLP(filtered, lpNames, productNames, lpProductMap), [filtered, lpNames, productNames, lpProductMap])
  const sourceRows     = useMemo(() => groupBySource(filtered), [filtered])
  const campaignRows   = useMemo(() => groupByCampaign(filtered), [filtered])

  // ── All unique sources (for source filter) ──
  const allSources = useMemo(() =>
    [...new Set(orders.map((o) => o.utm_source ?? '(direct)'))].sort()
  , [orders])

  const hasFilters = !!(prodFilter || lpFilter || srcFilter || preset === 'custom')

  // ── CSV data ──
  const productCSV = productRows.map((r) => ({
    product: r.productName, orders: r.kpis.totalOrders,
    value: r.kpis.totalValue, confirmed: r.kpis.confirmedOrders,
    delivered: r.kpis.deliveredOrders, cancelled: r.kpis.cancelledOrders,
    returned: r.kpis.returnedOrders, confirmation_rate: pct(r.confirmationRate),
    delivery_rate: pct(r.deliveryRate), aov: fmt(r.kpis.avgOrderValue, r.currency),
    decision: r.decision,
  }))

  const lpCSV = lpRows.map((r) => ({
    landing_page: r.lpName, product: r.productName,
    orders: r.kpis.totalOrders, value: r.kpis.totalValue,
    confirmed: r.kpis.confirmedOrders, delivered: r.kpis.deliveredOrders,
    cancelled: r.kpis.cancelledOrders, returned: r.kpis.returnedOrders,
    confirmation_rate: pct(r.confirmationRate), delivery_rate: pct(r.deliveryRate),
    aov: fmt(r.kpis.avgOrderValue, r.currency), decision: r.decision,
  }))

  const sourceCSV = sourceRows.map((r) => ({
    utm_source: r.source, platform: r.platform,
    orders: r.kpis.totalOrders, value: r.kpis.totalValue,
    confirmed: r.kpis.confirmedOrders, cancelled: r.kpis.cancelledOrders,
    delivered: r.kpis.deliveredOrders,
    confirmation_rate: pct(r.confirmationRate), aov: fmt(r.kpis.avgOrderValue, r.currency),
    decision: r.decision,
  }))

  const campaignCSV = campaignRows.map((r) => ({
    utm_campaign: r.campaign, orders: r.kpis.totalOrders, value: r.kpis.totalValue,
    confirmed: r.kpis.confirmedOrders, cancelled: r.kpis.cancelledOrders,
    delivered: r.kpis.deliveredOrders,
    confirmation_rate: pct(r.confirmationRate), aov: fmt(r.kpis.avgOrderValue, r.currency),
    decision: r.decision,
  }))

  const currency = filtered[0]?.currency ?? 'USD'

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ maxWidth: '1400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Page header ── */}
      <PageHeader
        title="Analytics"
        subtitle={`Decision dashboard · ${filtered.length} orders in selected period`}
      />

      {/* ── Filters ── */}
      <div className="rounded-2xl" style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)', padding: '16px 20px',
      }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={13} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Filters</span>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setProd(''); setLp(''); setSrc(''); setPreset('7d'); setFrom(''); setTo('') }}
              className="flex items-center gap-1 text-xs font-medium hover:opacity-70"
              style={{ color: 'var(--accent-text)' }}
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* Date presets */}
          {(['today','yesterday','7d','30d','custom'] as Preset[]).map((p) => (
            <button key={p}
              onClick={() => setPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: preset === p ? 'var(--accent)' : 'var(--bg-muted)',
                color:      preset === p ? '#fff' : 'var(--text-secondary)',
                border:     `1px solid ${preset === p ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Custom'}
            </button>
          ))}

          {preset === 'custom' && (
            <>
              <input type="date" value={fromDate} onChange={(e) => setFrom(e.target.value)}
                style={{ ...ctrl, width: '130px' }} />
              <input type="date" value={toDate} onChange={(e) => setTo(e.target.value)}
                style={{ ...ctrl, width: '130px' }} />
            </>
          )}

          {/* Product filter */}
          <select value={prodFilter} onChange={(e) => setProd(e.target.value)} style={{ ...ctrl, minWidth: '140px' }}>
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
          </select>

          {/* Landing page filter */}
          <select value={lpFilter} onChange={(e) => setLp(e.target.value)} style={{ ...ctrl, minWidth: '150px' }}>
            <option value="">All pages</option>
            {lps.map((l) => <option key={l.id} value={l.id}>{l.page_name}</option>)}
          </select>

          {/* Source filter */}
          <select value={srcFilter} onChange={(e) => setSrc(e.target.value)} style={{ ...ctrl, minWidth: '130px' }}>
            <option value="">All sources</option>
            {allSources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard label="Total Orders"      value={kpis.totalOrders} sub="in period" />
        <KpiCard label="Revenue"           value={fmt(kpis.totalValue, currency)} />
        <KpiCard label="Avg Order Value"   value={fmt(kpis.avgOrderValue, currency)} />
        <KpiCard label="Confirmation Rate" value={pct(kpis.confirmationRate)} color={kpis.confirmationRate >= 60 ? '#16A34A' : kpis.confirmationRate >= 40 ? '#D97706' : '#DC2626'} sub="conf+ship+del+paid / total" />
        <KpiCard label="Delivery Rate"     value={pct(kpis.deliveryRate)}     color={kpis.deliveryRate >= 60 ? '#16A34A' : '#D97706'}           sub="delivered / confirmed" />
        <KpiCard label="Cancellation Rate" value={pct(kpis.cancellationRate)} color={kpis.cancellationRate >= 40 ? '#DC2626' : '#D97706'}        sub="cancelled / total" />
        <KpiCard label="New"        value={num(kpis.newOrders)} />
        <KpiCard label="Confirmed"  value={num(kpis.confirmedOrders)} color="#16A34A" />
        <KpiCard label="Shipped"    value={num(kpis.shippedOrders)} color="#7C3AED" />
        <KpiCard label="Delivered"  value={num(kpis.deliveredOrders)} color="#059669" />
        <KpiCard label="Cancelled"  value={num(kpis.cancelledOrders)} color="#DC2626" />
        <KpiCard label="Returned"   value={num(kpis.returnedOrders)} color="#C2410C" />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Orders by Day" subtitle="Total, confirmed, cancelled">
          <div style={{ padding: '16px 20px' }}>
            <OrdersBarChart data={dayRows} />
          </div>
        </SectionCard>
        <SectionCard title="Revenue by Day">
          <div style={{ padding: '16px 20px' }}>
            <RevenueLineChart data={dayRows} />
          </div>
        </SectionCard>
      </div>

      {/* ── Orders by day table ── */}
      <SectionCard title="Day-by-Day Breakdown" subtitle={`${dayRows.length} days`}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Date','Orders','Value','Confirmed','Cancelled','Delivered'].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayRows.length === 0 ? <EmptyRow cols={6} /> : dayRows.map((d, i) => (
              <tr key={d.date}
                style={{ borderBottom: i < dayRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={TD_STRONG}>{fmtDate(new Date(d.date), 'EEE, MMM d')}</td>
                <td style={TD_NUM}>{d.orders}</td>
                <td style={TD_NUM}>{fmt(d.value, currency)}</td>
                <td style={{ ...TD_NUM, color: '#16A34A', fontWeight: 600 }}>{d.confirmed}</td>
                <td style={{ ...TD_NUM, color: '#DC2626', fontWeight: 600 }}>{d.cancelled}</td>
                <td style={{ ...TD_NUM, color: '#059669', fontWeight: 600 }}>{d.delivered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* ── Product performance ── */}
      <SectionCard
        title="Product Performance"
        subtitle={`${productRows.length} products`}
        action={<ExportBtn rows={productCSV as Record<string, unknown>[]} filename={`product_analytics_${fmtDate(new Date(),'yyyyMMdd')}.csv`} />}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Product','Orders','Value','New','Conf','Ship','Del','Ret','Canc','Conf%','Del%','AOV','Signal'].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productRows.length === 0 ? <EmptyRow cols={13} /> : productRows.map((r, i) => (
              <tr key={r.productId}
                style={{ borderBottom: i < productRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={TD_STRONG}>{r.productName}</td>
                <td style={{ ...TD_NUM, color: 'var(--text-primary)', fontWeight: 700 }}>{r.kpis.totalOrders}</td>
                <td style={TD_NUM}>{fmt(r.kpis.totalValue, r.currency)}</td>
                <td style={TD_NUM}>{r.kpis.newOrders}</td>
                <td style={{ ...TD_NUM, color: '#16A34A', fontWeight: 600 }}>{r.kpis.confirmedOrders}</td>
                <td style={TD_NUM}>{r.kpis.shippedOrders}</td>
                <td style={{ ...TD_NUM, color: '#059669', fontWeight: 600 }}>{r.kpis.deliveredOrders}</td>
                <td style={TD_NUM}>{r.kpis.returnedOrders}</td>
                <td style={{ ...TD_NUM, color: '#DC2626', fontWeight: 600 }}>{r.kpis.cancelledOrders}</td>
                <RateCell value={r.confirmationRate} good />
                <RateCell value={r.deliveryRate} good />
                <td style={TD_NUM}>{fmt(r.kpis.avgOrderValue, r.currency)}</td>
                <td style={TD}><DecisionBadge label={r.decision} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* ── Landing page performance ── */}
      <SectionCard
        title="Landing Page Performance"
        subtitle={`${lpRows.length} pages`}
        action={<ExportBtn rows={lpCSV as Record<string, unknown>[]} filename={`lp_analytics_${fmtDate(new Date(),'yyyyMMdd')}.csv`} />}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Page','Product','Orders','Value','Conf','Del','Ret','Canc','Conf%','Del%','AOV','Signal'].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lpRows.length === 0 ? <EmptyRow cols={12} /> : lpRows.map((r, i) => (
              <tr key={r.lpId}
                style={{ borderBottom: i < lpRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={TD_STRONG}>{r.lpName}</td>
                <td style={TD}>{r.productName}</td>
                <td style={{ ...TD_NUM, color: 'var(--text-primary)', fontWeight: 700 }}>{r.kpis.totalOrders}</td>
                <td style={TD_NUM}>{fmt(r.kpis.totalValue, r.currency)}</td>
                <td style={{ ...TD_NUM, color: '#16A34A', fontWeight: 600 }}>{r.kpis.confirmedOrders}</td>
                <td style={{ ...TD_NUM, color: '#059669', fontWeight: 600 }}>{r.kpis.deliveredOrders}</td>
                <td style={TD_NUM}>{r.kpis.returnedOrders}</td>
                <td style={{ ...TD_NUM, color: '#DC2626', fontWeight: 600 }}>{r.kpis.cancelledOrders}</td>
                <RateCell value={r.confirmationRate} good />
                <RateCell value={r.deliveryRate} good />
                <td style={TD_NUM}>{fmt(r.kpis.avgOrderValue, r.currency)}</td>
                <td style={TD}><DecisionBadge label={r.decision} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* ── Source performance ── */}
      <SectionCard
        title="Source / UTM Performance"
        subtitle={`${sourceRows.length} sources`}
        action={<ExportBtn rows={sourceCSV as Record<string, unknown>[]} filename={`source_analytics_${fmtDate(new Date(),'yyyyMMdd')}.csv`} />}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['UTM Source','Platform','Orders','Value','Conf','Canc','Del','Conf%','AOV','Signal'].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sourceRows.length === 0 ? <EmptyRow cols={10} /> : sourceRows.map((r, i) => (
              <tr key={`${r.source}${r.platform}`}
                style={{ borderBottom: i < sourceRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={TD_STRONG}>{r.source}</td>
                <td style={TD}>{r.platform}</td>
                <td style={{ ...TD_NUM, color: 'var(--text-primary)', fontWeight: 700 }}>{r.kpis.totalOrders}</td>
                <td style={TD_NUM}>{fmt(r.kpis.totalValue, r.currency)}</td>
                <td style={{ ...TD_NUM, color: '#16A34A', fontWeight: 600 }}>{r.kpis.confirmedOrders}</td>
                <td style={{ ...TD_NUM, color: '#DC2626', fontWeight: 600 }}>{r.kpis.cancelledOrders}</td>
                <td style={{ ...TD_NUM, color: '#059669', fontWeight: 600 }}>{r.kpis.deliveredOrders}</td>
                <RateCell value={r.confirmationRate} good />
                <td style={TD_NUM}>{fmt(r.kpis.avgOrderValue, r.currency)}</td>
                <td style={TD}><DecisionBadge label={r.decision} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* ── Campaign performance ── */}
      <SectionCard
        title="Campaign Performance"
        subtitle={`${campaignRows.length} campaigns`}
        action={<ExportBtn rows={campaignCSV as Record<string, unknown>[]} filename={`campaign_analytics_${fmtDate(new Date(),'yyyyMMdd')}.csv`} />}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Campaign','Orders','Value','Conf','Canc','Del','Conf%','AOV','Signal'].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaignRows.length === 0 ? <EmptyRow cols={9} /> : campaignRows.map((r, i) => (
              <tr key={r.campaign}
                style={{ borderBottom: i < campaignRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <td style={TD_STRONG}>{r.campaign}</td>
                <td style={{ ...TD_NUM, color: 'var(--text-primary)', fontWeight: 700 }}>{r.kpis.totalOrders}</td>
                <td style={TD_NUM}>{fmt(r.kpis.totalValue, r.currency)}</td>
                <td style={{ ...TD_NUM, color: '#16A34A', fontWeight: 600 }}>{r.kpis.confirmedOrders}</td>
                <td style={{ ...TD_NUM, color: '#DC2626', fontWeight: 600 }}>{r.kpis.cancelledOrders}</td>
                <td style={{ ...TD_NUM, color: '#059669', fontWeight: 600 }}>{r.kpis.deliveredOrders}</td>
                <RateCell value={r.confirmationRate} good />
                <td style={TD_NUM}>{fmt(r.kpis.avgOrderValue, r.currency)}</td>
                <td style={TD}><DecisionBadge label={r.decision} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

    </div>
  )
}
