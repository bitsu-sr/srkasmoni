import { Edit, Trash2, Eye } from 'lucide-react'
import type { Payment } from '../types/payment'
import { paymentSlotService } from '../services/paymentSlotService'
import './PaymentTable.css'

interface PaymentTableProps {
  payments: Payment[]
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  onView: (payment: Payment) => void
}

const PaymentTable = ({ payments, onEdit, onDelete, onView }: PaymentTableProps) => {
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'received':
        return 'status-received'
      case 'pending':
        return 'status-pending'
      case 'settled':
        return 'status-settled'
      case 'not_paid':
        return 'status-not-paid'
      default:
        return 'status-pending'
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



  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatAmount = (amount: number) => {
    return `SRD ${amount.toLocaleString()}`
  }

  const formatSlot = (slot: any) => {
    if (!slot || !slot.month_date) return 'N/A'
    return paymentSlotService.formatMonthDate(slot.month_date)
  }

  if (payments.length === 0) {
    return (
      <div className="empty-state">
        <p>No payments found</p>
      </div>
    )
  }

  return (
    <div className="payment-table-container">
      <div className="table-responsive">
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
                <td>{formatDate(payment.paymentDate)}</td>
                <td>{payment.member?.firstName || 'N/A'}</td>
                <td>{payment.member?.lastName || 'N/A'}</td>
                <td>{payment.group?.name || 'N/A'}</td>
                <td>{formatSlot(payment.slot)}</td>
                <td className="amount">{formatAmount(payment.amount)}</td>
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
                  <span className={`status-badge ${getStatusClass(payment.status)}`}>
                    {getStatusLabel(payment.status)}
                  </span>
                </td>
                <td className="actions">
                  <button
                    className="action-btn view"
                    onClick={() => onView(payment)}
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="action-btn edit"
                    onClick={() => onEdit(payment)}
                    title="Edit Payment"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => onDelete(payment)}
                    title="Delete Payment"
                  >
                    <Trash2 size={16} />
                  </button>
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
