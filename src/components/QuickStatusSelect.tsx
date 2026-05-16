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
      <select
        value={currentStatus}
        onChange={handleSelect}
        disabled={updating}
        className={className || 'px-2 py-1 rounded-md text-xs font-medium cursor-pointer focus:outline-none'}
        style={style || {
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          opacity: updating ? 0.5 : 1,
        }}
      >
        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

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
