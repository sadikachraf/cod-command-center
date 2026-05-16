'use client'

import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  iconBg?: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function StatCard({ label, value, icon, iconBg, sub }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex items-start gap-4 transition-all duration-200 group cursor-default"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-light)'
        e.currentTarget.style.background = 'var(--bg-card-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--bg-card)'
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg || 'var(--accent-glow)' }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
