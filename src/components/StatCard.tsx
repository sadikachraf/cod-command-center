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
      className="rounded-xl p-4 flex items-start gap-3.5 transition-all duration-200 group"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${highlight ? 'var(--accent-border)' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.borderColor = 'var(--border-strong)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.borderColor = highlight ? 'var(--accent-border)' : 'var(--border)'
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: iconBg || 'var(--accent-light)' }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium mb-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
        )}
      </div>
    </div>
  )
}
