'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/Modal'
import type { OrderStatus } from '@/types'
import { AlertTriangle } from 'lucide-react'

const ORDER_STATUSES: OrderStatus[] = [
  'New', 'Confirmed', 'No Answer', 'Wrong Number',
  'Cancelled', 'Shipped', 'Delivered', 'Returned', 'Paid',
]

const DANGEROUS_STATUSES: OrderStatus[] = ['Cancelled', 'Returned', 'Paid']

interface Props {
  orderId: string
  productId: string | null
  landingPageId: string | null
  currentStatus: OrderStatus
  onStatusChange: (newStatus: OrderStatus) => void
  className?: string
  style?: React.CSSProperties
}

export function QuickStatusSelect({
  orderId, productId, landingPageId, currentStatus, onStatusChange, className, style,
}: Props) {
  const [updating, setUpdating]         = useState(false)
  const [modalOpen, setModalOpen]       = useState(false)
  const [pendingStatus, setPending]     = useState<OrderStatus | null>(null)
  const supabase = createClient()

  const st = (function getStatusStyles(status: OrderStatus) {
    switch (status) {
      case 'New':         return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' }
      case 'Confirmed':   return { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' }
      case 'No Answer':   return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' }
      case 'Wrong Number':return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' }
      case 'Cancelled':   return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' }
      case 'Shipped':     return { bg: '#FAF5FF', color: '#7E22CE', border: '#E9D5FF' }
      case 'Delivered':   return { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' }
      case 'Returned':    return { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' }
      case 'Paid':        return { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' }
      default:            return { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' }
    }
  })(currentStatus)

  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus
    if (newStatus === currentStatus) return

    if (DANGEROUS_STATUSES.includes(newStatus)) {
      setPending(newStatus)
      setModalOpen(true)
    } else {
      await updateStatus(newStatus)
    }
  }

  const updateStatus = async (newStatus: OrderStatus) => {
    setUpdating(true)
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
      if (error) throw error
      await supabase.from('order_events').insert({
        order_id: orderId,
        product_id: productId,
        landing_page_id: landingPageId,
        event_type: 'status_changed',
        event_data: { from: currentStatus, to: newStatus },
      })
      onStatusChange(newStatus)
    } catch {
      alert('Failed to update status.')
    } finally {
      setUpdating(false)
      setModalOpen(false)
      setPending(null)
    }
  }

  return (
    <>
      <div className="relative inline-block">
        <select
          value={currentStatus}
          onChange={handleSelect}
          disabled={updating}
          className={className || 'px-2.5 py-1 pr-6 rounded-full text-[11px] font-bold cursor-pointer focus:outline-none appearance-none transition-colors'}
          style={style || {
            background: st.bg,
            border: `1px solid ${st.border}`,
            color: st.color,
            opacity: updating ? 0.5 : 1,
          }}
        >
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirm Status Change" size="sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
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
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >Cancel</button>
            <button
              onClick={() => pendingStatus && updateStatus(pendingStatus)}
              disabled={updating}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--danger)' }}
            >
              {updating ? 'Updating…' : 'Yes, update'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
