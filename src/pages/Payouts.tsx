import React, { useState, useEffect, useCallback } from 'react'
import { 
  Search, 
  Download, 
  Printer, 
  Eye, 
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save
} from 'lucide-react'
import './Payouts.css'
import { Payout, PayoutDetails, FilterType, StatusFilter, SortField, SortDirection } from '../types/payout'
import { payoutService } from '../services/payoutService'
import { payoutDetailsService } from '../services/payoutDetailsService'
import { pdfService } from '../services/pdfService'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const Payouts: React.FC = () => {
  // Auth state
  const { user } = useAuth()
  const isAdminUser = user?.role === 'admin' || user?.role === 'super_user'
  const [currentUserMemberId, setCurrentUserMemberId] = useState<number | null>(null)
  
  // State for data
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterValue, setFilterValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('receiveMonth')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // Modal state
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [lastSlotPaid, setLastSlotPaid] = useState(false)
  const [adminFeePaid, setAdminFeePaid] = useState(false)
  const [settledDeductionAmount, setSettledDeductionAmount] = useState(0)
  const [showPdfSuccess, setShowPdfSuccess] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  
  // Payout details state
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null)
  const [isSavingPayoutDetails, setIsSavingPayoutDetails] = useState(false)
  const [payoutDetailsExist, setPayoutDetailsExist] = useState(false)

  // Calculate summary statistics
  const totalPayouts = filteredPayouts.length
  const totalAmount = filteredPayouts.reduce((sum, payout) => sum + (payout.totalAmount || 0), 0)
  const completedPayouts = filteredPayouts.filter(p => p.status === 'completed').length
  const pendingPayouts = filteredPayouts.filter(p => p.status === 'pending').length
  
  // Get current month for display
  const currentMonth = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredPayouts.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPayouts = filteredPayouts.slice(startIndex, endIndex)

  // Fetch current user's member ID
  const fetchCurrentUserMemberId = async () => {
    if (!user || isAdminUser) {
      setCurrentUserMemberId(null)
      return
    }

    try {
      const { data: memberData, error } = await supabase
        .from('members')
        .select('id')
        .eq('email', user.email)
        .single()

      if (error || !memberData) {
        setCurrentUserMemberId(null)
      } else {
        setCurrentUserMemberId(memberData.id)
      }
    } catch (error) {
      setCurrentUserMemberId(null)
    }
  }

  // Fetch payouts data
  const fetchPayouts = async () => {
    try {
      setLoading(true)
      let payoutsData = await payoutService.getAllPayouts()
      
      // Filter payouts based on user role
      if (!isAdminUser && currentUserMemberId !== null) {
        payoutsData = payoutsData.filter(payout => payout.memberId === currentUserMemberId)
      }
      
      setPayouts(payoutsData)
      setFilteredPayouts(payoutsData)
    } catch (err) {
      setError('Failed to load payouts')
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = payouts

    // Apply text filter
    if (filterType !== 'all' && filterValue.trim()) {
      const searchValue = filterValue.toLowerCase().trim()
      filtered = filtered.filter(payout => {
        switch (filterType) {
          case 'memberName':
            return payout.memberName.toLowerCase().includes(searchValue)
          case 'groupName':
            return payout.groupName.toLowerCase().includes(searchValue)
          case 'bankName':
            return payout.bankName.toLowerCase().includes(searchValue)
          default:
            return true
        }
      })
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payout => payout.status === statusFilter)
    }



    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'memberName':
          aValue = a.memberName.toLowerCase()
          bValue = b.memberName.toLowerCase()
          break
        case 'groupName':
          aValue = a.groupName.toLowerCase()
          bValue = b.groupName.toLowerCase()
          break
        case 'totalAmount':
          aValue = a.totalAmount
          bValue = b.totalAmount
          break

        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredPayouts(filtered)
    setCurrentPage(1)
  }, [payouts, filterType, filterValue, statusFilter, sortField, sortDirection])

  // Handle filter changes
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Load data on component mount
  useEffect(() => {
    fetchPayouts()
    fetchCurrentUserMemberId()
  }, [])

  // Refetch payouts when member ID changes
  useEffect(() => {
    if (currentUserMemberId !== null || isAdminUser) {
      fetchPayouts()
    }
  }, [currentUserMemberId, isAdminUser])

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }



  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'completed': 'payout-status-completed',
      'pending': 'payout-status-pending',
      'processing': 'payout-status-processing',
      'failed': 'payout-status-failed'
    }
    
    const statusLabels = {
      'completed': 'COMPLETED',
      'pending': 'PENDING',
      'processing': 'PROCESSING',
      'failed': 'FAILED'
    }
    
    return (
      <span className={`payout-status-badge ${statusClasses[status as keyof typeof statusClasses]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    )
  }

  // Calculate total amount based on toggle states
  const calculateTotalAmount = () => {
    if (!selectedPayout) return 0
    
    const baseAmount = selectedPayout.monthlyAmount * selectedPayout.duration
    const lastSlotDeduction = lastSlotPaid ? 0 : selectedPayout.monthlyAmount
    const adminFeeDeduction = adminFeePaid ? 0 : 200
    
    return baseAmount - lastSlotDeduction - adminFeeDeduction - settledDeductionAmount
  }

  // Fetch settled payments for the selected member
  const fetchSettledPayments = async (memberId: number) => {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('member_id', memberId)
        .eq('status', 'settled')

      if (error) {
        console.error('Error fetching settled payments:', error)
        setSettledDeductionAmount(0)
        return
      }

      const totalSettledAmount = payments?.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0) || 0
      setSettledDeductionAmount(totalSettledAmount)
    } catch (error) {
      console.error('Error fetching settled payments:', error)
      setSettledDeductionAmount(0)
    }
  }

  // Handle view details
  const handleViewDetails = async (payout: Payout) => {
    setSelectedPayout(payout)
    setIsDetailsModalOpen(true)
    
    try {
      // Load existing payout details if they exist
      const existingDetails = await payoutDetailsService.getPayoutDetails(payout.groupId, payout.memberId)
      
      if (existingDetails) {
        setPayoutDetails(existingDetails)
        setLastSlotPaid(existingDetails.lastSlot)
        setAdminFeePaid(existingDetails.administrationFee)
        setPayoutDetailsExist(true)
      } else {
        // Create new payout details object
        const newPayoutDetails: PayoutDetails = {
          groupId: payout.groupId,
          memberId: payout.memberId,
          monthlyAmount: payout.monthlyAmount,
          duration: payout.duration,
          lastSlot: false,
          administrationFee: false,
          payout: false,
          baseAmount: payout.totalAmount,
          settledDeduction: 0
        }
        setPayoutDetails(newPayoutDetails)
        setLastSlotPaid(false)
        setAdminFeePaid(false)
        setPayoutDetailsExist(false)
      }
    } catch (error) {
      console.error('Error loading payout details:', error)
      // Set default values on error
      setPayoutDetails({
        groupId: payout.groupId,
        memberId: payout.memberId,
        monthlyAmount: payout.monthlyAmount,
        duration: payout.duration,
        lastSlot: false,
        administrationFee: false,
        payout: false,
        baseAmount: payout.totalAmount,
        settledDeduction: 0
      })
      setLastSlotPaid(false)
      setAdminFeePaid(false)
      setPayoutDetailsExist(false)
    }
    
    // Fetch settled payments for the selected member
    fetchSettledPayments(payout.memberId)
  }

  // Handle download
  const handleDownload = (_payout: Payout) => {
    // Implement PDF generation logic here
  }

  // Handle save/update payout details
  const handleSavePayoutDetails = async () => {
    if (!payoutDetails || !selectedPayout) return
    
    setIsSavingPayoutDetails(true)
    
    try {
      // Update payout details with current toggle states
      const updatedPayoutDetails: PayoutDetails = {
        ...payoutDetails,
        lastSlot: lastSlotPaid,
        administrationFee: adminFeePaid
      }
      
      // Save to database
      const savedDetails = await payoutDetailsService.savePayoutDetails(updatedPayoutDetails)
      
      // Update local state
      setPayoutDetails(savedDetails)
      setPayoutDetailsExist(true)
      
      // Show success message (you can implement a toast notification here)
      console.log('Payout details saved successfully')
      
    } catch (error) {
      console.error('Error saving payout details:', error)
      // Show error message (you can implement a toast notification here)
    } finally {
      setIsSavingPayoutDetails(false)
    }
  }

  // Handle payout - generate PDF
  const handlePayout = async (payout: Payout) => {
    setIsGeneratingPdf(true)
    setPdfError(null)
    setShowPdfSuccess(false)
    
    try {
      await pdfService.generatePayoutPDF(payout, lastSlotPaid, adminFeePaid, settledDeductionAmount)
      setShowPdfSuccess(true)
      setTimeout(() => setShowPdfSuccess(false), 3000) // Hide after 3 seconds
    } catch (error) {
      console.error('Error generating PDF:', error)
      setPdfError('Failed to generate PDF. Please try again.')
      setTimeout(() => setPdfError(null), 5000) // Hide after 5 seconds
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Clear filters
  const clearFilters = () => {
    setFilterType('all')
    setFilterValue('')
    setStatusFilter('all')
  }

  if (loading) {
    return (
      <div className="payouts-page">
        <div className="payouts-loading">
          <div className="payouts-spinner"></div>
          <p>Loading payouts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="payouts-page">
        <div className="payouts-error">
          <AlertCircle className="payouts-error-icon" />
          <h2>Error Loading Payouts</h2>
          <p>{error}</p>
          <button onClick={fetchPayouts} className="payouts-retry-btn">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="payouts-page">
      {/* Header */}
      <div className="payouts-header">
        <div className="payouts-header-content">
          <h1 className="payouts-title">Payouts</h1>
          <p className="payouts-subtitle">
            Current month ({currentMonth}) - Members receiving payouts this month
          </p>
        </div>
        <div className="payouts-header-actions">
          <button onClick={handlePrint} className="payouts-print-btn">
            <Printer className="payouts-btn-icon" />
            Print
          </button>
        </div>
      </div>

      {/* Privacy Notice for Normal Users */}
      {!isAdminUser && (
        <div className="payouts-privacy-notice">
          <div className="payouts-privacy-icon">
            <Eye className="payouts-privacy-icon-svg" />
          </div>
          <div className="payouts-privacy-content">
            <h3>Privacy Notice</h3>
            <p>You are viewing only your own payout records. Administrators can see all payout records.</p>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="payouts-summary">
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <Users className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3 className="payouts-summary-value">{totalPayouts}</h3>
            <p className="payouts-summary-label">Current Month Payouts</p>
          </div>
        </div>
        
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <DollarSign className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3 className="payouts-summary-value">SRD {totalAmount.toLocaleString()}</h3>
            <p className="payouts-summary-label">Current Month Amount</p>
          </div>
        </div>
        
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <CheckCircle className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3 className="payouts-summary-value">{completedPayouts}</h3>
            <p className="payouts-summary-label">Completed</p>
          </div>
        </div>
        
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <Clock className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3 className="payouts-summary-value">{pendingPayouts}</h3>
            <p className="payouts-summary-label">Pending</p>
          </div>
        </div>
      </div>

      {/* Current Month Note */}
      <div className="payouts-current-month-note">
        <p>Showing payouts for <strong>{currentMonth}</strong> - Members whose assigned month is {currentMonth}</p>
      </div>

      {/* Filters */}
      <div className="payouts-filters">
        <div className="payouts-filters-row">
          <div className="payouts-filter-group">
            <label className="payouts-filter-label">Filter Type:</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="payouts-filter-select"
            >
              <option value="all">All Fields</option>
              <option value="memberName">Member Name</option>
              <option value="groupName">Group Name</option>
              <option value="bankName">Bank Name</option>
            </select>
          </div>
          
          <div className="payouts-filter-group">
            <label className="payouts-filter-label">Search:</label>
            <div className="payouts-search-input">
              <Search className="payouts-search-icon" />
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Enter search term..."
                className="payouts-search-field"
              />
            </div>
          </div>
          
          <div className="payouts-filter-group">
            <label className="payouts-filter-label">Status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="payouts-filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          

        </div>
        
        <div className="payouts-filters-actions">
          <button onClick={clearFilters} className="payouts-clear-filters-btn">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="payouts-table-container">
        <table className="payouts-table">
          <thead className="payouts-table-header">
            <tr>
              <th 
                className="payouts-table-header-cell sortable"
                onClick={() => handleSort('memberName')}
              >
                Member Name
                {sortField === 'memberName' && (
                  <span className="payouts-sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="payouts-table-header-cell sortable"
                onClick={() => handleSort('groupName')}
              >
                Group Name
                {sortField === 'groupName' && (
                  <span className="payouts-sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="payouts-table-header-cell sortable"
                onClick={() => handleSort('totalAmount')}
              >
                Total Amount
                {sortField === 'totalAmount' && (
                  <span className="payouts-sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>

              <th 
                className="payouts-table-header-cell sortable"
                onClick={() => handleSort('status')}
              >
                Status
                {sortField === 'status' && (
                  <span className="payouts-sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th className="payouts-table-header-cell">Bank</th>
              <th className="payouts-table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="payouts-table-body">
            {currentPayouts.length === 0 ? (
              <tr className="payouts-table-empty-row">
                <td colSpan={6} className="payouts-table-empty-cell">
                  <div className="payouts-empty-state">
                    <p>No payouts found for {currentMonth}</p>
                    <p>This means no members are assigned to receive payouts this month</p>
                    <button onClick={clearFilters} className="payouts-clear-filters-btn">
                      Clear Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              currentPayouts.map((payout) => (
                <tr key={payout.id} className="payouts-table-row">
                  <td className="payouts-table-cell">
                    <div className="payouts-member-info">
                      <span className="payouts-member-name">{payout.memberName}</span>
                      <span className="payouts-member-id">ID: {payout.memberId}</span>
                    </div>
                  </td>
                  <td className="payouts-table-cell">
                    <span className="payouts-group-name">{payout.groupName}</span>
                  </td>
                  <td className="payouts-table-cell">
                    <div className="payouts-amount-info">
                      <span className="payouts-total-amount">SRD {payout.totalAmount.toLocaleString()}</span>
                      <span className="payouts-monthly-amount">
                        SRD {payout.monthlyAmount}/month
                      </span>
                    </div>
                  </td>

                  <td className="payouts-table-cell">
                    {getStatusBadge(payout.status)}
                  </td>
                  <td className="payouts-table-cell">
                    <div className="payouts-bank-info">
                      <span className="payouts-bank-name">{payout.bankName}</span>
                      <span className="payouts-account-number">
                        ****{payout.accountNumber.slice(-4)}
                      </span>
                    </div>
                  </td>
                  <td className="payouts-table-cell">
                    <div className="payouts-actions">
                      <button 
                        onClick={() => handleViewDetails(payout)}
                        className="payouts-action-btn payout-view-btn"
                        title="View Details"
                      >
                        <Eye className="payouts-action-icon" />
                      </button>
                      <button 
                        onClick={() => handleDownload(payout)}
                        className="payouts-action-btn payout-download-btn"
                        title="Download"
                      >
                        <Download className="payouts-action-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="payouts-pagination">
          <div className="payouts-pagination-info">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredPayouts.length)} of {filteredPayouts.length} payouts
            </span>
          </div>
          
          <div className="payouts-pagination-controls">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="payouts-pagination-btn"
            >
              <ChevronLeft className="payouts-pagination-icon" />
              Previous
            </button>
            
            <div className="payouts-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`payouts-page-btn ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="payouts-pagination-btn"
            >
              Next
              <ChevronRight className="payouts-pagination-icon" />
            </button>
          </div>
          
          <div className="payouts-page-size">
            <label className="payouts-page-size-label">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="payouts-page-size-select"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Payout Details Modal */}
      {isDetailsModalOpen && selectedPayout && (
        <div className="payouts-modal-overlay">
          <div className="payouts-modal">
            <div className="payouts-modal-header">
              <div className="payouts-modal-header-content">
                <h2 className="payouts-modal-title">Payout Details</h2>
                <p className="payouts-modal-subtitle">
                  Calculate the payout amount for {selectedPayout.memberName} from {selectedPayout.groupName}
                </p>
              </div>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="payouts-modal-close-btn"
              >
                <XCircle className="payouts-modal-close-icon" />
              </button>
            </div>
            
            <div className="payouts-modal-content">
              {/* Group Information Section */}
              <div className="payouts-details-section">
                <h3 className="payouts-details-section-title">Group Information</h3>
                <div className="payouts-details-grid">
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Group Name</span>
                    <span className="payouts-detail-value">{selectedPayout.groupName}</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Monthly Amount</span>
                    <span className="payouts-detail-value">SRD {selectedPayout.monthlyAmount.toLocaleString()}.00</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Duration</span>
                    <span className="payouts-detail-value">{selectedPayout.duration} months</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Administration Fee</span>
                    <span className="payouts-detail-value">SRD 200.00</span>
                  </div>
                </div>
              </div>
              
              {/* Recipient Information Section */}
              <div className="payouts-details-section">
                <h3 className="payouts-details-section-title">Recipient Information</h3>
                <div className="payouts-details-grid">
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Recipient Name</span>
                    <span className="payouts-detail-value">{selectedPayout.memberName}</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">National ID</span>
                    <span className="payouts-detail-value">AB{selectedPayout.memberId.toString().padStart(6, '0')}</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Bank</span>
                    <span className="payouts-detail-value">{selectedPayout.bankName}</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Account Number</span>
                    <span className="payouts-detail-value">{selectedPayout.accountNumber}</span>
                  </div>
                </div>
              </div>
              
              {/* Payment Status Section */}
              <div className="payouts-details-section">
                <h3 className="payouts-details-section-title">Payment Status</h3>
                <div className="payouts-payment-status">
                  <div className="payouts-status-toggle">
                    <span className="payouts-status-label">Last Slot</span>
                    <div className="payouts-toggle-switch">
                      <input 
                        type="checkbox" 
                        id="lastSlotToggle" 
                        className="payouts-toggle-input"
                        checked={lastSlotPaid}
                        onChange={(e) => setLastSlotPaid(e.target.checked)}
                      />
                      <label htmlFor="lastSlotToggle" className="payouts-toggle-label"></label>
                    </div>
                  </div>
                  <div className="payouts-status-toggle">
                    <span className="payouts-status-label">Administration Fee</span>
                    <div className="payouts-toggle-switch">
                      <input 
                        type="checkbox" 
                        id="adminFeeToggle" 
                        className="payouts-toggle-input"
                        checked={adminFeePaid}
                        onChange={(e) => setAdminFeePaid(e.target.checked)}
                      />
                      <label htmlFor="adminFeeToggle" className="payouts-toggle-label"></label>
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Calculation Breakdown Section */}
              <div className="payouts-details-section">
                <h3 className="payouts-details-section-title">Calculation Breakdown</h3>
                <div className="payouts-calculation-breakdown">
                  <div className="payouts-calculation-row">
                    <span className="payouts-calculation-label">Base Amount</span>
                    <span className="payouts-calculation-value">SRD {(selectedPayout.monthlyAmount * selectedPayout.duration).toLocaleString()}.00</span>
                  </div>
                  <div className="payouts-calculation-row">
                    <span className="payouts-calculation-label">Settled Deduction</span>
                    <span className="payouts-calculation-value deduction">
                      -SRD {settledDeductionAmount.toLocaleString()}.00
                    </span>
                  </div>
                  <div className="payouts-calculation-row">
                    <span className="payouts-calculation-label">Last Slot Deduction</span>
                    <span className={`payouts-calculation-value ${lastSlotPaid ? 'no-deduction' : 'deduction'}`}>
                      {lastSlotPaid ? 'SRD 0.00' : `-SRD ${selectedPayout.monthlyAmount.toLocaleString()}.00`}
                    </span>
                  </div>
                  <div className="payouts-calculation-row">
                    <span className="payouts-calculation-label">Administration Fee Deduction</span>
                    <span className={`payouts-calculation-value ${adminFeePaid ? 'no-deduction' : 'deduction'}`}>
                      {adminFeePaid ? 'SRD 0.00' : '-SRD 200.00'}
                    </span>
                  </div>
                  <div className="payouts-calculation-row total">
                    <span className="payouts-calculation-label">Total Amount</span>
                    <span className="payouts-calculation-value total-amount">
                      SRD {calculateTotalAmount().toLocaleString()}.00
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="payouts-modal-footer">
              {showPdfSuccess && (
                <div className="payouts-pdf-success">
                  <span>✓ PDF generated successfully!</span>
                </div>
              )}
              {pdfError && (
                <div className="payouts-pdf-error">
                  <span>✗ {pdfError}</span>
                </div>
              )}
              <div className="payouts-modal-footer-buttons">
                <button 
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="payouts-modal-cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSavePayoutDetails}
                  className="payouts-modal-save-btn"
                  disabled={isSavingPayoutDetails}
                >
                  {isSavingPayoutDetails ? (
                    <>
                      <Loader2 className="payouts-loading-icon" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="payouts-btn-icon" />
                      {payoutDetailsExist ? 'Update' : 'Save'}
                    </>
                  )}
                </button>
                <button 
                  onClick={() => handlePayout(selectedPayout)}
                  className="payouts-modal-payout-btn"
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="payouts-loading-icon" />
                      Generating PDF...
                    </>
                  ) : (
                    'Payout'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Payouts
