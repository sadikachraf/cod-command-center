'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  onMenuClick: () => void
  title: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-5"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        height: '56px',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg transition-colors hover:bg-gray-100"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Menu size={18} />
        </button>
        <h1
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
              e.currentTarget.style.borderColor = 'var(--border-strong)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0" />
            <span className="hidden sm:block text-xs">Admin</span>
            <ChevronDown size={12} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-44 rounded-xl py-1 z-50 scale-in"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <button
                onClick={() => { setMenuOpen(false); handleSignOut() }}
                disabled={loading}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors text-left"
                style={{ color: 'var(--danger)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-light)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <LogOut size={14} />
                {loading ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
