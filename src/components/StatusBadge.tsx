import { type ProductStatus, type LandingPageStatus, type OrderStatus } from '@/types'

// Status color maps
const productStatusStyles: Record<ProductStatus, { bg: string; text: string; dot: string }> = {
  Testing:  { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', dot: '#3b82f6' },
  Scaling:  { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', dot: '#10b981' },
  Winner:   { bg: 'rgba(139,92,246,0.12)',  text: '#a78bfa', dot: '#8b5cf6' },
  Killed:   { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', dot: '#ef4444' },
  Paused:   { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', dot: '#6b7280' },
}

const landingPageStatusStyles: Record<LandingPageStatus, { bg: string; text: string; dot: string }> = {
  Active:   { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', dot: '#10b981' },
  Paused:   { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', dot: '#f59e0b' },
  Archived: { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', dot: '#6b7280' },
}

const orderStatusStyles: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  'New':          { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa', dot: '#3b82f6' },
  'Confirmed':    { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', dot: '#10b981' },
  'No Answer':    { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', dot: '#f59e0b' },
  'Wrong Number': { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', dot: '#ef4444' },
  'Cancelled':    { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', dot: '#ef4444' },
  'Shipped':      { bg: 'rgba(139,92,246,0.12)',  text: '#a78bfa', dot: '#8b5cf6' },
  'Delivered':    { bg: 'rgba(16,185,129,0.15)',  text: '#6ee7b7', dot: '#10b981' },
  'Returned':     { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', dot: '#6b7280' },
  'Paid':         { bg: 'rgba(52,211,153,0.15)',  text: '#34d399', dot: '#059669' },
}

interface BadgeProps {
  status: ProductStatus | LandingPageStatus | OrderStatus
  type: 'product' | 'landing_page' | 'order'
}

export function StatusBadge({ status, type }: BadgeProps) {
  let style: { bg: string; text: string; dot: string }

  if (type === 'product') {
    style = productStatusStyles[status as ProductStatus]
  } else if (type === 'landing_page') {
    style = landingPageStatusStyles[status as LandingPageStatus]
  } else {
    style = orderStatusStyles[status as OrderStatus]
  }

  if (!style) {
    style = { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', dot: '#6b7280' }
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: style.bg, color: style.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: style.dot }}
      />
      {status}
    </span>
  )
}
