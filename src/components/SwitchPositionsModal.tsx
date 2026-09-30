import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'
import type { GroupMember } from '../types/member'
import { formatMonthYear } from '../utils/dateUtils'
import './SwitchPositionsModal.css'

interface SwitchPositionsModalProps {
  isOpen: boolean
  onClose: () => void
  slots: GroupMember[]
  initialSlotId?: number | null
  onSwitch: (slotIdA: number, slotIdB: number) => Promise<void>
}

const slotMonth = (slot: GroupMember): string => {
  if (typeof slot.assignedMonthDate === 'string') return slot.assignedMonthDate
  return `2024-${String(slot.assignedMonthDate).padStart(2, '0')}`
}

const memberName = (slot: GroupMember): string => {
  const name = `${slot.member?.firstName || ''} ${slot.member?.lastName || ''}`.trim()
  return name || 'Unknown member'
}

const slotLabel = (slot: GroupMember): string => `${memberName(slot)} — ${formatMonthYear(slotMonth(slot))}`

const SwitchPositionsModal = ({
  isOpen,
  onClose,
  slots,
  initialSlotId,
  onSwitch
}: SwitchPositionsModalProps) => {
  const [fromId, setFromId] = useState<number | ''>('')
  const [toId, setToId] = useState<number | ''>('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setFromId(initialSlotId ?? '')
    setToId('')
    setError('')
    setSaving(false)
  }, [isOpen, initialSlotId])

  const fromSlot = useMemo(
    () => slots.find((slot) => slot.id === fromId) ?? null,
    [slots, fromId]
  )
  const toSlot = useMemo(
    () => slots.find((slot) => slot.id === toId) ?? null,
    [slots, toId]
  )

  const validationMessage = useMemo(() => {
    if (!fromSlot || !toSlot) return ''
    if (fromSlot.id === toSlot.id) return 'Choose two different members.'
    if (fromSlot.memberId === toSlot.memberId) return 'Choose slots that belong to two different members.'
    if (slotMonth(fromSlot) === slotMonth(toSlot)) return 'These members are already in the same month.'

    const otherHasMonth = (memberId: number, month: string, ignoreId: number) =>
      slots.some((slot) => slot.memberId === memberId && slotMonth(slot) === month && slot.id !== ignoreId)

    if (otherHasMonth(fromSlot.memberId, slotMonth(toSlot), fromSlot.id)) {
      return `${memberName(fromSlot)} already has a slot in ${formatMonthYear(slotMonth(toSlot))}.`
    }
    if (otherHasMonth(toSlot.memberId, slotMonth(fromSlot), toSlot.id)) {
      return `${memberName(toSlot)} already has a slot in ${formatMonthYear(slotMonth(fromSlot))}.`
    }
    return ''
  }, [fromSlot, toSlot, slots])

  if (!isOpen) return null

  const handleFromChange = (value: string) => {
    const next = value ? Number(value) : ''
    setFromId(next)
    if (next === toId) setToId('')
    setError('')
  }

  const handleSubmit = async () => {
    if (!fromSlot || !toSlot || validationMessage) return
    try {
      setSaving(true)
      setError('')
      await onSwitch(fromSlot.id, toSlot.id)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch positions'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="switch-modal-overlay" onClick={onClose}>
      <div className="switch-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="switch-positions-title">
        <div className="switch-modal-header">
          <h2 id="switch-positions-title">Switch positions</h2>
          <button type="button" className="switch-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="switch-modal-body">
          <p className="switch-modal-lead">
            Move one member into another member's month. The other member takes the month that is left open. Payout records for these slots move with each member.
          </p>

          {error && <div className="switch-modal-error">{error}</div>}

          <label className="switch-field">
            <span>Member to move</span>
            <select value={fromId} onChange={(e) => handleFromChange(e.target.value)} disabled={saving}>
              <option value="">Select a member</option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slotLabel(slot)}
                </option>
              ))}
            </select>
          </label>

          <label className="switch-field">
            <span>Switches with</span>
            <select
              value={toId}
              onChange={(e) => {
                setToId(e.target.value ? Number(e.target.value) : '')
                setError('')
              }}
              disabled={saving}
            >
              <option value="">Select a member</option>
              {slots
                .filter((slot) => slot.id !== fromId)
                .map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slotLabel(slot)}
                  </option>
                ))}
            </select>
          </label>

          {fromSlot && toSlot && !validationMessage && (
            <div className="switch-preview">
              <ArrowLeftRight size={16} />
              <p>
                <strong>{memberName(fromSlot)}</strong> moves from {formatMonthYear(slotMonth(fromSlot))} to{' '}
                {formatMonthYear(slotMonth(toSlot))}. <strong>{memberName(toSlot)}</strong> moves from{' '}
                {formatMonthYear(slotMonth(toSlot))} to {formatMonthYear(slotMonth(fromSlot))}.
              </p>
            </div>
          )}

          {validationMessage && <div className="switch-modal-error">{validationMessage}</div>}

          <div className="switch-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving || !fromSlot || !toSlot || Boolean(validationMessage)}
            >
              <ArrowLeftRight size={16} />
              {saving ? 'Switching...' : 'Switch positions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SwitchPositionsModal
