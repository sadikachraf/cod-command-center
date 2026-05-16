import { type ProductStatus, type LandingPageStatus, type OrderStatus } from '@/types'

// ─── Order Status ───────────────────────────────────────────────────────────
const orderStatusStyles: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  'New':          { bg: 'var(--status-new-bg)',          text: 'var(--status-new-text)',          border: 'var(--status-new-border)' },
  'Confirmed':    { bg: 'var(--status-confirmed-bg)',    text: 'var(--status-confirmed-text)',    border: 'var(--status-confirmed-border)' },
  'No Answer':    { bg: 'var(--status-noanswer-bg)',     text: 'var(--status-noanswer-text)',     border: 'var(--status-noanswer-border)' },
  'Wrong Number': { bg: 'var(--status-wrongnum-bg)',     text: 'var(--status-wrongnum-text)',     border: 'var(--status-wrongnum-border)' },
  'Cancelled':    { bg: 'var(--status-cancelled-bg)',    text: 'var(--status-cancelled-text)',    border: 'var(--status-cancelled-border)' },
  'Shipped':      { bg: 'var(--status-shipped-bg)',      text: 'var(--status-shipped-text)',      border: 'var(--status-shipped-border)' },
  'Delivered':    { bg: 'var(--status-delivered-bg)',    text: 'var(--status-delivered-text)',    border: 'var(--status-delivered-border)' },
  'Returned':     { bg: 'var(--status-returned-bg)',     text: 'var(--status-returned-text)',     border: 'var(--status-returned-border)' },
  'Paid':         { bg: 'var(--status-paid-bg)',         text: 'var(--status-paid-text)',         border: 'var(--status-paid-border)' },
}

// ─── Product Status ──────────────────────────────────────────────────────────
const productStatusStyles: Record<ProductStatus, { bg: string; text: string; border: string }> = {
  Testing: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Scaling: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  Winner:  { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe' },
  Killed:  { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  Paused:  { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
}

// ─── Landing Page Status ─────────────────────────────────────────────────────
const landingPageStatusStyles: Record<LandingPageStatus, { bg: string; text: string; border: string }> = {
  Active:   { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  Paused:   { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  Archived: { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
}

interface BadgeProps {
  status: ProductStatus | LandingPageStatus | OrderStatus
  type: 'product' | 'landing_page' | 'order'
}

export function StatusBadge({ status, type }: BadgeProps) {
  let s: { bg: string; text: string; border: string }

  if (type === 'product') {
    s = productStatusStyles[status as ProductStatus] ?? { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' }
  } else if (type === 'landing_page') {
    s = landingPageStatusStyles[status as LandingPageStatus] ?? { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' }
  } else {
    s = orderStatusStyles[status as OrderStatus] ?? { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' }
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  )
}
