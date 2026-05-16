import { Settings, KeyRound, Bell, Palette } from 'lucide-react'

const settingGroups = [
  {
    title: 'API & Security',
    icon: <KeyRound size={15} style={{ color: '#60a5fa' }} />,
    items: ['Manage API keys', 'View API logs', 'IP allowlist'],
  },
  {
    title: 'Notifications',
    icon: <Bell size={15} style={{ color: '#fbbf24' }} />,
    items: ['Telegram bot configuration', 'Email alerts', 'Notification preferences'],
  },
  {
    title: 'Appearance',
    icon: <Palette size={15} style={{ color: '#a78bfa' }} />,
    items: ['Theme settings', 'Dashboard preferences', 'Currency display'],
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-5 fade-in max-w-2xl">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Platform configuration — coming in Phase 2
        </p>
      </div>

      {settingGroups.map((group) => (
        <div
          key={group.title}
          className="rounded-xl p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            {group.icon}
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {group.title}
            </h3>
          </div>
          <div className="space-y-2">
            {group.items.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
              >
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(107,114,128,0.12)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Phase 2
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Env vars info */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Settings size={15} style={{ color: '#34d399' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Environment Variables
          </h3>
        </div>
        <div className="space-y-2">
          {[
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'TELEGRAM_BOT_TOKEN',
            'TELEGRAM_CHAT_ID',
          ].map((env) => (
            <div key={env} className="flex items-center gap-2">
              <code
                className="text-xs px-2 py-1 rounded font-mono"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent)',
                }}
              >
                {env}
              </code>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Configure these in your <code>.env.local</code> file or Vercel project settings.
        </p>
      </div>
    </div>
  )
}
