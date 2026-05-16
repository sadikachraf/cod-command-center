'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/StatusBadge'
import {
  ArrowLeft, Package, Globe, User,
  Tag, Truck, MessageSquare, Save, Clock, Copy, ClipboardCheck, AlertTriangle, CheckCircle,
} from 'lucide-react'
import type { Order, OrderStatus, Product, LandingPage, OrderEvent } from '@/types'
import { format } from 'date-fns'
import Link from 'next/link'
import { QuickStatusSelect } from '@/components/QuickStatusSelect'
import Modal from '@/components/Modal'

function formatCurrency(value: number | null, currency = 'USD') {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

type OrderDetail = Order & {
  product: Product | null
  landing_page: LandingPage | null
}

// ─── InfoRow ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, copyable, mono }: {
  label: string; value?: string | null; copyable?: boolean; mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs font-medium flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)', minWidth: '110px' }}>
        {label}
      </span>
      <span className={`text-sm break-all flex items-center gap-2 group text-right flex-1 ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--text-primary)' }}>
        {value}
        {copyable && (
          <button
            onClick={() => navigator.clipboard.writeText(value)}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            title="Copy"
          >
            <Copy size={11} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </span>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      </div>
      <div className="px-5 pb-2 pt-1">{children}</div>
    </div>
  )
}

const QUICK_ACTION_STATUSES: OrderStatus[] = ['Confirmed', 'No Answer', 'Shipped', 'Delivered', 'Returned', 'Paid', 'Cancelled']
const DANGEROUS_STATUSES: OrderStatus[] = ['Cancelled', 'Returned', 'Delivered', 'Paid']

const quickActionStyle: Record<string, { color: string; bg: string; border: string }> = {
  Confirmed:   { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  'No Answer': { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  Shipped:     { color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
  Delivered:   { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  Returned:    { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  Paid:        { color: '#047857', bg: '#ecfdf5', border: '#6ee7b7' },
  Cancelled:   { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [order, setOrder]     = useState<OrderDetail | null>(null)
  const [events, setEvents]   = useState<OrderEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [copied, setCopied]   = useState(false)

  // Dangerous action modal
  const [dangerModalOpen, setDangerModalOpen]   = useState(false)
  const [pendingStatus, setPendingStatus]       = useState<OrderStatus | null>(null)

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    const [{ data: orderData }, { data: eventsData }] = await Promise.all([
      supabase.from('orders')
        .select('*, product:products(*), landing_page:landing_pages(*)')
        .eq('id', id).single(),
      supabase.from('order_events')
        .select('*').eq('order_id', id)
        .order('created_at', { ascending: false }),
    ])
    if (orderData) {
      setOrder(orderData as OrderDetail)
      setNotes(orderData.notes ?? '')
    }
    setEvents((eventsData ?? []) as OrderEvent[])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const handleSave = async () => {
    if (!order) return
    setSaving(true)
    await supabase.from('orders').update({ notes }).eq('id', order.id)
    const newEvent = {
      order_id: order.id,
      product_id: order.product_id,
      landing_page_id: order.landing_page_id,
      event_type: 'note_updated',
      event_data: { note: notes.substring(0, 50) + (notes.length > 50 ? '…' : '') },
    }
    const { data: insertedEvent } = await supabase.from('order_events').insert(newEvent).select('*').single()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    setOrder((prev) => prev ? { ...prev, notes } : prev)
    if (insertedEvent) setEvents((prev) => [insertedEvent as OrderEvent, ...prev])
  }

  const copySummary = () => {
    if (!order) return
    const s = `Order: ${order.order_number}\nName: ${order.customer_name}\nPhone: ${order.phone}\nCity: ${order.city}\nAddress: ${order.address}\nPackage: ${order.package_name ?? '—'}\nValue: ${order.order_value} ${order.currency}`
    navigator.clipboard.writeText(s)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleQuickAction = (newStatus: OrderStatus) => {
    if (DANGEROUS_STATUSES.includes(newStatus)) {
      setPendingStatus(newStatus)
      setDangerModalOpen(true)
    } else {
      executeStatusUpdate(newStatus)
    }
  }

  const executeStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
    if (!error) {
      await supabase.from('order_events').insert({
        order_id: order.id,
        product_id: order.product_id,
        landing_page_id: order.landing_page_id,
        event_type: 'status_changed',
        event_data: { from: order.status, to: newStatus },
      })
      setOrder({ ...order, status: newStatus })
      fetchOrder()
    }
    setDangerModalOpen(false)
    setPendingStatus(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Package size={28} className="animate-pulse opacity-30" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-32">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Order not found.</p>
        <Link href="/dashboard/orders" className="mt-3 text-sm font-medium" style={{ color: 'var(--accent-text)' }}>
          ← Back to orders
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 fade-in max-w-5xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
        >
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              {order.order_number}
            </h2>
            <StatusBadge status={order.status} type="order" />
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {format(new Date(order.created_at), 'EEEE, MMMM d yyyy · HH:mm')}
          </p>
        </div>
        <button
          onClick={copySummary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
          style={{
            color: copied ? 'var(--success)' : 'var(--text-secondary)',
            border: `1px solid ${copied ? 'var(--status-confirmed-border)' : 'var(--border)'}`,
            background: copied ? 'var(--status-confirmed-bg)' : 'var(--bg-surface)',
          }}
        >
          {copied ? <CheckCircle size={12} /> : <ClipboardCheck size={12} />}
          {copied ? 'Copied!' : 'Copy Summary'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — details */}
        <div className="lg:col-span-2 space-y-4">

          {/* Customer */}
          <Section title="Customer" icon={<User size={13} />}>
            <InfoRow label="Full Name"    value={order.customer_name} copyable />
            <InfoRow label="Phone"        value={order.phone}         copyable mono />
            <InfoRow label="City"         value={order.city}          copyable />
            <InfoRow label="Address"      value={order.address}       copyable />
          </Section>

          {/* Order */}
          <Section title="Order Details" icon={<Package size={13} />}>
            <InfoRow label="Package"    value={order.package_name} />
            <InfoRow label="Quantity"   value={order.quantity?.toString()} />
            <InfoRow label="Value"      value={formatCurrency(order.order_value, order.currency)} />
            <InfoRow label="Currency"   value={order.currency} />
            <InfoRow label="IP Address" value={order.ip_address} mono />
          </Section>

          {/* Source */}
          <Section title="Source" icon={<Globe size={13} />}>
            <InfoRow label="Product"      value={order.product?.product_name} />
            <InfoRow label="Landing Page" value={order.landing_page?.page_name} />
            <InfoRow label="Market"       value={order.landing_page?.market} />
            <InfoRow label="Language"     value={order.landing_page?.language} />
          </Section>

          {/* UTM */}
          {(order.utm_source || order.utm_campaign || order.campaign_id) && (
            <Section title="UTM & Tracking" icon={<Tag size={13} />}>
              <InfoRow label="utm_source"   value={order.utm_source} />
              <InfoRow label="utm_medium"   value={order.utm_medium} />
              <InfoRow label="utm_campaign" value={order.utm_campaign} />
              <InfoRow label="utm_content"  value={order.utm_content} />
              <InfoRow label="utm_term"     value={order.utm_term} />
              <InfoRow label="Campaign ID"  value={order.campaign_id} mono />
              <InfoRow label="Adset ID"     value={order.adset_id}    mono />
              <InfoRow label="Ad ID"        value={order.ad_id}       mono />
              <InfoRow label="Platform"     value={order.platform} />
              <InfoRow label="Device"       value={order.device} />
              <InfoRow label="Browser"      value={order.browser} />
            </Section>
          )}

        </div>

        {/* Right — actions + notes + timeline */}
        <div className="space-y-4">

          {/* Status */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2">
              <Truck size={14} style={{ color: 'var(--accent)' }} />
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Status</h3>
            </div>

            <QuickStatusSelect
              orderId={order.id}
              productId={order.product_id}
              landingPageId={order.landing_page_id}
              currentStatus={order.status}
              onStatusChange={(newStatus) => {
                setOrder((prev) => prev ? { ...prev, status: newStatus } : prev)
                fetchOrder()
              }}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />

            {/* Quick action buttons */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Quick actions</p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_ACTION_STATUSES.map((status) => {
                  const st = quickActionStyle[status] ?? { color: 'var(--text-secondary)', bg: 'var(--bg-muted)', border: 'var(--border)' }
                  return (
                    <button
                      key={status}
                      onClick={() => handleQuickAction(status)}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                    >
                      {status}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2">
              <MessageSquare size={14} style={{ color: 'var(--accent)' }} />
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Internal Notes</h3>
            </div>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this order…"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none"
              style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent)'
                e.target.style.boxShadow = '0 0 0 3px var(--accent-light)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)'
                e.target.style.boxShadow = 'none'
              }}
            />
            <button
              id="save-order-btn"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: saved ? 'var(--status-confirmed-bg)' : 'var(--accent)',
                color: saved ? 'var(--success)' : '#ffffff',
                border: saved ? '1px solid var(--status-confirmed-border)' : 'none',
              }}
            >
              {saved ? <CheckCircle size={14} /> : <Save size={14} />}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>

          {/* Timeline */}
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} style={{ color: 'var(--accent)' }} />
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Timeline</h3>
            </div>
            <div className="relative pl-4 space-y-4" style={{ borderLeft: '2px solid var(--border)' }}>
              {events.map((evt) => (
                <div key={evt.id} className="relative">
                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full" style={{ background: 'var(--accent)', border: '2px solid var(--bg-surface)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {evt.event_type === 'status_changed' ? (
                      <>Status → <strong>{(evt.event_data as any).to}</strong></>
                    ) : evt.event_type === 'note_updated' ? (
                      <>Note: <span className="italic" style={{ color: 'var(--text-secondary)' }}>{(evt.event_data as any).note}</span></>
                    ) : evt.event_type}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {format(new Date(evt.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              ))}
              <div className="relative">
                <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full" style={{ background: 'var(--border-strong)', border: '2px solid var(--bg-surface)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Order created</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {format(new Date(order.created_at), 'MMM d, HH:mm')}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Dangerous action modal */}
      <Modal isOpen={dangerModalOpen} onClose={() => setDangerModalOpen(false)} title="Confirm Status Change" size="sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Are you sure?</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Mark this order as <strong>{pendingStatus}</strong>?
            </p>
          </div>
          <div className="flex w-full gap-2.5 pt-2">
            <button
              onClick={() => setDangerModalOpen(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >Cancel</button>
            <button
              onClick={() => pendingStatus && executeStatusUpdate(pendingStatus)}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--danger)' }}
            >Yes, update</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
