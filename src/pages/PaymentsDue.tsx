import React, { useState, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'
import { usePerformanceSettings } from '../contexts/PerformanceSettingsContext'
import { useAuth } from '../contexts/AuthContext'
import { paymentSlotService } from '../services/paymentSlotService'
import { paymentService } from '../services/paymentService'

import { pdfService } from '../services/pdfService'
import { PaymentSlot } from '../types/paymentSlot'
 
import PaymentModal from '../components/PaymentModal'
import type { PaymentFormData } from '../types/payment'
import './PaymentsDue.css'
import { useLanguage } from '../contexts/LanguageContext'

// Type for unpaid slots with member and group info
interface UnpaidSlot extends PaymentSlot {
  hasPayment: boolean
}

type SortField = 'firstName' | 'lastName' | 'group' | 'slot' | 'amount'
type SortDirection = 'asc' | 'desc'

const PaymentsDue: React.FC = () => {
  const { settings, updateSetting } = usePerformanceSettings()
  const { t } = useLanguage()
  const { user } = useAuth()
  
  // Determine user permissions
  const isAdmin = user?.role === 'admin'
  const isSuperUser = user?.role === 'super_user'
  const canViewAllRecords = isAdmin || isSuperUser
  
  // State for data
  const [unpaidSlots, setUnpaidSlots] = useState<UnpaidSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('group')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  // Filter state
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('payments-due-selected-month') : null
    if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    return `${year}-${month.toString().padStart(2, '0')}`
  })
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchField, setSearchField] = useState<'all' | 'name' | 'group' | 'amount'>('all')
  
  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<UnpaidSlot | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreData, setHasMoreData] = useState(true)
  
  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    phase1Time?: number
    phase2Time?: number
    totalTime?: number
  }>({})

  // PDF export state
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)

  // Calculate pagination values based on settings
  const pageSize = settings.pageSize

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    updateSetting('pageSize', newPageSize as 10 | 25 | 50 | 100)
    // Reset to first page when page size changes
    setCurrentPage(1)
  }

  // Handle payment status filter change
  const handlePaymentStatusFilterChange = (status: 'all' | 'paid' | 'unpaid') => {
    setPaymentStatusFilter(status)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  // Clear all filters
  const clearFilters = () => {
    setPaymentStatusFilter('all')
    setSearchQuery('')
    setSearchField('all')
    setCurrentPage(1)
  }

  // Persist selected month
  useEffect(() => {
    try {
      localStorage.setItem('payments-due-selected-month', selectedMonth)
    } catch {}
  }, [selectedMonth])

  // Load data based on performance settings and user permissions
  const loadUnpaidSlots = useCallback(async () => {
    setLoading(true)
    setError(null)
    const startTime = performance.now()

    try {
      let slots: PaymentSlot[] = []

      if (settings.enableOptimizedQueries) {
        // Phase 2: Single Optimized Queries - Temporarily disabled due to schema issues
        console.log('Phase 2 disabled - using Phase 1 fallback due to database schema constraints');
        
        // Fallback to Phase 1: Parallel Database Calls
        const phase1Start = performance.now();
        
        const [slotsResult] = await Promise.all([
          paymentSlotService.getAllSlots()
        ]);
        
        slots = slotsResult
        
        const phase1Time = performance.now() - phase1Start
        setPerformanceMetrics(prev => ({ ...prev, phase1Time }))
      } else if (settings.enableParallelCalls) {
        // Phase 1: Parallel Database Calls
        const phase1Start = performance.now()
        
        const [slotsResult] = await Promise.all([
          paymentSlotService.getAllSlots()
        ])
        
        slots = slotsResult
        
        const phase1Time = performance.now() - phase1Start
        setPerformanceMetrics(prev => ({ ...prev, phase1Time }))
      } else {
        // Default: Sequential loading
        slots = await paymentSlotService.getAllSlots()
      }

      // Filter slots based on user permissions
      if (!canViewAllRecords && user?.username) {
        // Normal user: only show their own slots
        const userFirstName = user.username.split('.')[0]
        const userLastName = user.username.split('.')[1]
        
        slots = slots.filter(slot => {
          const memberFirstName = slot.member?.first_name?.toLowerCase() || ''
          const memberLastName = slot.member?.last_name?.toLowerCase() || ''
          return memberFirstName === userFirstName?.toLowerCase() && 
                 memberLastName === userLastName?.toLowerCase()
        })
        
        // No payment stats usage here anymore
      }

      // Check payment status for all slots against selectedMonth and allowed statuses
      const slotsWithPayments = await paymentService.checkMultipleSlotsPaymentStatusForMonth(
        slots.map(slot => ({
          groupId: slot.groupId,
          memberId: slot.memberId,
          monthDate: slot.monthDate
        })),
        selectedMonth
      )

      // Transform slots to include payment status
      const unpaidSlots: UnpaidSlot[] = slots.map(slot => {
        const slotKey = `${slot.groupId}-${slot.memberId}-${slot.monthDate}`
        const hasPayment = slotsWithPayments.has(slotKey)
        
        return {
          ...slot,
          hasPayment
        }
      })
      
      setUnpaidSlots(unpaidSlots)
      
      const totalTime = performance.now() - startTime
      setPerformanceMetrics(prev => ({ ...prev, totalTime }))
      
    } catch (err) {
      console.error('Error loading unpaid slots:', err)
      setError('Failed to load slots. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [settings.enableParallelCalls, settings.enableOptimizedQueries, canViewAllRecords, user?.username, selectedMonth])

  // Get filtered slots
  const getFilteredSlots = () => {
    let filtered = unpaidSlots;
    
    // Apply payment status filter
    if (paymentStatusFilter === 'paid') {
      filtered = filtered.filter(slot => slot.hasPayment);
    } else if (paymentStatusFilter === 'unpaid') {
      filtered = filtered.filter(slot => !slot.hasPayment);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(slot => {
        const memberName = `${slot.member?.first_name || ''} ${slot.member?.last_name || ''}`.toLowerCase();
        const groupName = slot.group?.name?.toLowerCase() || '';
        const amount = slot.amount.toString();
        
        switch (searchField) {
          case 'name':
            return memberName.includes(query);
          case 'group':
            return groupName.includes(query);
          case 'amount':
            return amount.includes(query);
          case 'all':
          default:
            return memberName.includes(query) || 
                   groupName.includes(query) || 
                   amount.includes(query);
        }
      });
    }
    
    return filtered;
  }

  // Get sorted slots
  const getSortedSlots = () => {
    return getFilteredSlots().sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'firstName':
          aValue = a.member?.first_name?.toLowerCase() || ''
          bValue = b.member?.first_name?.toLowerCase() || ''
          break
        case 'lastName':
          aValue = a.member?.last_name?.toLowerCase() || ''
          bValue = b.member?.last_name?.toLowerCase() || ''
          break
        case 'group':
          aValue = a.group?.name?.toLowerCase() || ''
          bValue = b.group?.name?.toLowerCase() || ''
          break
        case 'slot':
          aValue = a.monthDate
          bValue = b.monthDate
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        default:
          aValue = a.member?.first_name?.toLowerCase() || ''
          bValue = b.member?.first_name?.toLowerCase() || ''
      }

      // Handle null/undefined values by treating them as empty strings
      const aVal = aValue === null || aValue === undefined ? '' : aValue
      const bVal = bValue === null || bValue === undefined ? '' : bValue
      
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
  }

  // Calculate pagination values based on filtered data
  const filteredSlots = getFilteredSlots()
  const totalPages = Math.ceil(filteredSlots.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize

  // Get current page data (sorted and paginated)
  const getCurrentPageData = () => {
    const sortedSlots = getSortedSlots()
    
    if (settings.paginationType === 'true') {
      // True Infinite Scroll: Show all data at once
      return sortedSlots
    } else {
      // Simple Pagination or Infinite Scroll: Show paginated data
      return sortedSlots.slice(startIndex, endIndex)
    }
  }

  const currentPageData = getCurrentPageData()

  // Handle page change for simple pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // True infinite scroll - detect when user scrolls near bottom
  const handleScroll = useCallback(() => {
    if (settings.paginationType !== 'infinite') return // Only for 'infinite', not 'true'
    
    const scrollTop = window.scrollY
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    
    // Load more when user is within 200px of bottom
    if (scrollTop + windowHeight >= documentHeight - 200) {
      if (hasMoreData && !loading) {
        setCurrentPage(prev => prev + 1)
      }
    }
  }, [hasMoreData, loading, settings.paginationType])

  // Add scroll listener for infinite scroll
  useEffect(() => {
    if (settings.paginationType === 'infinite') {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll, settings.paginationType])

  // Load data on mount and when settings change
  useEffect(() => {
    loadUnpaidSlots()
  }, [loadUnpaidSlots])

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(1)
    setHasMoreData(unpaidSlots.length > pageSize)
  }, [unpaidSlots.length, pageSize])

  // Calculate totals
  const totalAmountPaidAll = unpaidSlots.reduce((sum, slot) => sum + (slot.hasPayment ? slot.amount : 0), 0)
  const totalAmountDue = unpaidSlots.reduce((sum, slot) => sum + (slot.hasPayment ? 0 : slot.amount), 0)
  
  // Calculate filtered totals
  const filteredAmount = getFilteredSlots().reduce((sum, slot) => sum + slot.amount, 0)

  // Handle sorting
  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDirection(newDirection)
  }

  // Handle row click for payment modal
  const handleRowClick = (slot: UnpaidSlot) => {
    setSelectedSlot(slot)
    setIsPaymentModalOpen(true)
  }

  // Handle payment save
  const handlePaymentSave = async (_paymentData: PaymentFormData) => {
    try {
      // The payment will be saved through the PaymentModal
      // After successful save, refresh the unpaid slots list
      await loadUnpaidSlots()
      setIsPaymentModalOpen(false)
      setSelectedSlot(null)
    } catch (error) {
      console.error('Error saving payment:', error)
    }
  }

  // Format month date
  const formatMonthDate = (monthDate: string) => {
    if (!monthDate || monthDate.length !== 7) return monthDate
    
    const [year, month] = monthDate.split('-')
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  // Performance comparison function
  const comparePerformance = () => {
    const { phase1Time, phase2Time, totalTime } = performanceMetrics
    
    if (phase1Time && phase2Time) {
      const improvement = ((phase1Time - phase2Time) / phase1Time * 100).toFixed(1)
      alert(`Performance Comparison:\n\nPhase 1 (Parallel): ${phase1Time.toFixed(2)}ms\nPhase 2 (Optimized): ${phase2Time.toFixed(2)}ms\n\nPhase 2 is ${improvement}% faster!`)
    } else if (totalTime) {
      alert(`Current loading time: ${totalTime.toFixed(2)}ms`)
    } else {
      alert('No performance data available yet. Load the page first.')
    }
  }

  // PDF export functions
  const handleExportPDF = async (exportType: 'all' | 'paid' | 'unpaid') => {
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(null)
    
    try {
      const stats = {
        totalSlots: unpaidSlots.length,
        totalAmount: unpaidSlots.reduce((sum, slot) => sum + slot.amount, 0),
        totalAmountPaid: unpaidSlots.filter(slot => slot.hasPayment).reduce((sum, slot) => sum + slot.amount, 0),
        totalAmountDue: unpaidSlots.filter(slot => !slot.hasPayment).reduce((sum, slot) => sum + slot.amount, 0)
      }
      
      await pdfService.generatePaymentsDuePDF(unpaidSlots, exportType, stats)
      
      const exportTypeText = exportType === 'all' ? 'All Rows' : 
                            exportType === 'paid' ? 'Paid Rows Only' : 'Unpaid Rows Only'
      setExportSuccess(`PDF exported successfully: ${exportTypeText}`)
      
      // Clear success message after 3 seconds
      setTimeout(() => setExportSuccess(null), 3000)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      setExportError('Failed to export PDF. Please try again.')
      
      // Clear error message after 5 seconds
      setTimeout(() => setExportError(null), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  const clearExportMessages = () => {
    setExportError(null)
    setExportSuccess(null)
  }

  if (loading) {
    return (
      <div className="payments-due-container">
        <div className="loading">{t('paymentsDue.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="payments-due-container">
        <div className="error">{error}</div>
        <button onClick={loadUnpaidSlots} className="retry-btn">{t('paymentsDue.error.retry')}</button>
      </div>
    )
  }

  return (
    <div className="payments-due-container">
      <div className="page-header">
        <div className="header-content">
          <h1>{t('paymentsDue.title')}</h1>
          <h2>
            {canViewAllRecords ? t('paymentsDue.subtitle.admin') : t('paymentsDue.subtitle.user')}
          </h2>
          <p>
            {!canViewAllRecords && `Showing only ${user?.username?.split('.')[0] || 'your'} records`}
          </p>

          
        </div>
        
        <div className="header-actions">

          {/* Performance Status Display */}
          {Object.keys(performanceMetrics).length > 0 && (
            <div className="payments-due-header-performance-status">
              <div className="payments-due-header-status-indicator">
                <span className="payments-due-header-status-phase">
                  {settings.enableOptimizedQueries ? '🚀 Phase 2' : 
                   settings.enableParallelCalls ? '⚡ Phase 1' : '🐌 Default'}
                </span>
                <span className="payments-due-header-status-info">
                  {settings.enableOptimizedQueries ? 'Single Optimized Queries' :
                   settings.enableParallelCalls ? 'Parallel Database Calls' : 'Sequential Loading'}
                </span>
              </div>
            </div>
          )}
          <button 
            onClick={loadUnpaidSlots} 
            className="refresh-btn"
            title="Refresh"
          >
            🔄 {t('paymentsDue.refresh')}
          </button>
          <button 
            onClick={comparePerformance}
            className="performance-btn"
            title="Show Performance Comparison"
          >
            📊 {t('paymentsDue.performance')}
          </button>
        </div>
      </div>

      {/* Export Status Messages */}
      {exportSuccess && (
        <div className="export-success-message">
          <span>✅ {exportSuccess}</span>
          <button onClick={clearExportMessages} className="export-message-close">×</button>
        </div>
      )}
      {exportError && (
        <div className="export-error-message">
          <span>❌ {exportError}</span>
          <button onClick={clearExportMessages} className="export-message-close">×</button>
        </div>
      )}

      {/* Statistics Section */}
      <div className="statistics-section">
        {!canViewAllRecords && (
          <div className="payments-due-filter-notice">
            <span>🔒 {t('paymentsDue.notice.own')}</span>
          </div>
        )}
        {paymentStatusFilter !== 'all' && (
          <div className="payments-due-filter-notice">
            <span>
              {paymentStatusFilter === 'paid' ? t('paymentsDue.notice.filter.paid') : t('paymentsDue.notice.filter.unpaid')}
            </span>
          </div>
        )}
        <div className="payments-due-stat-card payments-due-stat-card-default">
          <div className="payments-due-stat-icon">
            💰
          </div>
          <div className="payments-due-stat-content">
            <div className="payments-due-stat-number">{getFilteredSlots().length}</div>
            <div className="payments-due-stat-label">
              {canViewAllRecords ? t('paymentsDue.stats.filteredSlots.admin') : t('paymentsDue.stats.filteredSlots.user')}
            </div>
          </div>
        </div>
        <div className="payments-due-stat-card payments-due-stat-card-default">
          <div className="payments-due-stat-icon">
            📅
          </div>
          <div className="payments-due-stat-content">
            <div className="payments-due-stat-number">SRD {Number(filteredAmount.toFixed(2)).toLocaleString()}</div>
            <div className="payments-due-stat-label">
              {canViewAllRecords ? t('paymentsDue.stats.filteredAmount.admin') : t('paymentsDue.stats.filteredAmount.user')}
            </div>
          </div>
        </div>
        <div className="payments-due-stat-card payments-due-stat-card-success">
          <div className="payments-due-stat-icon">
            ✅
          </div>
          <div className="payments-due-stat-content">
            <div className="payments-due-stat-number">SRD {Number(totalAmountPaidAll.toFixed(2)).toLocaleString()}</div>
            <div className="payments-due-stat-label">
              {canViewAllRecords ? t('paymentsDue.stats.totalPaid.admin') : t('paymentsDue.stats.totalPaid.user')}
            </div>
          </div>
        </div>
        <div className="payments-due-stat-card payments-due-stat-card-danger">
          <div className="payments-due-stat-icon">
            ⚠️
          </div>
          <div className="payments-due-stat-content">
            <div className="payments-due-stat-number">SRD {Number(totalAmountDue.toFixed(2)).toLocaleString()}</div>
            <div className="payments-due-stat-label">
              {canViewAllRecords ? t('paymentsDue.stats.totalDue.admin') : t('paymentsDue.stats.totalDue.user')}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Controls Row */}
      <div className="secondary-controls">
        
        
        {/* Action Buttons */}
        <div className="action-buttons">
          {/* PDF Export Section */}
          <div className="pdf-export-section">
            <span className="export-label">{t('paymentsDue.export.label')}</span>
            <div className="export-buttons">
              <button
                onClick={() => handleExportPDF('all')}
                className="export-btn export-all-btn"
                disabled={isExporting || unpaidSlots.length === 0}
                title="Export all rows to PDF"
              >
                <Download className="export-btn-icon" />
                {t('paymentsDue.export.all')}
              </button>
              <button
                onClick={() => handleExportPDF('paid')}
                className="export-btn export-paid-btn"
                disabled={isExporting || unpaidSlots.filter(slot => slot.hasPayment).length === 0}
                title="Export only paid rows to PDF"
              >
                <Download className="export-btn-icon" />
                {t('paymentsDue.export.paid')}
              </button>
              <button
                onClick={() => handleExportPDF('unpaid')}
                className="export-btn export-unpaid-btn"
                disabled={isExporting || unpaidSlots.filter(slot => !slot.hasPayment).length === 0}
                title="Export only unpaid rows to PDF"
              >
                <Download className="export-btn-icon" />
                {t('paymentsDue.export.unpaid')}
              </button>
            </div>
          </div>

          {/* Payment Status Filter */}
          <div className="filter-section">
            <div className="payment-status-filter">
              <label htmlFor="payment-status">{t('paymentsDue.filter.paymentStatus')}</label>
              <select
                id="payment-status"
                value={paymentStatusFilter}
                onChange={(e) => handlePaymentStatusFilterChange(e.target.value as 'all' | 'paid' | 'unpaid')}
                className="payment-status-dropdown"
              >
                <option value="all">{t('paymentsDue.filter.all')}</option>
                <option value="unpaid">{t('paymentsDue.filter.unpaid')}</option>
                <option value="paid">{t('paymentsDue.filter.paid')}</option>
              </select>
            </div>
            
            {/* Clear Filters Button */}
            {paymentStatusFilter !== 'all' && (
              <button
                onClick={clearFilters}
                className="clear-filters-btn"
                title="Clear all filters"
              >
                🗑️ {t('paymentsDue.filter.clear')}
              </button>
            )}
          </div>

        {/* Page Size Selector */}
        <div className="page-size-selector">
          <label htmlFor="page-size">{t('paymentsDue.pageSize.label')}</label>
          <select
            id="page-size"
            value={settings.pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value) as 10 | 25 | 50 | 100)}
            className="page-size-dropdown"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>

        {/* Month Selector */}
        <div className="month-selector">
          <label htmlFor="payments-due-month">Month:</label>
          <input
            type="month"
            id="payments-due-month"
            className="month-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        </div>

        {/* Search Section */}
        <div className="payments-due-search-section">
          <div className="payments-due-search-field-selector">
            <label htmlFor="search-field">{t('paymentsDue.search.in')}</label>
            <select
              id="search-field"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as 'all' | 'name' | 'group' | 'amount')}
              className="payments-due-search-field-dropdown"
            >
              <option value="all">{t('paymentsDue.search.field.all')}</option>
              <option value="name">{t('paymentsDue.search.field.name')}</option>
              <option value="group">{t('paymentsDue.search.field.group')}</option>
              <option value="amount">{t('paymentsDue.search.field.amount')}</option>
            </select>
          </div>
          
          <div className="payments-due-search-input-container">
            <input
              type="text"
              placeholder={t('paymentsDue.search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="payments-due-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="payments-due-search-clear-btn"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {unpaidSlots.length === 0 ? (
        <div className="no-data">
          📅
          <h3>{t('paymentsDue.none.title')}</h3>
          <p>{t('paymentsDue.none.desc')}</p>
        </div>
      ) : (
        <>
          {/* Pagination Info */}
          <div className="pagination-info">
            <div className="pagination-stats">
              <span className="record-count">
                {settings.paginationType === 'true' 
                  ? `Showing all ${getFilteredSlots().length} ${canViewAllRecords ? 'records' : 'slots'}`
                  : `Showing ${startIndex + 1}-${Math.min(endIndex, getFilteredSlots().length)} of ${getFilteredSlots().length} ${canViewAllRecords ? 'records' : 'slots'}`
                }
              </span>
              {settings.paginationType === 'simple' && (
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>
            <div className="pagination-type-indicator">
              {settings.paginationType === 'simple' ? '📄 Simple Pagination' : 
               settings.paginationType === 'infinite' ? '♾️ Infinite Scroll' : 
               '🚀 True Infinite Scroll'}
            </div>
          </div>

                      <div className="payments-due-table-container">
              <table className="payments-due-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th 
                    onClick={() => handleSort('firstName')} 
                    className="payments-due-table-header sortable"
                    data-sort-icon={getSortIcon('firstName')}
                  >
                    First Name
                  </th>
                  <th 
                    onClick={() => handleSort('lastName')} 
                    className="payments-due-table-header sortable"
                    data-sort-icon={getSortIcon('lastName')}
                  >
                    Last Name
                  </th>
                  <th 
                    onClick={() => handleSort('group')} 
                    className="payments-due-table-header sortable"
                    data-sort-icon={getSortIcon('group')}
                  >
                    Group
                  </th>
                  <th 
                    onClick={() => handleSort('slot')} 
                    className="payments-due-table-header sortable"
                    data-sort-icon={getSortIcon('slot')}
                  >
                    Slot
                  </th>
                  <th 
                    onClick={() => handleSort('amount')} 
                    className="payments-due-table-header sortable"
                    data-sort-icon={getSortIcon('amount')}
                  >
                    Amount Due
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPageData.map((slot, index) => (
                  <tr 
                    key={`${slot.groupId}-${slot.memberId}-${slot.monthDate}`} 
                    className={`payments-due-table-row ${slot.hasPayment ? 'has-payment' : ''}`}
                  >
                    <td className="payments-due-table-cell row-number">{startIndex + index + 1}</td>
                    <td>{slot.member?.first_name}</td>
                    <td>{slot.member?.last_name}</td>
                    <td>{slot.group?.name}</td>
                    <td>{formatMonthDate(slot.monthDate)}</td>
                    <td className="amount">
                      <span className={`amount-label ${slot.hasPayment ? 'paid' : 'unpaid'}`}>
                        SRD {Number(slot.amount.toFixed(2)).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleRowClick(slot)}
                        className="add-payment-btn"
                        title="Add Payment"
                        disabled={slot.hasPayment}
                      >
                        ➕ {slot.hasPayment ? 'Paid' : 'Add Payment'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {settings.paginationType === 'simple' ? (
        <div className="pagination-controls">
          <button
            className="btn-pagination btn-pagination-first btn-secondary"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            title="Go to first page"
          >
            First
          </button>
          
          <button
            className="btn-pagination btn-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`btn-pagination btn-page ${page === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            className="btn-pagination btn-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          
          <button
            className="btn-pagination btn-pagination-last btn-secondary"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Go to last page"
          >
            Last
          </button>
        </div>
      ) : settings.paginationType === 'infinite' ? (
        /* Infinite Scroll Load More Button */
        <div className="infinite-scroll-controls">
          {hasMoreData && (
            <div className="infinite-scroll-status">
              {loading ? (
                <div className="loading-indicator">
                  <div className="loading-spinner"></div>
                  <span>Loading more data...</span>
                </div>
              ) : (
                <div className="scroll-hint">
                  <span>📜 Scroll down to load more rows automatically</span>
                </div>
              )}
            </div>
          )}
          {!hasMoreData && unpaidSlots.length > 0 && (
            <div className="end-message">
              <span>🎯 All {unpaidSlots.length} records loaded</span>
            </div>
          )}
        </div>
      ) : (
        /* True Infinite Scroll - No controls needed */
        <div className="true-infinite-scroll-controls">
          <div className="true-infinite-status">
            <span>🚀 All {unpaidSlots.length} records loaded at once - scroll freely!</span>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedSlot && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setSelectedSlot(null)
          }}
          onSave={handlePaymentSave}
          prefillData={{
            memberId: selectedSlot.memberId,
            groupId: selectedSlot.groupId,
            slotId: selectedSlot.id,
            amount: selectedSlot.amount,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'bank_transfer',
            status: 'pending',
            notes: ''
          }}
        />
      )}
    </div>
  )
}

export default PaymentsDue
