'use client'

import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  iconBg?: string
  sub?: string
  highlight?: boolean
}

export function StatCard({ label, value, icon, iconBg, sub, highlight }: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 cursor-default"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${highlight ? 'var(--accent-border)' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.borderColor = highlight ? 'var(--accent)' : 'var(--border-strong)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = highlight ? 'var(--accent-border)' : 'var(--border)'
      }}
    >
      {/* Icon + label row */}
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}
        >
          {label}
        </p>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg || 'var(--accent-light)' }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div>
        <p
          className="text-3xl font-bold leading-none tracking-tight"
          style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
