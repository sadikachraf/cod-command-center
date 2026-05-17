'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Globe,
  ShoppingCart,
  BarChart3,
  Settings,
  X,
  Zap,
  ChevronRight,
} from 'lucide-react'

const navGroups = [
  {
    label: '',
    items: [
      { href: '/dashboard',               label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/dashboard/orders',        label: 'Orders',       icon: ShoppingCart },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/dashboard/products',      label: 'Products',     icon: Package },
      { href: '/dashboard/landing-pages', label: 'Landing Pages',icon: Globe },
    ],
  },
  {
    label: 'Reporting',
    items: [
      { href: '/dashboard/analytics',     label: 'Analytics',    icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard/settings',      label: 'Settings',     icon: Settings },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/25 z-30 lg:hidden"
          style={{ backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col select-none
          transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {/* Brand */}
        <div
          className="flex items-center justify-between px-5 flex-shrink-0"
          style={{ height: '64px', borderBottom: '1px solid var(--border)' }}
        >
          <Link href="/dashboard" className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
            >
              <Zap size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
                COD Command
              </p>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                Operations Center
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              {group.label && (
                <p
                  className="px-2 mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                      style={{
                        color:      isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                        background: isActive ? 'var(--accent-light)' : 'transparent',
                        fontWeight: isActive ? '600' : '500',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = 'var(--text-primary)'
                          e.currentTarget.style.background = 'var(--bg-hover)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color = 'var(--text-secondary)'
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        style={{ color: isActive ? 'var(--accent)' : 'currentColor', flexShrink: 0 }}
                      />
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <ChevronRight size={13} style={{ color: 'var(--accent)', opacity: 0.6 }} />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer status */}
        <div
          className="px-5 py-4 flex items-center gap-2.5"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#22C55E', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }}
          />
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Live · Production
          </span>
        </div>
      </aside>
    </>
  )
}
