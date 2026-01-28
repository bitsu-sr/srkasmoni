import { useState } from 'react'
import { Check, X, Edit3 } from 'lucide-react'
import type { Payment } from '../types/payment'
import { paymentService } from '../services/paymentService'
import { getDefaultPaymentNote } from '../utils/paymentNotes'
import './PaymentStatusEditor.css'

interface PaymentStatusEditorProps {
  payment: Payment
  onStatusUpdate: (updatedPayment: Payment) => void
  canEdit: boolean
}

const PaymentStatusEditor = ({ payment, onStatusUpdate, canEdit }: PaymentStatusEditorProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(payment.status)
  const [isUpdating, setIsUpdating] = useState(false)

  const statusOptions = [
    { value: 'not_paid', label: 'Not Paid', className: 'payment-status-not-paid' },
    { value: 'pending', label: 'Pending', className: 'payment-status-pending' },
    { value: 'received', label: 'Received', className: 'payment-status-received' },
    { value: 'settled', label: 'Settled', className: 'payment-status-settled' }
  ]

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'received':
        return 'payment-status-received'
      case 'pending':
        return 'payment-status-pending'
      case 'settled':
        return 'payment-status-settled'
      case 'not_paid':
        return 'payment-status-not-paid'
      default:
        return 'payment-status-pending'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'received':
        return 'Received'
      case 'pending':
        return 'Pending'
      case 'settled':
        return 'Settled'
      case 'not_paid':
        return 'Not Paid'
      default:
        return 'Pending'
    }
  }

  const handleEditClick = () => {
    if (!canEdit) return
    setIsEditing(true)
    setSelectedStatus(payment.status)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setSelectedStatus(payment.status)
  }

  const handleSave = async () => {
    if (selectedStatus === payment.status) {
      setIsEditing(false)
      return
    }

    try {
      setIsUpdating(true)
      const defaultNote = getDefaultPaymentNote(selectedStatus)
      await paymentService.updatePayment(payment.id, {
        status: selectedStatus,
        notes: defaultNote
      })
      
      // Create updated payment object with new status
      const updatedPayment: Payment = {
        ...payment,
        status: selectedStatus,
        notes: defaultNote,
        updatedAt: new Date().toISOString()
      }
      
      onStatusUpdate(updatedPayment)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating payment status:', error)
      // Reset to original status on error
      setSelectedStatus(payment.status)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!canEdit) {
    return (
      <span className={`payment-status-editor-badge ${getStatusClass(payment.status)}`}>
        {getStatusLabel(payment.status)}
      </span>
    )
  }

  if (isEditing) {
    return (
      <div className="payment-status-editor">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as Payment['status'])}
          className="payment-status-select"
          disabled={isUpdating}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="payment-status-actions">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="payment-status-action-btn payment-status-save-btn"
            title="Save"
          >
            <Check size={14} />
          </button>
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className="payment-status-action-btn payment-status-cancel-btn"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-status-display">
      <span className={`payment-status-editor-badge ${getStatusClass(payment.status)}`}>
        {getStatusLabel(payment.status)}
      </span>
      <button
        onClick={handleEditClick}
        className="payment-status-edit-btn"
        title="Edit Status"
      >
        <Edit3 size={14} />
      </button>
    </div>
  )
}

export default PaymentStatusEditor
