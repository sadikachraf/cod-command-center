'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/Modal'
import type { OrderStatus } from '@/types'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

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

export function QuickStatusSelect({ orderId, productId, landingPageId, currentStatus, onStatusChange, className, style }: Props) {
  const [updating, setUpdating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const supabase = createClient()

  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus
    if (newStatus === currentStatus) return

    if (DANGEROUS_STATUSES.includes(newStatus)) {
      setPendingStatus(newStatus)
      setModalOpen(true)
    } else {
      await updateStatus(newStatus)
    }
  }

  const updateStatus = async (newStatus: OrderStatus) => {
    setUpdating(true)
    try {
      // 1. Update order
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
      if (error) throw error

      // 2. Insert event
      await supabase.from('order_events').insert({
        order_id: orderId,
        product_id: productId,
        landing_page_id: landingPageId,
        event_type: 'status_changed',
        event_data: { from: currentStatus, to: newStatus }
      })

      onStatusChange(newStatus)
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('Failed to update status.')
    } finally {
      setUpdating(false)
      setModalOpen(false)
      setPendingStatus(null)
    }
  }

  return (
    <>
      <select
        value={currentStatus}
        onChange={handleSelect}
        disabled={updating}
        className={className || "px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer focus:outline-none transition-colors"}
        style={style || {
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          opacity: updating ? 0.5 : 1
        }}
      >
        {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirm Status Change" size="sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Are you sure?</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to mark this order as <strong>{pendingStatus}</strong>?
            </p>
          </div>
          <div className="flex w-full gap-3 pt-4">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => pendingStatus && updateStatus(pendingStatus)}
              disabled={updating}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#ef4444' }}
            >
              {updating ? 'Updating...' : 'Yes, update status'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
