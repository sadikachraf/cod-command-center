'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/StatusBadge'
import {
  ArrowLeft, Package, Globe, MapPin, Phone, User,
  Tag, Truck, MessageSquare, Save, Clock,
} from 'lucide-react'
import type { Order, OrderStatus, Product, LandingPage } from '@/types'
import { format } from 'date-fns'
import Link from 'next/link'

const ORDER_STATUSES: OrderStatus[] = [
  'New', 'Confirmed', 'No Answer', 'Wrong Number',
  'Cancelled', 'Shipped', 'Delivered', 'Returned', 'Paid',
]

function formatCurrency(value: number | null, currency = 'USD') {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

type OrderDetail = Order & {
  product: Product | null
  landing_page: LandingPage | null
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs w-32 flex-shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm break-all" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<OrderStatus>('New')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, product:products(*), landing_page:landing_pages(*)')
      .eq('id', id)
      .single()

    if (data) {
      const o = data as OrderDetail
      setOrder(o)
      setStatus(o.status)
      setNotes(o.notes ?? '')
    }
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const handleSave = async () => {
    if (!order) return
    setSaving(true)
    await supabase.from('orders').update({ status, notes }).eq('id', order.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    setOrder((prev) => prev ? { ...prev, status, notes } : prev)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" style={{ color: 'var(--text-muted)' }}>
        <Package size={32} className="animate-pulse opacity-40" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-32" style={{ color: 'var(--text-muted)' }}>
        <p>Order not found.</p>
        <Link href="/dashboard/orders" className="mt-3 text-sm" style={{ color: 'var(--accent)' }}>
          ← Back to orders
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 fade-in max-w-5xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {order.order_number}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {format(new Date(order.created_at), 'EEEE, MMMM d yyyy · HH:mm')}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={order.status} type="order" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: customer + details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer */}
          <Section title="Customer" icon={<User size={15} />}>
            <InfoRow label="Name" value={order.customer_name} />
            <InfoRow label="Phone" value={order.phone} />
            <InfoRow label="City" value={order.city} />
            <InfoRow label="Address" value={order.address} />
          </Section>

          {/* Order details */}
          <Section title="Order Details" icon={<Package size={15} />}>
            <InfoRow label="Package" value={order.package_name} />
            <InfoRow label="Quantity" value={order.quantity?.toString()} />
            <InfoRow label="Value" value={formatCurrency(order.order_value, order.currency)} />
            <InfoRow label="Currency" value={order.currency} />
            <InfoRow label="IP Address" value={order.ip_address} />
          </Section>

          {/* Product & Landing Page */}
          <Section title="Source" icon={<Globe size={15} />}>
            <InfoRow label="Product" value={order.product?.product_name} />
            <InfoRow label="Landing Page" value={order.landing_page?.page_name} />
            <InfoRow label="Market" value={order.landing_page?.market} />
            <InfoRow label="Language" value={order.landing_page?.language} />
          </Section>

          {/* UTM Tracking */}
          {(order.utm_source || order.utm_campaign || order.campaign_id) && (
            <Section title="UTM & Tracking" icon={<Tag size={15} />}>
              <InfoRow label="utm_source" value={order.utm_source} />
              <InfoRow label="utm_medium" value={order.utm_medium} />
              <InfoRow label="utm_campaign" value={order.utm_campaign} />
              <InfoRow label="utm_content" value={order.utm_content} />
              <InfoRow label="utm_term" value={order.utm_term} />
              <InfoRow label="Campaign ID" value={order.campaign_id} />
              <InfoRow label="Adset ID" value={order.adset_id} />
              <InfoRow label="Ad ID" value={order.ad_id} />
              <InfoRow label="Platform" value={order.platform} />
              <InfoRow label="Device" value={order.device} />
              <InfoRow label="Browser" value={order.browser} />
            </Section>
          )}

          {/* Timestamps */}
          <Section title="Timestamps" icon={<Clock size={15} />}>
            <InfoRow label="Created" value={format(new Date(order.created_at), 'MMM d, yyyy HH:mm:ss')} />
            <InfoRow label="Updated" value={format(new Date(order.updated_at), 'MMM d, yyyy HH:mm:ss')} />
          </Section>
        </div>

        {/* Right: status + notes */}
        <div className="space-y-4">
          {/* Status update */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Truck size={15} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Update Status
              </h3>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Notes */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Internal Notes
                </span>
              </div>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this order…"
                className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--accent)'
                  e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <button
              id="save-order-btn"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{
                background: saved
                  ? 'rgba(16,185,129,0.8)'
                  : saving
                  ? 'rgba(59,130,246,0.5)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              }}
            >
              <Save size={14} />
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          {/* Quick info card */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Quick Info</p>
            <div className="flex items-center gap-2">
              <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{order.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={13} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{order.phone}</span>
            </div>
            <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(order.order_value, order.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
