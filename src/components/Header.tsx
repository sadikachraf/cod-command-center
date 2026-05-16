'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, Bell, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  onMenuClick: () => void
  title: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-5 py-3"
      style={{
        background: 'rgba(10, 13, 18, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        height: '60px',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Menu size={20} />
        </button>
        <h1
          className="text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--text-secondary)' }}
          title="Notifications"
        >
          <Bell size={18} />
        </button>
        <button
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--text-secondary)' }}
          title="Profile"
        >
          <User size={18} />
        </button>
        <div
          className="w-px h-5 mx-1"
          style={{ background: 'var(--border)' }}
        />
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444'
            e.currentTarget.style.borderColor = '#ef4444'
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut size={15} />
          {loading ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </header>
  )
}
