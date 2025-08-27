import { Edit, Trash2, Eye } from 'lucide-react'
import type { Payment } from '../types/payment'
import { paymentSlotService } from '../services/paymentSlotService'
import { formatPaymentDate } from '../utils/dateUtils'
import PaymentStatusEditor from './PaymentStatusEditor'
import './PaymentTable.css'

interface PaymentTableProps {
  payments: Payment[]
  onEdit?: (payment: Payment) => void
  onDelete?: (payment: Payment) => void
  onView: (payment: Payment) => void
  onStatusUpdate?: (updatedPayment: Payment) => void
  canManagePayments?: boolean
}

const PaymentTable = ({ payments, onEdit, onDelete, onView, onStatusUpdate, canManagePayments = false }: PaymentTableProps) => {




  const formatAmount = (amount: number) => {
    return `SRD ${amount.toLocaleString()}`
  }

  const formatSlot = (slot: any) => {
    if (!slot || !slot.monthDate) return 'N/A'
    return paymentSlotService.formatMonthDate(slot.monthDate)
  }

  if (payments.length === 0) {
    return (
      <div className="payment-table-empty-state">
        <p>No payments found</p>
      </div>
    )
  }

  return (
    <div className="payment-table-container">
      <div className="payment-table-responsive">
        <table className="payment-table">
          <thead>
            <tr>
              <th>Payment Date</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Group</th>
              <th>Slot</th>
              <th>Amount</th>
              <th>Sender's Bank</th>
              <th>Receiver's Bank</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{formatPaymentDate(payment.paymentDate)}</td>
                <td>{payment.member?.firstName || 'N/A'}</td>
                <td>{payment.member?.lastName || 'N/A'}</td>
                <td>{payment.group?.name || 'N/A'}</td>
                <td>{formatSlot(payment.slot)}</td>
                <td className="payment-table-amount">{formatAmount(payment.amount)}</td>
                <td>
                  {payment.paymentMethod === 'bank_transfer' 
                    ? (payment.senderBank?.name || 'N/A')
                    : 'N/A'
                  }
                </td>
                <td>
                  {payment.paymentMethod === 'bank_transfer' 
                    ? (payment.receiverBank?.name || 'N/A')
                    : 'N/A'
                  }
                </td>
                <td>
                  <PaymentStatusEditor
                    payment={payment}
                    onStatusUpdate={onStatusUpdate || (() => {})}
                    canEdit={canManagePayments}
                  />
                </td>
                <td className="payment-table-actions">
                  <button
                    className="payment-table-action-btn payment-table-action-view"
                    onClick={() => onView(payment)}
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  {canManagePayments && onEdit && (
                    <button
                      className="payment-table-action-btn payment-table-action-edit"
                      onClick={() => onEdit(payment)}
                      title="Edit Payment"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                  {canManagePayments && onDelete && (
                    <button
                      className="payment-table-action-btn payment-table-action-delete"
                      onClick={() => onDelete(payment)}
                      title="Delete Payment"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PaymentTable
