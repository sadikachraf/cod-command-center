'use client'

import { useMemo, useState } from 'react'
import { Trophy, Eye, AlertTriangle, HelpCircle, Download } from 'lucide-react'
import type { DecisionLabel } from '@/lib/analytics'
import { downloadCSV } from '@/lib/analytics'

// ── Shared formatting ─────────────────────────────────────────────────────────
export function fmt(v: number | null, currency = 'USD') {
  if (v === null || v === 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v)
}
export function pct(v: number) { return v > 0 ? `${v.toFixed(1)}%` : '—' }
export function num(v: number) { return v > 0 ? String(v) : '0' }

// ── Decision badge ────────────────────────────────────────────────────────────
const DECISION_STYLES: Record<DecisionLabel, { bg: string; color: string; border: string; icon: React.ReactNode }> = {
  Winner:          { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: <Trophy size={11} /> },
  Watch:           { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: <Eye size={11} /> },
  Problem:         { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: <AlertTriangle size={11} /> },
  'Not enough data':{ bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', icon: <HelpCircle size={11} /> },
}

export function DecisionBadge({ label }: { label: DecisionLabel }) {
  const s = DECISION_STYLES[label]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {s.icon}{label}
    </span>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
export function SectionCard({
  title, subtitle, action, children,
}: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

// ── Table shared styles ───────────────────────────────────────────────────────
export const TH: React.CSSProperties = {
  padding: '10px 16px', fontSize: '11px', fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase' as const,
  color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'left',
  background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border)',
}
export const TD: React.CSSProperties = {
  padding: '12px 16px', fontSize: '13px',
  color: 'var(--text-secondary)', whiteSpace: 'nowrap',
}
export const TD_STRONG: React.CSSProperties = { ...TD, color: 'var(--text-primary)', fontWeight: 600 }
export const TD_NUM: React.CSSProperties = { ...TD, fontVariantNumeric: 'tabular-nums' }

// ── Rate cell ─────────────────────────────────────────────────────────────────
export function RateCell({ value, good = true }: { value: number; good?: boolean }) {
  const color = value === 0 ? 'var(--text-muted)'
    : good ? (value >= 60 ? '#16A34A' : value >= 40 ? '#D97706' : '#DC2626')
    :        (value >= 40 ? '#DC2626' : value >= 20 ? '#D97706' : 'var(--text-secondary)')
  return (
    <td style={{ ...TD_NUM, color, fontWeight: 600 }}>{pct(value)}</td>
  )
}

// ── Export button ─────────────────────────────────────────────────────────────
export function ExportBtn({ rows, filename }: { rows: Record<string, unknown>[]; filename: string }) {
  return (
    <button
      onClick={() => downloadCSV(rows, filename)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
    >
      <Download size={12} /> CSV
    </button>
  )
}

// ── Empty table row ───────────────────────────────────────────────────────────
export function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No data for this period
      </td>
    </tr>
  )
}

// ── Stat mini-card (for KPI bar) ──────────────────────────────────────────────
export function KpiCard({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2 transition-all"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'none' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold leading-none" style={{ color: color || 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}
