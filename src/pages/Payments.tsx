import { useState, useEffect } from 'react'
import { Plus, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react'
import type { Payment, PaymentFormData, PaymentStats, PaymentFilters as PaymentFiltersType } from '../types/payment'
import { paymentService } from '../services/paymentService'
import PaymentModal from '../components/PaymentModal'
import PaymentTable from '../components/PaymentTable'
import PaymentFilters from '../components/PaymentFilters'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { useAuth } from '../contexts/AuthContext'
import './Payments.css'

const Payments = () => {
  const { user } = useAuth();
  
  // Determine user permissions
  const isAdmin = user?.role === 'admin'
  const isSuperUser = user?.role === 'super_user'
  const canViewAllRecords = isAdmin || isSuperUser
  const canManagePayments = isAdmin // Only admins can add/edit/delete payments
  
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
    bankTransferPayments: 0,
    receivedCount: 0,
    pendingCount: 0,
    notPaidCount: 0,
    settledCount: 0
  })
  const [filters, setFilters] = useState<PaymentFiltersType>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Load payments and stats on component mount
  useEffect(() => {
    loadPayments()
    loadStats()
  }, [filters])

  const loadPayments = async () => {
    try {
      setIsLoading(true)
      console.log('Loading payments with filters:', filters) // Debug log
      let data = await paymentService.getPayments(filters)
      console.log('Received payments data:', data?.length, 'payments') // Debug log
      
      // Apply client-side search filter if present
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase().trim()
        console.log('Applying client-side search for:', searchTerm) // Debug log
        data = data.filter(payment => {
          const memberFirstName = payment.member?.firstName?.toLowerCase() || ''
          const memberLastName = payment.member?.lastName?.toLowerCase() || ''
          const fullName = `${memberFirstName} ${memberLastName}`.toLowerCase()
          return memberFirstName.includes(searchTerm) || 
                 memberLastName.includes(searchTerm) || 
                 fullName.includes(searchTerm)
        })
        console.log('After search filter:', data?.length, 'payments') // Debug log
      }
      
      // Filter payments based on user permissions
      if (!canViewAllRecords && user?.username) {
        // Normal user: only show their own payments
        const userFirstName = user.username.split('.')[0]
        const userLastName = user.username.split('.')[1]
        
        data = data.filter(payment => {
          const memberFirstName = payment.member?.firstName?.toLowerCase() || ''
          const memberLastName = payment.member?.lastName?.toLowerCase() || ''
          return memberFirstName === userFirstName?.toLowerCase() && 
                 memberLastName === userLastName?.toLowerCase()
        })
      }
      
      setPayments(data)
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      let data = await paymentService.getPaymentStats()
      
      // Filter stats based on user permissions
      if (!canViewAllRecords && user?.username) {
        // Normal user: only show stats for their payments
        const userPayments = payments.filter(payment => {
          const userFirstName = user.username.split('.')[0]
          const userLastName = user.username.split('.')[1]
          const memberFirstName = payment.member?.firstName?.toLowerCase() || ''
          const memberLastName = payment.member?.lastName?.toLowerCase() || ''
          return memberFirstName === userFirstName?.toLowerCase() && 
                 memberLastName === userLastName?.toLowerCase()
        })
        
        const userTotalAmount = userPayments.reduce((sum, payment) => sum + payment.amount, 0)
        const userTotalPayments = userPayments.length
        
        data = {
          ...data,
          totalPayments: userTotalPayments,
          totalAmount: userTotalAmount,
          receivedAmount: userPayments.filter(p => p.status === 'received').reduce((sum, p) => sum + p.amount, 0),
          pendingAmount: userPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
          notPaidAmount: userPayments.filter(p => p.status === 'not_paid').reduce((sum, p) => sum + p.amount, 0),
          settledAmount: userPayments.filter(p => p.status === 'settled').reduce((sum, p) => sum + p.amount, 0),
          cashPayments: userPayments.filter(p => p.paymentMethod === 'cash').length,
          bankTransferPayments: userPayments.filter(p => p.paymentMethod === 'bank_transfer').length,
          receivedCount: userPayments.filter(p => p.status === 'received').length,
          pendingCount: userPayments.filter(p => p.status === 'pending').length,
          notPaidCount: userPayments.filter(p => p.status === 'not_paid').length,
          settledCount: userPayments.filter(p => p.status === 'settled').length
        }
      }
      
      setStats(data)
    } catch (error) {
      console.error('Error loading payment stats:', error)
    }
  }

  const handleAddPayment = () => {
    if (!canManagePayments) {
      alert('Only administrators can add new payments.')
      return
    }
    setEditingPayment(null)
    setIsModalOpen(true)
  }

  const handleEditPayment = (payment: Payment) => {
    if (!canManagePayments) {
      alert('Only administrators can edit payments.')
      return
    }
    setEditingPayment(payment)
    setIsModalOpen(true)
  }

  const handleDeletePayment = (payment: Payment) => {
    if (!canManagePayments) {
      alert('Only administrators can delete payments.')
      return
    }
    setDeletingPayment(payment)
  }

  const handleViewPayment = (payment: Payment) => {
    // For now, just open in edit mode for admins, view-only for others
    if (canManagePayments) {
      handleEditPayment(payment)
    } else {
      // View-only mode - could implement a separate view modal here
      alert('View-only mode not implemented yet.')
    }
  }

  const handleSavePayment = async (paymentData: PaymentFormData) => {
    if (!canManagePayments) {
      alert('Only administrators can save payments.')
      return
    }
    
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
    
    if (!canManagePayments) {
      alert('Only administrators can delete payments.')
      return
    }

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
    console.log('Filters changed:', newFilters) // Debug log
    console.log('Previous filters:', filters) // Debug log
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  // Pagination functions
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when page size changes
  }

  // Calculate pagination values
  const totalPages = Math.ceil(payments.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageData = payments.slice(startIndex, endIndex)

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
    <div className="payments-page">
      <div className="payments-page-header">
        <div className="payments-container">
          <h1 className="payments-page-title">Payments</h1>
          <p className="payments-page-subtitle">
            {canViewAllRecords 
              ? "Track all payments and their status" 
              : "Track your payments and their status"
            }
          </p>
          {!canViewAllRecords && (
            <div className="payments-user-notice">
              🔒 Viewing only your payment records
            </div>
          )}
        </div>
      </div>

      <div className="payments-container">
        {/* Header Actions - Only show for admins */}
        {canManagePayments && (
          <div className="payments-page-actions">
            <div className="payments-actions-left">
              <button className="payments-btn payments-btn-primary" onClick={handleAddPayment}>
                <Plus size={20} />
                Record Payment
              </button>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="payments-summary">
          <div className="payments-summary-card">
            <div className="payments-summary-icon payments-summary-icon-received">
              <CheckCircle size={24} />
            </div>
            <div className="payments-summary-content">
              <h3>Received</h3>
              <div className="payments-summary-value">SRD {stats.receivedAmount.toLocaleString()}</div>
              <div className="payments-summary-count">{stats.receivedCount} payments</div>
            </div>
          </div>
          <div className="payments-summary-card">
            <div className="payments-summary-icon payments-summary-icon-pending">
              <Clock size={24} />
            </div>
            <div className="payments-summary-content">
              <h3>Pending</h3>
              <div className="payments-summary-value">SRD {stats.pendingAmount.toLocaleString()}</div>
              <div className="payments-summary-count">{stats.pendingCount} payments</div>
            </div>
          </div>
          <div className="payments-summary-card">
            <div className="payments-summary-icon payments-summary-icon-not-paid">
              <XCircle size={24} />
            </div>
            <div className="payments-summary-content">
              <h3>Not Paid</h3>
              <div className="payments-summary-value">SRD {stats.notPaidAmount.toLocaleString()}</div>
              <div className="payments-summary-count">{stats.notPaidCount} payments</div>
            </div>
          </div>
          <div className="payments-summary-card">
            <div className="payments-summary-icon payments-summary-icon-settled">
              <CheckCircle size={24} />
            </div>
            <div className="payments-summary-content">
              <h3>Settled</h3>
              <div className="payments-summary-value">SRD {stats.settledAmount.toLocaleString()}</div>
              <div className="payments-summary-count">{stats.settledCount} payments</div>
            </div>
          </div>
        </div>

        {/* Payment Filters */}
        <PaymentFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {/* Page Size Selector and Pagination Info */}
        <div className="payments-pagination-section">
          <div className="payments-page-size-selector">
            <label htmlFor="payments-page-size">Rows per page:</label>
            <select
              id="payments-page-size"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              className="payments-page-size-dropdown"
            >
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
          
          <div className="payments-pagination-info">
            <div className="payments-pagination-stats">
              <span className="payments-record-count">
                Showing {startIndex + 1}-{Math.min(endIndex, payments.length)} of {payments.length} payments
              </span>
              <span className="payments-page-info">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="payments-table-section">
          <div className="payments-section-header">
            <h2>
              {canViewAllRecords ? 'All Payments' : 'Your Payments'}
            </h2>
            <div className="payments-section-actions">
              <span className="payments-total-count">
                {payments.length} payment{payments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="payments-loading-state">
              <div className="payments-spinner"></div>
              <p>Loading payments...</p>
            </div>
          ) : (
            <PaymentTable
              payments={currentPageData}
              onEdit={canManagePayments ? handleEditPayment : undefined}
              onDelete={canManagePayments ? handleDeletePayment : undefined}
              onView={handleViewPayment}
              canManagePayments={canManagePayments}
            />
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && payments.length > 0 && totalPages > 1 && (
          <div className="payments-pagination-controls">
            <button
              className="payments-btn-pagination payments-btn-secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            
            <div className="payments-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`payments-btn-pagination payments-btn-page ${page === currentPage ? 'payments-active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              className="payments-btn-pagination payments-btn-secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && payments.length === 0 && (
          <div className="payments-empty-state">
            <DollarSign size={64} className="payments-empty-icon" />
            <h3>No Payments Found</h3>
            <p>
              {canViewAllRecords 
                ? "No payments match your current filters. Try adjusting your search criteria or record your first payment."
                : "You don't have any payments yet."
              }
            </p>
            {canManagePayments && (
              <button className="payments-btn payments-btn-primary" onClick={handleAddPayment}>Record Payment</button>
            )}
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
