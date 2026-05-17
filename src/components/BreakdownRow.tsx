'use client'

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function BreakdownRow({
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
  const isTop = rank === 1

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors cursor-default"
      style={{ background: isTop ? 'var(--accent-light)' : 'var(--bg-surface-2)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isTop ? '#DBEAFE' : 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isTop ? 'var(--accent-light)' : 'var(--bg-surface-2)'
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{
            background: isTop ? 'var(--accent)' : 'var(--border-strong)',
            color: isTop ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {rank}
        </span>
        <span
          className="text-sm font-medium truncate"
          style={{ color: isTop ? 'var(--accent-text)' : 'var(--text-primary)' }}
        >
          {name}
        </span>
      </div>
      <div className="flex items-center gap-5 flex-shrink-0 ml-4">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {count} order{count !== 1 ? 's' : ''}
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
