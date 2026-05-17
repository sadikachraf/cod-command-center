'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import type { DayRow } from '@/lib/analytics'
import { fmt } from './AnalyticsUI'

const TICK_STYLE = { fontSize: 11, fill: '#9CA3AF' }

export function OrdersBarChart({ data }: { data: DayRow[] }) {
  const chartData = useMemo(() =>
    [...data].reverse().map((d) => ({
      date: d.date.slice(5),   // MM-DD
      Orders: d.orders,
      Confirmed: d.confirmed,
      Cancelled: d.cancelled,
    }))
  , [data])

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--text-muted)' }}>
        No order data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barSize={18} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          cursor={{ fill: '#F9FAFB' }}
        />
        <Bar dataKey="Orders"    fill="#BFDBFE" radius={[4,4,0,0]} />
        <Bar dataKey="Confirmed" fill="#2563EB" radius={[4,4,0,0]} />
        <Bar dataKey="Cancelled" fill="#FECACA" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function RevenueLineChart({ data }: { data: DayRow[] }) {
  const chartData = useMemo(() =>
    [...data].reverse().map((d) => ({
      date:    d.date.slice(5),
      Revenue: Math.round(d.value),
    }))
  , [data])

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--text-muted)' }}>
        No revenue data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={40}
          tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip
          contentStyle={{
            background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: 10, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          formatter={(v) => [fmt(typeof v === 'number' ? v : 0), 'Revenue']}
        />
        <Line
          type="monotone" dataKey="Revenue"
          stroke="#2563EB" strokeWidth={2.5}
          dot={{ fill: '#2563EB', r: 3 }} activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
