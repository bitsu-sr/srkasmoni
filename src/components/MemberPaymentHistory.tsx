import { useState, useEffect } from 'react'
import { DollarSign, Building2, CreditCard, Banknote } from 'lucide-react'
import type { Payment } from '../types/payment'
import { paymentService } from '../services/paymentService'
import { paymentSlotService } from '../services/paymentSlotService'
import './MemberPaymentHistory.css'

interface MemberPaymentHistoryProps {
  memberId: number
  memberName: string
  onClose?: () => void
}

const MemberPaymentHistory = ({ memberId, memberName, onClose }: MemberPaymentHistoryProps) => {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalPending, setTotalPending] = useState(0)

  useEffect(() => {
    loadMemberPayments()
  }, [memberId])

  const loadMemberPayments = async () => {
    try {
      setIsLoading(true)
      const data = await paymentService.getMemberPaymentHistory(memberId)
      setPayments(data)
      
      // Calculate totals
      const paid = data
        .filter(p => p.status === 'received' || p.status === 'settled')
        .reduce((sum, p) => sum + p.amount, 0)
      const pending = data
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0)
      
      setTotalPaid(paid)
      setTotalPending(pending)
    } catch (error) {
      console.error('Error loading member payment history:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
        return 'Unknown'
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return <CreditCard size={16} />
      case 'cash':
        return <Banknote size={16} />
      default:
        return <DollarSign size={16} />
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return 'Bank Transfer'
      case 'cash':
        return 'Cash'
      default:
        return 'Unknown'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatAmount = (amount: number) => {
    return `SRD ${amount.toLocaleString()}`
  }

  const formatSlot = (slot: any) => {
    if (!slot) return 'N/A'
    return paymentSlotService.formatMonthDate(slot.monthDate)
  }

  if (isLoading) {
    return (
      <div className="member-payment-history">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading payment history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="member-payment-history">
      <div className="history-header">
        <div className="header-content">
          <h3>Payment History</h3>
          <p className="member-name">{memberName}</p>
        </div>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="history-summary">
        <div className="summary-card">
          <div className="summary-icon total">
            <DollarSign size={20} />
          </div>
          <div className="summary-content">
            <h4>Total Payments</h4>
            <div className="summary-value">{payments.length}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon received">
            <DollarSign size={20} />
          </div>
          <div className="summary-content">
            <h4>Total Paid</h4>
            <div className="summary-value">{formatAmount(totalPaid)}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon pending">
            <DollarSign size={20} />
          </div>
          <div className="summary-content">
            <h4>Total Pending</h4>
            <div className="summary-value">{formatAmount(totalPending)}</div>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="history-table-section">
        <h4>Payment Details</h4>
        {payments.length === 0 ? (
          <div className="empty-state">
            <DollarSign size={48} className="empty-icon" />
            <p>No payment history found for this member.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Group</th>
                  <th>Slot</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>
                      <div className="group-info">
                        <Building2 size={14} />
                        <span>{payment.group?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{formatSlot(payment.slot)}</td>
                    <td className="amount">{formatAmount(payment.amount)}</td>
                    <td>
                      <div className="payment-method">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <span>{getPaymentMethodLabel(payment.paymentMethod)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(payment.status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="notes">
                      {payment.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default MemberPaymentHistory
