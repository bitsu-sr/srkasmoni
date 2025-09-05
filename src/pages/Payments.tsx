import { useState, useEffect } from 'react'
import { Plus, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react'
import type { Payment, PaymentFormData, PaymentStats, PaymentFilters as PaymentFiltersType } from '../types/payment'
import { paymentService } from '../services/paymentService'
import PaymentModal from '../components/PaymentModal'
import PaymentDetails from '../components/PaymentDetails'
import PaymentTable from '../components/PaymentTable'
import PaymentFilters from '../components/PaymentFilters'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { useAuth } from '../contexts/AuthContext'
import './Payments.css'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'

const Payments = () => {
  const { user } = useAuth();
  const { t } = useLanguage()
  
  // Determine user permissions
  const isAdmin = user?.role === 'admin'
  const isSuperUser = user?.role === 'super_user'
  const canViewAllRecords = isAdmin || isSuperUser
  const canManagePayments = isAdmin // Only admins can add/edit/delete payments
  
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserMemberId, setCurrentUserMemberId] = useState<number | null>(null)
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
  const [filters, setFilters] = useState<PaymentFiltersType>(() => {
    const savedMonth = typeof window !== 'undefined' ? localStorage.getItem('payments-selected-month') : null
    return {
      paymentMonth: savedMonth || new Date().toISOString().substring(0,7)
    }
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Load payments and stats on component mount
  useEffect(() => {
    if (user) {
      fetchCurrentUserMemberId()
    }
  }, [user])

  useEffect(() => {
    if (currentUserMemberId !== null || canViewAllRecords) {
      loadPayments(filters)
      loadStats()
    }
  }, [currentUserMemberId, canViewAllRecords, filters.paymentMonth])

  // Recalculate stats when payments or selected month changes
  useEffect(() => {
    // Always recompute when a month is selected (even if there are zero records)
    if (filters.paymentMonth) {
      loadStats()
      return
    }
    // Otherwise, keep prior behavior for general stats
    if (payments.length > 0 || (!canViewAllRecords && currentUserMemberId !== null)) {
      loadStats()
    }
  }, [payments, filters.paymentMonth, canViewAllRecords, currentUserMemberId])

  const fetchCurrentUserMemberId = async () => {
    if (canViewAllRecords) {
      // Admin users don't need member ID filtering
      setCurrentUserMemberId(null)
      return
    }

    try {
      // Find the member record that corresponds to this user by email
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('email', user?.email)
        .single()

      if (memberError || !memberData) {
        console.error('Could not find member record for current user:', memberError)
        setCurrentUserMemberId(null)
        return
      }

      setCurrentUserMemberId(memberData.id)
    } catch (error) {
      console.error('Error fetching current user member ID:', error)
      setCurrentUserMemberId(null)
    }
  }

  const loadPayments = async (filters: PaymentFiltersType = {}) => {
    try {
      setIsLoading(true)
      // Pass member ID for normal users to filter their payments only
      const memberIdToFilter = canViewAllRecords ? undefined : (currentUserMemberId || undefined)
      const payments = await paymentService.getPayments(filters, memberIdToFilter)
      setPayments(payments)
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // If a payment month filter is selected, compute stats from the currently loaded (filtered) payments
      if (filters.paymentMonth) {
        const data = {
          totalPayments: payments.length,
          totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
          receivedAmount: payments.filter(p => p.status === 'received').reduce((sum, p) => sum + p.amount, 0),
          pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
          notPaidAmount: payments.filter(p => p.status === 'not_paid').reduce((sum, p) => sum + p.amount, 0),
          settledAmount: payments.filter(p => p.status === 'settled').reduce((sum, p) => sum + p.amount, 0),
          cashPayments: payments.filter(p => p.paymentMethod === 'cash').length,
          bankTransferPayments: payments.filter(p => p.paymentMethod === 'bank_transfer').length,
          receivedCount: payments.filter(p => p.status === 'received').length,
          pendingCount: payments.filter(p => p.status === 'pending').length,
          notPaidCount: payments.filter(p => p.status === 'not_paid').length,
          settledCount: payments.filter(p => p.status === 'settled').length
        }
        setStats(data)
        return
      }

      let data = await paymentService.getPaymentStats()
      
      // Filter stats based on user permissions
      if (!canViewAllRecords && payments.length > 0) {
        // Normal user: only show stats for their payments (already filtered by member ID)
        const userTotalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
        const userTotalPayments = payments.length
        
        data = {
          ...data,
          totalPayments: userTotalPayments,
          totalAmount: userTotalAmount,
          receivedAmount: payments.filter(p => p.status === 'received').reduce((sum, p) => sum + p.amount, 0),
          pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
          notPaidAmount: payments.filter(p => p.status === 'not_paid').reduce((sum, p) => sum + p.amount, 0),
          settledAmount: payments.filter(p => p.status === 'settled').reduce((sum, p) => sum + p.amount, 0),
          cashPayments: payments.filter(p => p.paymentMethod === 'cash').length,
          bankTransferPayments: payments.filter(p => p.paymentMethod === 'bank_transfer').length,
          receivedCount: payments.filter(p => p.status === 'received').length,
          pendingCount: payments.filter(p => p.status === 'pending').length,
          notPaidCount: payments.filter(p => p.status === 'not_paid').length,
          settledCount: payments.filter(p => p.status === 'settled').length
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
    setViewingPayment(payment)
  }

  const handleStatusUpdate = (updatedPayment: Payment) => {
    setPayments(prevPayments => 
      prevPayments.map(payment => 
        payment.id === updatedPayment.id ? updatedPayment : payment
      )
    )
    // Reload stats to reflect the status change
    loadStats()
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
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
    // Load payments with new filters
    loadPayments(newFilters)
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
    setFilters({ paymentMonth: new Date().toISOString().substring(0,7) })
    setCurrentPage(1) // Reset to first page when clearing filters
    // Reload payments with no filters to show all records
    loadPayments({ paymentMonth: new Date().toISOString().substring(0,7) })
    // Reload stats to reflect unfiltered data
    loadStats()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPayment(null)
  }

  const handleBackFromDetails = () => {
    setViewingPayment(null)
  }

  const closeDeleteModal = () => {
    setDeletingPayment(null)
  }

  // If viewing payment details, show the details page instead of the main payments page
  if (viewingPayment) {
    return <PaymentDetails payment={viewingPayment} onBack={handleBackFromDetails} />
  }

  return (
    <div className="payments-page">
      <div className="payments-page-header">
        <div className="payments-container">
          <h1 className="payments-page-title">{t('payments.title')}</h1>
          <p className="payments-page-subtitle">
            {canViewAllRecords ? t('payments.subtitle.admin') : t('payments.subtitle.user')}
          </p>
          {!canViewAllRecords && (
            <div className="payments-user-notice">
              🔒 {t('payments.userNotice')}
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
                {t('payments.recordPayment')}
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
              <h3>{t('payments.summary.received')}</h3>
              <div className="payments-summary-value">SRD {stats.receivedAmount.toLocaleString()}</div>
              <div className="payments-summary-count">{t('payments.summary.count').replace('{count}', String(stats.receivedCount))}</div>
            </div>
          </div>
          <div className="payments-summary-card">
            <div className="payments-summary-icon payments-summary-icon-pending">
              <Clock size={24} />
            </div>
            <div className="payments-summary-content">
              <h3>{t('payments.summary.pending')}</h3>
              <div className="payments-summary-value">SRD {stats.pendingAmount.toLocaleString()}</div>
              <div className="payments-summary-count">{t('payments.summary.count').replace('{count}', String(stats.pendingCount))}</div>
            </div>
          </div>
          <div className="payments-summary-card">
            <div className="payments-summary-icon payments-summary-icon-not-paid">
              <XCircle size={24} />
            </div>
            <div className="payments-summary-content">
              <h3>{t('payments.summary.notPaid')}</h3>
              <div className="payments-summary-value">SRD {stats.notPaidAmount.toLocaleString()}</div>
              <div className="payments-summary-count">{t('payments.summary.count').replace('{count}', String(stats.notPaidCount))}</div>
            </div>
          </div>
          <div className="payments-summary-card">
            <div className="payments-summary-icon payments-summary-icon-settled">
              <CheckCircle size={24} />
            </div>
            <div className="payments-summary-content">
              <h3>{t('payments.summary.settled')}</h3>
              <div className="payments-summary-value">SRD {stats.settledAmount.toLocaleString()}</div>
              <div className="payments-summary-count">{t('payments.summary.count').replace('{count}', String(stats.settledCount))}</div>
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
            <label htmlFor="payments-page-size">{t('payments.pagination.rowsPerPage')}</label>
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
                {t('payments.pagination.showing')
                  .replace('{from}', String(startIndex + 1))
                  .replace('{to}', String(Math.min(endIndex, payments.length)))
                  .replace('{total}', String(payments.length))}
              </span>
              <span className="payments-page-info">
                {t('payments.pagination.pageOf')
                  .replace('{page}', String(currentPage))
                  .replace('{pages}', String(totalPages))}
              </span>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="payments-table-section">
          {!canViewAllRecords && (
            <div className="payments-privacy-notice">
              <div className="payments-privacy-icon">🔒</div>
              <div className="payments-privacy-text">
                <strong>{t('payments.privacy.title')}</strong> {t('payments.privacy.body')}
              </div>
            </div>
          )}
          <div className="payments-section-header">
            <h2>{canViewAllRecords ? t('payments.section.all') : t('payments.section.yours')}</h2>
            <div className="payments-section-actions">
              <span className="payments-total-count">
                {payments.length} payment{payments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="payments-loading-state">
              <div className="payments-spinner"></div>
              <p>{t('payments.loading')}</p>
            </div>
          ) : (
            <PaymentTable
              payments={currentPageData}
              onEdit={canManagePayments ? handleEditPayment : undefined}
              onDelete={canManagePayments ? handleDeletePayment : undefined}
              onView={handleViewPayment}
              onStatusUpdate={handleStatusUpdate}
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
              {(() => {
                const pages = [];
                const maxVisiblePages = 5; // Show max 5 page numbers at a time
                
                if (totalPages <= maxVisiblePages) {
                  // If total pages is small, show all pages
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <button
                        key={i}
                        className={`payments-btn-pagination payments-btn-page ${i === currentPage ? 'payments-active' : ''}`}
                        onClick={() => handlePageChange(i)}
                      >
                        {i}
                      </button>
                    );
                  }
                } else {
                  // Show smart pagination with ellipsis
                  let startPage = Math.max(1, currentPage - 2);
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  // Adjust start page if we're near the end
                  if (endPage - startPage < maxVisiblePages - 1) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }
                  
                  // Always show first page
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        className="payments-btn-pagination payments-btn-page"
                        onClick={() => handlePageChange(1)}
                      >
                        1
                      </button>
                    );
                    
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="payments-ellipsis">...</span>
                      );
                    }
                  }
                  
                  // Show visible page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        className={`payments-btn-pagination payments-btn-page ${i === currentPage ? 'payments-active' : ''}`}
                        onClick={() => handlePageChange(i)}
                      >
                        {i}
                      </button>
                    );
                  }
                  
                  // Show ellipsis and last page if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="payments-ellipsis">...</span>
                      );
                    }
                    
                    pages.push(
                      <button
                        key={totalPages}
                        className="payments-btn-pagination payments-btn-page"
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                }
                
                return pages;
              })()}
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
