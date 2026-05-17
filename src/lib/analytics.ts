/**
 * Analytics calculation utilities for COD Command Center.
 * Pure functions — no Supabase, no React. Safe to use in both server and client.
 */

import type { Order, OrderStatus } from '@/types'

// ── Decision label thresholds (configurable) ─────────────────────────────────
const MIN_ORDERS_FOR_LABEL = 5       // Below this → "Not enough data"
const WINNER_CONF_RATE     = 60      // >= 60% confirmation rate → Winner
const PROBLEM_CANC_RATE    = 40      // >= 40% cancellation+no-answer rate → Problem

export type DecisionLabel = 'Winner' | 'Watch' | 'Problem' | 'Not enough data'

// ── Status groupings ──────────────────────────────────────────────────────────
export const CONFIRMED_STATUSES: OrderStatus[] = ['Confirmed', 'Shipped', 'Delivered', 'Paid']
export const DELIVERED_STATUSES: OrderStatus[] = ['Delivered', 'Paid']
export const CANCELLED_STATUSES: OrderStatus[] = ['Cancelled']
export const PROBLEM_STATUSES:   OrderStatus[] = ['Cancelled', 'No Answer', 'Wrong Number', 'Returned']

// ── KPI calculations ──────────────────────────────────────────────────────────
export interface KPIs {
  totalOrders:      number
  totalValue:       number
  newOrders:        number
  confirmedOrders:  number
  cancelledOrders:  number
  shippedOrders:    number
  deliveredOrders:  number
  returnedOrders:   number
  noAnswerOrders:   number
  wrongNumberOrders:number
  paidOrders:       number
  confirmationRate: number   // (Confirmed+Shipped+Delivered+Paid) / total * 100
  deliveryRate:     number   // (Delivered+Paid) / (Confirmed+Shipped+Delivered+Paid) * 100
  cancellationRate: number   // Cancelled / total * 100
  avgOrderValue:    number
}

export function calcKPIs(orders: Order[]): KPIs {
  const total = orders.length
  const totalValue = orders.reduce((s, o) => s + (o.order_value || 0), 0)

  const newOrders         = orders.filter((o) => o.status === 'New').length
  const confirmedOrders   = orders.filter((o) => o.status === 'Confirmed').length
  const cancelledOrders   = orders.filter((o) => o.status === 'Cancelled').length
  const shippedOrders     = orders.filter((o) => o.status === 'Shipped').length
  const deliveredOrders   = orders.filter((o) => o.status === 'Delivered').length
  const returnedOrders    = orders.filter((o) => o.status === 'Returned').length
  const noAnswerOrders    = orders.filter((o) => o.status === 'No Answer').length
  const wrongNumberOrders = orders.filter((o) => o.status === 'Wrong Number').length
  const paidOrders        = orders.filter((o) => o.status === 'Paid').length

  const confirmedGroup = confirmedOrders + shippedOrders + deliveredOrders + paidOrders
  const deliveredGroup = deliveredOrders + paidOrders

  const confirmationRate = total > 0 ? (confirmedGroup / total) * 100 : 0
  const deliveryRate     = confirmedGroup > 0 ? (deliveredGroup / confirmedGroup) * 100 : 0
  const cancellationRate = total > 0 ? (cancelledOrders / total) * 100 : 0
  const avgOrderValue    = total > 0 ? totalValue / total : 0

  return {
    totalOrders: total, totalValue,
    newOrders, confirmedOrders, cancelledOrders, shippedOrders,
    deliveredOrders, returnedOrders, noAnswerOrders, wrongNumberOrders, paidOrders,
    confirmationRate, deliveryRate, cancellationRate, avgOrderValue,
  }
}

// ── Decision label ────────────────────────────────────────────────────────────
export function getDecisionLabel(orders: Order[]): DecisionLabel {
  const total = orders.length
  if (total < MIN_ORDERS_FOR_LABEL) return 'Not enough data'
  const kpis = calcKPIs(orders)
  const problemRate = kpis.cancellationRate + (kpis.noAnswerOrders + kpis.wrongNumberOrders) / total * 100
  if (kpis.confirmationRate >= WINNER_CONF_RATE) return 'Winner'
  if (problemRate >= PROBLEM_CANC_RATE)          return 'Problem'
  return 'Watch'
}

// ── Orders by day ─────────────────────────────────────────────────────────────
export interface DayRow {
  date:      string   // YYYY-MM-DD
  orders:    number
  value:     number
  confirmed: number
  cancelled: number
  delivered: number
}

export function groupByDay(orders: Order[]): DayRow[] {
  const map: Record<string, Order[]> = {}
  for (const o of orders) {
    const d = o.created_at.slice(0, 10)
    if (!map[d]) map[d] = []
    map[d].push(o)
  }
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rows]) => {
      const kpis = calcKPIs(rows)
      return {
        date,
        orders:    kpis.totalOrders,
        value:     kpis.totalValue,
        confirmed: kpis.confirmedOrders + kpis.shippedOrders + kpis.deliveredOrders + kpis.paidOrders,
        cancelled: kpis.cancelledOrders,
        delivered: kpis.deliveredOrders + kpis.paidOrders,
      }
    })
}

// ── Product performance ───────────────────────────────────────────────────────
export interface ProductRow {
  productId:        string
  productName:      string
  orders:           Order[]
  kpis:             KPIs
  confirmationRate: number
  deliveryRate:     number
  cancellationRate: number
  decision:         DecisionLabel
  currency:         string
}

export function groupByProduct(
  orders: Order[],
  productNames: Record<string, string>,
): ProductRow[] {
  const map: Record<string, Order[]> = {}
  for (const o of orders) {
    if (!o.product_id) continue
    if (!map[o.product_id]) map[o.product_id] = []
    map[o.product_id].push(o)
  }
  return Object.entries(map)
    .map(([id, rows]) => {
      const kpis = calcKPIs(rows)
      return {
        productId:        id,
        productName:      productNames[id] ?? 'Unknown',
        orders:           rows,
        kpis,
        confirmationRate: kpis.confirmationRate,
        deliveryRate:     kpis.deliveryRate,
        cancellationRate: kpis.cancellationRate,
        decision:         getDecisionLabel(rows),
        currency:         rows[0]?.currency ?? 'USD',
      }
    })
    .sort((a, b) => b.kpis.totalOrders - a.kpis.totalOrders)
}

// ── Landing page performance ──────────────────────────────────────────────────
export interface LPRow {
  lpId:             string
  lpName:           string
  productName:      string
  orders:           Order[]
  kpis:             KPIs
  confirmationRate: number
  deliveryRate:     number
  cancellationRate: number
  decision:         DecisionLabel
  currency:         string
}

export function groupByLP(
  orders: Order[],
  lpNames:      Record<string, string>,
  productNames: Record<string, string>,
  lpProductMap: Record<string, string>,
): LPRow[] {
  const map: Record<string, Order[]> = {}
  for (const o of orders) {
    if (!o.landing_page_id) continue
    if (!map[o.landing_page_id]) map[o.landing_page_id] = []
    map[o.landing_page_id].push(o)
  }
  return Object.entries(map)
    .map(([id, rows]) => {
      const kpis = calcKPIs(rows)
      const pid  = lpProductMap[id] ?? ''
      return {
        lpId:             id,
        lpName:           lpNames[id] ?? 'Unknown',
        productName:      productNames[pid] ?? '—',
        orders:           rows,
        kpis,
        confirmationRate: kpis.confirmationRate,
        deliveryRate:     kpis.deliveryRate,
        cancellationRate: kpis.cancellationRate,
        decision:         getDecisionLabel(rows),
        currency:         rows[0]?.currency ?? 'USD',
      }
    })
    .sort((a, b) => b.kpis.totalOrders - a.kpis.totalOrders)
}

// ── UTM source performance ────────────────────────────────────────────────────
export interface SourceRow {
  source:           string
  platform:         string
  orders:           Order[]
  kpis:             KPIs
  confirmationRate: number
  cancellationRate: number
  decision:         DecisionLabel
  currency:         string
}

export function groupBySource(orders: Order[]): SourceRow[] {
  const map: Record<string, Order[]> = {}
  for (const o of orders) {
    const key = `${o.utm_source ?? '(direct)'}|||${o.platform ?? '(unknown)'}`
    if (!map[key]) map[key] = []
    map[key].push(o)
  }
  return Object.entries(map)
    .map(([key, rows]) => {
      const [source, platform] = key.split('|||')
      const kpis = calcKPIs(rows)
      return {
        source, platform,
        orders:           rows,
        kpis,
        confirmationRate: kpis.confirmationRate,
        cancellationRate: kpis.cancellationRate,
        decision:         getDecisionLabel(rows),
        currency:         rows[0]?.currency ?? 'USD',
      }
    })
    .sort((a, b) => b.kpis.totalOrders - a.kpis.totalOrders)
}

// ── Campaign performance ──────────────────────────────────────────────────────
export interface CampaignRow {
  campaign:         string
  orders:           Order[]
  kpis:             KPIs
  confirmationRate: number
  cancellationRate: number
  decision:         DecisionLabel
  currency:         string
}

export function groupByCampaign(orders: Order[]): CampaignRow[] {
  const map: Record<string, Order[]> = {}
  for (const o of orders) {
    const key = o.utm_campaign ?? '(not set)'
    if (!map[key]) map[key] = []
    map[key].push(o)
  }
  return Object.entries(map)
    .map(([campaign, rows]) => {
      const kpis = calcKPIs(rows)
      return {
        campaign,
        orders:           rows,
        kpis,
        confirmationRate: kpis.confirmationRate,
        cancellationRate: kpis.cancellationRate,
        decision:         getDecisionLabel(rows),
        currency:         rows[0]?.currency ?? 'USD',
      }
    })
    .sort((a, b) => b.kpis.totalOrders - a.kpis.totalOrders)
}

// ── CSV export helper ─────────────────────────────────────────────────────────
export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => {
    if (v == null) return ''
    const s = String(v)
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(',')),
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
