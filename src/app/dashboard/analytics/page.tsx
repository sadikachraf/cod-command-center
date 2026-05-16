import { BarChart3, TrendingUp, Clock } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center fade-in">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
      >
        <BarChart3 size={28} style={{ color: '#a78bfa' }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Analytics
      </h2>
      <p className="text-sm max-w-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Advanced analytics with Recharts — conversion funnels, revenue trends, UTM attribution — coming in Phase 2.
      </p>
      <div className="flex gap-4">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <TrendingUp size={15} style={{ color: '#a78bfa' }} />
          Revenue Charts
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <Clock size={15} style={{ color: '#60a5fa' }} />
          Coming in Phase 2
        </div>
      </div>
    </div>
  )
}
