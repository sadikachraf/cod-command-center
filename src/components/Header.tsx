'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, ChevronDown, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  onMenuClick: () => void
  title: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        height: '64px',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-muted)' }}
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-[15px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2" ref={menuRef}>
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5 pl-2.5 pr-3 py-2 rounded-xl text-sm transition-all"
            style={{
              border: '1px solid var(--border)',
              background: open ? 'var(--bg-muted)' : 'var(--bg-surface)',
              color: 'var(--text-primary)',
              boxShadow: open ? 'none' : 'var(--shadow-xs)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'var(--bg-surface)' }}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}
            >
              <User size={13} className="text-white" strokeWidth={2} />
            </div>
            <span className="hidden sm:block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Admin
            </span>
            <ChevronDown
              size={13}
              style={{
                color: 'var(--text-muted)',
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          </button>

          {open && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-2xl py-1.5 z-50 slide-down"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
                top: '100%',
              }}
            >
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Admin</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>COD Command Center</p>
              </div>
              <button
                onClick={() => { setOpen(false); handleSignOut() }}
                disabled={loading}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium transition-colors text-left mt-0.5"
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
