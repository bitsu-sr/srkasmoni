import React, { useState, useEffect, useCallback } from 'react'
import { usePerformanceSettings } from '../contexts/PerformanceSettingsContext'
import { paymentSlotService } from '../services/paymentSlotService'
import { paymentService } from '../services/paymentService'
import { optimizedQueryService } from '../services/optimizedQueryService'
import { PaymentSlot } from '../types/paymentSlot'
import { PaymentStats } from '../types/payment'
import PaymentModal from '../components/PaymentModal'
import type { PaymentFormData } from '../types/payment'
import './PaymentsDue.css'

// Type for unpaid slots with member and group info
interface UnpaidSlot extends PaymentSlot {
  hasPayment: boolean
}

type SortField = 'firstName' | 'lastName' | 'group' | 'slot' | 'amount'
type SortDirection = 'asc' | 'desc'

const PaymentsDue: React.FC = () => {
  const { settings, updateSetting } = usePerformanceSettings()
  
  // State for data
  const [unpaidSlots, setUnpaidSlots] = useState<UnpaidSlot[]>([])
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('group')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
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

  // Calculate pagination values based on settings
  const pageSize = settings.pageSize
  const totalPages = Math.ceil(unpaidSlots.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    updateSetting('pageSize', newPageSize as 10 | 25 | 50 | 100)
    // Reset to first page when page size changes
    setCurrentPage(1)
  }

  // Load data based on performance settings
  const loadUnpaidSlots = useCallback(async () => {
    setLoading(true)
    setError(null)
    const startTime = performance.now()

    try {
      let slots: PaymentSlot[] = []
      let stats: PaymentStats | null = null

      if (settings.enableOptimizedQueries) {
        // Phase 2: Single Optimized Queries
        console.log('🔄 Loading with Phase 2: Single Optimized Queries')
        const phase2Start = performance.now()
        
        try {
          const optimizedSlots = await optimizedQueryService.getAllSlotsOptimized()
          // Transform optimized slots to our format
          slots = optimizedSlots.map(slot => ({
            id: slot.id,
            groupId: slot.groupId,
            memberId: slot.memberId,
            monthDate: slot.monthDate,
            amount: slot.amount,
            dueDate: slot.monthDate, // Use monthDate as dueDate for now
            createdAt: new Date().toISOString(),
            member: {
              id: slot.memberId,
              first_name: slot.member_first_name,
              last_name: slot.member_last_name
            },
            group: {
              id: slot.groupId,
              name: slot.group_name,
              monthly_amount: slot.group_monthly_amount
            }
          }))
          
          // Get payment stats separately
          stats = await paymentService.getPaymentStats()
          
          const phase2Time = performance.now() - phase2Start
          console.log(`✅ Phase 2 completed in ${phase2Time.toFixed(2)}ms`)
          setPerformanceMetrics(prev => ({ ...prev, phase2Time }))
        } catch (phase2Error) {
          console.warn('⚠️ Phase 2 failed, falling back to Phase 1:', phase2Error)
          // Fallback to Phase 1
          const phase1Start = performance.now()
          const [slotsResult, statsResult] = await Promise.all([
            paymentSlotService.getAllSlots(),
            paymentService.getPaymentStats()
          ])
          slots = slotsResult
          stats = statsResult
          
          const phase1Time = performance.now() - phase1Start
          setPerformanceMetrics(prev => ({ ...prev, phase1Time }))
        }
      } else if (settings.enableParallelCalls) {
        // Phase 1: Parallel Database Calls
        console.log('🔄 Loading with Phase 1: Parallel Database Calls')
        const phase1Start = performance.now()
        
        const [slotsResult, statsResult] = await Promise.all([
          paymentSlotService.getAllSlots(),
          paymentService.getPaymentStats()
        ])
        slots = slotsResult
        stats = statsResult
        
        const phase1Time = performance.now() - phase1Start
        console.log(`✅ Phase 1 completed in ${phase1Time.toFixed(2)}ms`)
        setPerformanceMetrics(prev => ({ ...prev, phase1Time }))
      } else {
        // Default: Sequential loading
        console.log('🔄 Loading with default sequential approach')
        const defaultStart = performance.now()
        
        slots = await paymentSlotService.getAllSlots()
        stats = await paymentService.getPaymentStats()
        
        const defaultTime = performance.now() - defaultStart
        console.log(`✅ Default loading completed in ${defaultTime.toFixed(2)}ms`)
      }

      // Check payment status for all slots
      const slotsWithPayments = await paymentService.checkMultipleSlotsPaymentStatus(
        slots.map(slot => ({
          groupId: slot.groupId,
          memberId: slot.memberId,
          monthDate: slot.monthDate
        }))
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
      setPaymentStats(stats)
      
      const totalTime = performance.now() - startTime
      console.log(`🎯 Total loading time: ${totalTime.toFixed(2)}ms`)
      setPerformanceMetrics(prev => ({ ...prev, totalTime }))
      
    } catch (err) {
      console.error('❌ Error loading unpaid slots:', err)
      setError('Failed to load slots. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [settings.enableParallelCalls, settings.enableOptimizedQueries])

  // Get sorted slots
  const getSortedSlots = () => {
    return [...unpaidSlots].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'firstName':
          aValue = a.member?.first_name?.toLowerCase() || ''
          bValue = b.member?.last_name?.toLowerCase() || ''
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

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }

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
  const totalAmount = unpaidSlots.reduce((sum, slot) => sum + slot.amount, 0)
  const totalAmountPaid = paymentStats?.totalAmount || 0

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
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

  if (loading) {
    return (
      <div className="payments-due-container">
        <div className="loading">Loading unpaid slots...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="payments-due-container">
        <div className="error">{error}</div>
        <button onClick={loadUnpaidSlots} className="retry-btn">Retry</button>
      </div>
    )
  }

  return (
    <div className="payments-due-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Payments Due</h1>
          <h2>All slots from all groups</h2>
          <p>Data from group_members table</p>
        </div>
        <div className="header-actions">
          {/* Page Size Selector */}
          <div className="page-size-selector">
            <label htmlFor="page-size">Rows per page:</label>
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
          
          <button 
            onClick={loadUnpaidSlots} 
            className="refresh-btn"
            title="Refresh"
          >
            🔄 Refresh
          </button>
          <button 
            onClick={comparePerformance}
            className="performance-btn"
            title="Show Performance Comparison"
          >
            📊 Performance
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="statistics-section">
        <div className="stat-card stat-card-default">
          <div className="stat-icon">
            💰
          </div>
          <div className="stat-content">
            <div className="stat-number">{unpaidSlots.length}</div>
            <div className="stat-label">Total Slots</div>
          </div>
        </div>
        <div className="stat-card stat-card-default">
          <div className="stat-icon">
            📅
          </div>
          <div className="stat-content">
            <div className="stat-number">SRD {totalAmount.toFixed(2)}</div>
            <div className="stat-label">Total Amount</div>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-icon">
            ✅
          </div>
          <div className="stat-content">
            <div className="stat-number">SRD {totalAmountPaid.toFixed(2)}</div>
            <div className="stat-label">Total Amount Paid</div>
          </div>
        </div>
        <div className="stat-card stat-card-danger">
          <div className="stat-icon">
            ⚠️
          </div>
          <div className="stat-content">
            <div className="stat-number">SRD {Math.max(0, totalAmount - totalAmountPaid).toFixed(2)}</div>
            <div className="stat-label">Total Amount Due</div>
          </div>
        </div>
      </div>

      {/* Performance Status Display */}
      {Object.keys(performanceMetrics).length > 0 && (
        <div className="performance-status-display">
          <div className="status-indicator">
            <span className="status-phase">
              {settings.enableOptimizedQueries ? '🚀 Phase 2' : 
               settings.enableParallelCalls ? '⚡ Phase 1' : '🐌 Default'}
            </span>
            <span className="status-info">
              {settings.enableOptimizedQueries ? 'Single Optimized Queries' :
               settings.enableParallelCalls ? 'Parallel Database Calls' : 'Sequential Loading'}
            </span>
          </div>
        </div>
      )}

      {unpaidSlots.length === 0 ? (
        <div className="no-data">
          📅
          <h3>No Payments Due</h3>
          <p>All members have paid their current month's slots!</p>
        </div>
      ) : (
        <>
          {/* Pagination Info */}
          <div className="pagination-info">
            <div className="pagination-stats">
              <span className="record-count">
                {settings.paginationType === 'true' 
                  ? `Showing all ${unpaidSlots.length} records`
                  : `Showing ${startIndex + 1}-${Math.min(endIndex, unpaidSlots.length)} of ${unpaidSlots.length} records`
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

          <div className="table-container">
            <table className="payments-due-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th onClick={() => handleSort('firstName')} className="sortable">
                    First Name{getSortIcon('firstName')}
                  </th>
                  <th onClick={() => handleSort('lastName')} className="sortable">
                    Last Name{getSortIcon('lastName')}
                  </th>
                  <th onClick={() => handleSort('group')} className="sortable">
                    Group{getSortIcon('group')}
                  </th>
                  <th onClick={() => handleSort('slot')} className="sortable">
                    Slot{getSortIcon('slot')}
                  </th>
                  <th onClick={() => handleSort('amount')} className="sortable">
                    Amount Due{getSortIcon('amount')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPageData.map((slot, index) => (
                  <tr 
                    key={`${slot.groupId}-${slot.memberId}-${slot.monthDate}`} 
                    className={`table-row ${slot.hasPayment ? 'has-payment' : ''}`}
                  >
                    <td className="row-number">{startIndex + index + 1}</td>
                    <td>{slot.member?.first_name}</td>
                    <td>{slot.member?.last_name}</td>
                    <td>{slot.group?.name}</td>
                    <td>{formatMonthDate(slot.monthDate)}</td>
                    <td className="amount">
                      <span className={`amount-label ${slot.hasPayment ? 'paid' : 'unpaid'}`}>
                        SRD {slot.amount.toFixed(2)}
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
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`btn btn-page ${page === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
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
