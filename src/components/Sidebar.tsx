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
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/orders',       label: 'Orders',       icon: ShoppingCart },
  { href: '/dashboard/products',     label: 'Products',     icon: Package },
  { href: '/dashboard/landing-pages',label: 'Landing Pages',icon: Globe },
  { href: '/dashboard/analytics',    label: 'Analytics',    icon: BarChart3 },
  { href: '/dashboard/settings',     label: 'Settings',     icon: Settings },
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
          className="fixed inset-0 bg-black/30 z-30 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col
          transition-transform duration-250 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-[56px] flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              <Zap size={14} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                COD Center
              </div>
              <div className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                Command Center
              </div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md transition-colors hover:bg-gray-100"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <div className="space-y-0.5">
            {navItems.map((item) => {
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
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--accent-light)' : 'transparent',
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
                    size={16}
                    style={{ color: isActive ? 'var(--accent)' : 'currentColor' }}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Production · v2.0
          </span>
        </div>
      </aside>
    </>
  )
}
