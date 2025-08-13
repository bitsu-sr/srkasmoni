import { useState, useEffect } from 'react'
import { Plus, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react'
import type { Payment, PaymentFormData, PaymentStats, PaymentFilters as PaymentFiltersType } from '../types/payment'
import { paymentService } from '../services/paymentService'
import PaymentModal from '../components/PaymentModal'
import PaymentTable from '../components/PaymentTable'
import PaymentFilters from '../components/PaymentFilters'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import './Payments.css'

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    receivedAmount: 0,
    pendingAmount: 0,
    notPaidAmount: 0,
    settledAmount: 0,
    cashPayments: 0,
    bankTransferPayments: 0
  })
  const [filters, setFilters] = useState<PaymentFiltersType>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load payments and stats on component mount
  useEffect(() => {
    loadPayments()
    loadStats()
  }, [filters])

  const loadPayments = async () => {
    try {
      setIsLoading(true)
      const data = await paymentService.getPayments(filters)
      setPayments(data)
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await paymentService.getPaymentStats()
      setStats(data)
    } catch (error) {
      console.error('Error loading payment stats:', error)
    }
  }

  const handleAddPayment = () => {
    setEditingPayment(null)
    setIsModalOpen(true)
  }

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment)
    setIsModalOpen(true)
  }

  const handleDeletePayment = (payment: Payment) => {
    setDeletingPayment(payment)
  }

  const handleViewPayment = (payment: Payment) => {
    // For now, just open in edit mode
    // TODO: Implement view-only mode
    handleEditPayment(payment)
  }

  const handleSavePayment = async (paymentData: PaymentFormData) => {
    try {
      if (editingPayment) {
        await paymentService.updatePayment(editingPayment.id, paymentData)
      } else {
        await paymentService.createPayment(paymentData)
      }
      
      setIsModalOpen(false)
      setEditingPayment(null)
      await loadPayments()
      await loadStats()
    } catch (error) {
      console.error('Error saving payment:', error)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingPayment) return

    try {
      setIsDeleting(true)
      await paymentService.deletePayment(deletingPayment.id)
      setDeletingPayment(null)
      await loadPayments()
      await loadStats()
    } catch (error) {
      console.error('Error deleting payment:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFiltersChange = (newFilters: PaymentFiltersType) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPayment(null)
  }

  const closeDeleteModal = () => {
    setDeletingPayment(null)
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
            <button className="btn" onClick={handleAddPayment}>
              <Plus size={20} />
              Record Payment
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
              <div className="summary-value">SRD {stats.receivedAmount.toLocaleString()}</div>
              <div className="summary-count">{stats.totalPayments} payments</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon pending">
              <Clock size={24} />
            </div>
            <div className="summary-content">
              <h3>Pending</h3>
              <div className="summary-value">SRD {stats.pendingAmount.toLocaleString()}</div>
              <div className="summary-count">{stats.totalPayments} payments</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon not-paid">
              <XCircle size={24} />
            </div>
            <div className="summary-content">
              <h3>Not Paid</h3>
              <div className="summary-value">SRD {stats.notPaidAmount.toLocaleString()}</div>
              <div className="summary-count">{stats.totalPayments} payments</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon settled">
              <CheckCircle size={24} />
            </div>
            <div className="summary-content">
              <h3>Settled</h3>
              <div className="summary-value">SRD {stats.settledAmount.toLocaleString()}</div>
              <div className="summary-count">{stats.totalPayments} payments</div>
            </div>
          </div>
        </div>

        {/* Payment Filters */}
        <PaymentFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {/* Payments Table */}
        <div className="payments-table-section">
          <div className="section-header">
            <h2>All Payments</h2>
            <div className="section-actions">
              <span className="total-count">
                {payments.length} payment{payments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading payments...</p>
            </div>
          ) : (
            <PaymentTable
              payments={payments}
              onEdit={handleEditPayment}
              onDelete={handleDeletePayment}
              onView={handleViewPayment}
            />
          )}
        </div>

        {/* Empty State */}
        {!isLoading && payments.length === 0 && (
          <div className="empty-state">
            <DollarSign size={64} className="empty-icon" />
            <h3>No Payments Found</h3>
            <p>No payments match your current filters. Try adjusting your search criteria or record your first payment.</p>
            <button className="btn" onClick={handleAddPayment}>Record Payment</button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {isModalOpen && (
        <PaymentModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSavePayment}
          payment={editingPayment || undefined}
          isEditing={!!editingPayment}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingPayment && (
        <DeleteConfirmModal
          isOpen={!!deletingPayment}
          onClose={closeDeleteModal}
          onConfirm={handleConfirmDelete}
          itemName={deletingPayment ? `${deletingPayment.member?.firstName} ${deletingPayment.member?.lastName}` : ''}
          itemType="Payment"
          isLoading={isDeleting}
        />
      )}
    </div>
  )
}

export default Payments
