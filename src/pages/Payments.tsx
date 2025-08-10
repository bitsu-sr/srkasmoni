import { Plus, Filter, Search, DollarSign, User, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react'
import './Payments.css'

const Payments = () => {
  // Mock data - will be replaced with real data later
  const payments = [
    {
      id: 1,
      member: 'John Doe',
      group: 'Group A',
      amount: 2000,
      date: '2024-01-15',
      dueDate: '2024-01-28',
      status: 'received',
      paymentMethod: 'bank_transfer',
      notes: 'Payment confirmed via bank transfer'
    },
    {
      id: 2,
      member: 'Jane Smith',
      group: 'Group B',
      amount: 1500,
      date: '2024-01-20',
      dueDate: '2024-01-28',
      status: 'pending',
      paymentMethod: 'bank_transfer',
      notes: 'Proof of payment sent via WhatsApp'
    },
    {
      id: 3,
      member: 'Mike Johnson',
      group: 'Group C',
      amount: 3000,
      date: '2024-01-10',
      dueDate: '2024-01-28',
      status: 'overdue',
      paymentMethod: 'cash',
      notes: 'No payment received yet'
    },
    {
      id: 4,
      member: 'Sarah Wilson',
      group: 'Group A',
      amount: 2000,
      date: '2024-01-18',
      dueDate: '2024-01-28',
      status: 'received',
      paymentMethod: 'cash',
      notes: 'Cash payment received'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle size={16} className="status-icon received" />
      case 'pending':
        return <Clock size={16} className="status-icon pending" />
      case 'overdue':
        return <AlertTriangle size={16} className="status-icon overdue" />
      case 'cancelled':
        return <XCircle size={16} className="status-icon cancelled" />
      default:
        return <Clock size={16} className="status-icon pending" />
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'received':
        return 'status-received'
      case 'pending':
        return 'status-pending'
      case 'overdue':
        return 'status-overdue'
      case 'cancelled':
        return 'status-cancelled'
      default:
        return 'status-pending'
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return <DollarSign size={16} />
      case 'cash':
        return <DollarSign size={16} />
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

  return (
    <div className="payments">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Track all payments and their status</p>
        </div>
      </div>

      <div className="container">
        {/* Header Actions */}
        <div className="page-actions">
          <div className="actions-left">
            <button className="btn">
              <Plus size={20} />
              Record Payment
            </button>
          </div>
          <div className="actions-right">
            <div className="search-box">
              <Search size={20} />
              <input type="text" placeholder="Search payments..." />
            </div>
            <button className="btn btn-secondary">
              <Filter size={20} />
              Filter
            </button>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="payment-summary">
          <div className="summary-card">
            <div className="summary-icon received">
              <CheckCircle size={24} />
            </div>
            <div className="summary-content">
              <h3>Received</h3>
              <div className="summary-value">SRD 4,000</div>
              <div className="summary-count">2 payments</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon pending">
              <Clock size={24} />
            </div>
            <div className="summary-content">
              <h3>Pending</h3>
              <div className="summary-value">SRD 1,500</div>
              <div className="summary-count">1 payment</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon overdue">
              <AlertTriangle size={24} />
            </div>
            <div className="summary-content">
              <h3>Overdue</h3>
              <div className="summary-value">SRD 3,000</div>
              <div className="summary-count">1 payment</div>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="payments-list">
          <div className="list-header">
            <h2>Recent Payments</h2>
          </div>
          {payments.map((payment) => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <div className="payment-member">
                  <User size={20} />
                  <span>{payment.member}</span>
                </div>
                <div className={`payment-status ${getStatusClass(payment.status)}`}>
                  {getStatusIcon(payment.status)}
                  <span>{payment.status}</span>
                </div>
              </div>

              <div className="payment-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Group:</span>
                    <span>{payment.group}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Amount:</span>
                    <span className="amount">SRD {payment.amount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Payment Date:</span>
                    <span>{payment.date}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Due Date:</span>
                    <span>{payment.dueDate}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Method:</span>
                    <span className="payment-method">
                      {getPaymentMethodIcon(payment.paymentMethod)}
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </span>
                  </div>
                </div>
              </div>

              {payment.notes && (
                <div className="payment-notes">
                  <span className="notes-label">Notes:</span>
                  <span className="notes-text">{payment.notes}</span>
                </div>
              )}

              <div className="payment-actions">
                <button className="btn btn-secondary">View Details</button>
                {payment.status === 'pending' && (
                  <button className="btn">Confirm Payment</button>
                )}
                {payment.status === 'overdue' && (
                  <button className="btn">Send Reminder</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {payments.length === 0 && (
          <div className="empty-state">
            <DollarSign size={64} className="empty-icon" />
            <h3>No Payments Yet</h3>
            <p>Record your first payment to get started</p>
            <button className="btn">Record Payment</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Payments
