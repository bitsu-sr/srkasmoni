import { ArrowLeft, Printer } from 'lucide-react'
import type { Payment } from '../types/payment'
import { formatPaymentDate } from '../utils/dateUtils'
import { paymentSlotService } from '../services/paymentSlotService'
import './PaymentDetails.css'

interface PaymentDetailsProps {
  payment: Payment
  onBack: () => void
}

const PaymentDetails = ({ payment, onBack }: PaymentDetailsProps) => {
  const formatAmount = (amount: number) => {
    return `SRD ${amount.toLocaleString()}`
  }

  const formatSlot = (slot: any) => {
    if (!slot || !slot.monthDate) return 'N/A'
    return paymentSlotService.formatMonthDate(slot.monthDate)
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'received':
        return 'payment-details-status-received'
      case 'pending':
        return 'payment-details-status-pending'
      case 'settled':
        return 'payment-details-status-settled'
      case 'not_paid':
        return 'payment-details-status-not-paid'
      default:
        return 'payment-details-status-pending'
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  return (
    <div className="payment-details-container">
      <div className="payment-details-header">
        <button className="payment-details-back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Payments
        </button>
        <button className="payment-details-print-btn" onClick={handlePrint}>
          <Printer size={20} />
          Print
        </button>
      </div>

      <div className="payment-details-content">
        <div className="payment-details-logo-section">
          <img 
            src="/logokasmonigr.png" 
            alt="Sranan Kasmoni Logo" 
            className="payment-details-logo"
          />
          <h1 className="payment-details-title">Sranan Kasmoni</h1>
          <p className="payment-details-timestamp">
            Generated on: {formatTimestamp(new Date().toISOString())}
          </p>
        </div>

        <div className="payment-details-section">
          <h2 className="payment-details-section-title">Payment Information</h2>
          
          <div className="payment-details-grid">
            <div className="payment-details-field">
              <label>Payment ID:</label>
              <span>#{payment.id}</span>
            </div>
            
            <div className="payment-details-field">
              <label>Payment Date:</label>
              <span>{formatPaymentDate(payment.paymentDate)}</span>
            </div>
            
            <div className="payment-details-field">
              <label>Payment Month:</label>
              <span>{payment.paymentMonth ? paymentSlotService.formatMonthDate(payment.paymentMonth) : 'N/A'}</span>
            </div>
            
            <div className="payment-details-field">
              <label>Amount:</label>
              <span className="payment-details-amount">{formatAmount(payment.amount)}</span>
            </div>
            
            <div className="payment-details-field">
              <label>Status:</label>
              <span className={`payment-details-status ${getStatusClass(payment.status)}`}>
                {getStatusLabel(payment.status)}
              </span>
            </div>
            
            <div className="payment-details-field">
              <label>Payment Method:</label>
              <span>{payment.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}</span>
            </div>
            
            <div className="payment-details-field">
              <label>Payment Slot:</label>
              <span>{formatSlot(payment.slot)}</span>
            </div>
            
            {payment.fineAmount > 0 && (
              <div className="payment-details-field">
                <label>Fine Amount:</label>
                <span className="payment-details-fine">{formatAmount(payment.fineAmount)}</span>
              </div>
            )}
            
            {payment.isLatePayment && (
              <div className="payment-details-field">
                <label>Late Payment:</label>
                <span className="payment-details-late">Yes</span>
              </div>
            )}
            
            {payment.paymentDeadline && (
              <div className="payment-details-field">
                <label>Payment Deadline:</label>
                <span>{formatPaymentDate(payment.paymentDeadline)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="payment-details-section">
          <h2 className="payment-details-section-title">Member Information</h2>
          
          <div className="payment-details-grid">
            <div className="payment-details-field">
              <label>First Name:</label>
              <span>{payment.member?.firstName || 'N/A'}</span>
            </div>
            
            <div className="payment-details-field">
              <label>Last Name:</label>
              <span>{payment.member?.lastName || 'N/A'}</span>
            </div>
            
            <div className="payment-details-field">
              <label>Group:</label>
              <span>{payment.group?.name || 'N/A'}</span>
            </div>
          </div>
        </div>

        {payment.paymentMethod === 'bank_transfer' && (
          <div className="payment-details-section">
            <h2 className="payment-details-section-title">Bank Transfer Details</h2>
            
            <div className="payment-details-grid">
              <div className="payment-details-field">
                <label>Sender's Bank:</label>
                <span>{payment.senderBank?.name || 'N/A'}</span>
              </div>
              
              <div className="payment-details-field">
                <label>Receiver's Bank:</label>
                <span>{payment.receiverBank?.name || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {payment.notes && (
          <div className="payment-details-section">
            <h2 className="payment-details-section-title">Notes</h2>
            <div className="payment-details-notes">
              {payment.notes}
            </div>
          </div>
        )}

        <div className="payment-details-section">
          <h2 className="payment-details-section-title">System Information</h2>
          
          <div className="payment-details-grid">
            <div className="payment-details-field">
              <label>Created:</label>
              <span>{formatTimestamp(payment.createdAt)}</span>
            </div>
            
            <div className="payment-details-field">
              <label>Last Updated:</label>
              <span>{formatTimestamp(payment.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentDetails
