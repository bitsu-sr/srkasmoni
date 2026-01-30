import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, User, Users, Activity, Clock, Eye, FileText, RefreshCw } from 'lucide-react'
import { paymentLogService } from '../services/paymentLogService'
import { useAuth } from '../contexts/AuthContext'
import MonthFilter from '../components/MonthFilter'
import { useMonthFilter } from '../hooks/useMonthFilter'

import type { PaymentLogFilters } from '../types/paymentLog'
import './PaymentLogs.css'

const PaymentLogs: React.FC = () => {
  const { user } = useAuth()
  
  // Determine user permissions
  const isAdmin = user?.role === 'admin'
  const isSuperUser = user?.role === 'super_user'
  const canViewAllRecords = isAdmin || isSuperUser
  
  const [filters, setFilters] = useState<PaymentLogFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Month filter state (persisted)
  const { selectedMonth, updateMonth } = useMonthFilter('payment-logs')


  
  // Fetch payment logs with filters
  const { data: paymentLogs, isLoading, error, refetch } = useQuery({
    queryKey: ['paymentLogs', filters, canViewAllRecords, user?.username],
    queryFn: () => {
      const normalizedFilters = {
        ...filters,
        startDate: normalizeDateString(filters.startDate),
        endDate: normalizeDateString(filters.endDate)
      }
      // If user can view all records, pass filters as is
      if (canViewAllRecords) {
        return paymentLogService.getPaymentLogs(normalizedFilters)
      }
      
      // If normal user, get their member ID and filter by it
      if (user?.username) {
        // First get the member ID for this user
        return paymentLogService.getPaymentLogsByUserEmail(user.email || '', normalizedFilters)
      }
      
      return paymentLogService.getPaymentLogs(normalizedFilters)
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
  })


  
  // Fetch payment log statistics
  const { data: stats } = useQuery({
    queryKey: ['paymentLogStats', canViewAllRecords, user?.username],
    queryFn: () => {
      if (canViewAllRecords) {
        return paymentLogService.getPaymentLogStats()
      }
      
      // For normal users, return basic stats based on their logs
      if (paymentLogs) {
        const userStats = {
          totalLogs: paymentLogs.length,
          updates: paymentLogs.filter(log => log.action === 'updated').length,
          deletions: paymentLogs.filter(log => log.action === 'deleted').length,
          todayLogs: paymentLogs.filter(log => {
            const today = new Date().toDateString()
            const logDate = new Date(log.createdAt).toDateString()
            return today === logDate
          }).length
        }
        return userStats
      }
      
      return paymentLogService.getPaymentLogStats()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
  })



  // Apply search filter
  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined
    }))
  }

  // Apply filters
  const applyFilters = () => {
    const normalizedStartDate = normalizeDateString(startDate)
    const normalizedEndDate = normalizeDateString(endDate)
    if (normalizedStartDate && normalizedStartDate !== startDate) {
      setStartDate(normalizedStartDate)
    }
    if (normalizedEndDate && normalizedEndDate !== endDate) {
      setEndDate(normalizedEndDate)
    }
    setFilters(prev => ({
      ...prev,
      action: selectedAction || undefined,
      startDate: normalizedStartDate || undefined,
      endDate: normalizedEndDate || undefined
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    setSelectedAction('')
    setStartDate('')
    setEndDate('')
  }

  // Auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refetch])

  // Format timestamp to local timezone
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  // Get action icon and color
  const getActionDisplay = (action: string) => {
    switch (action) {
      case 'created':
        return { icon: <FileText size={16} />, color: 'var(--success-color)', label: 'Created' }
      case 'updated':
        return { icon: <Activity size={16} />, color: 'var(--warning-color)', label: 'Updated' }
      case 'deleted':
        return { icon: <Eye size={16} />, color: 'var(--danger-color)', label: 'Deleted' }
      case 'status_changed':
        return { icon: <Clock size={16} />, color: 'var(--info-color)', label: 'Status Changed' }
      default:
        return { icon: <Activity size={16} />, color: 'var(--text-color)', label: action }
    }
  }

  // Get status display
  const getStatusDisplay = (status?: string) => {
    if (!status) return null
    
    const statusColors: Record<string, string> = {
      'not_paid': 'var(--danger-color)',
      'pending': 'var(--warning-color)',
      'received': 'var(--success-color)',
      'settled': 'var(--info-color)'
    }
    
    return (
      <span 
        className="status-badge"
        style={{ backgroundColor: statusColors[status] || 'var(--text-color)' }}
      >
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getMonthRange = (month: string) => {
    const [year, monthNumber] = month.split('-').map(Number)
    const start = `${year}-${String(monthNumber).padStart(2, '0')}-01`
    const endDay = new Date(year, monthNumber + 1, 0).getDate()
    const end = `${year}-${String(monthNumber).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    return { start, end }
  }

  const normalizeDateString = (dateString?: string) => {
    if (!dateString) return undefined
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return dateString
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    if (!year || !month || !day) return dateString
    const safeMonth = Math.min(Math.max(month, 1), 12)
    const lastDay = new Date(year, safeMonth, 0).getDate()
    const safeDay = Math.min(Math.max(day, 1), lastDay)
    return `${year}-${String(safeMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
  }

  useEffect(() => {
    const { start, end } = getMonthRange(selectedMonth)
    const normalizedStart = normalizeDateString(start) as string
    const normalizedEnd = normalizeDateString(end) as string
    setStartDate(normalizedStart)
    setEndDate(normalizedEnd)
    setFilters(prev => ({
      ...prev,
      startDate: normalizedStart,
      endDate: normalizedEnd
    }))
    setCurrentPage(1)
  }, [selectedMonth])

  // Pagination calculations
  const totalLogs = paymentLogs?.length || 0
  const totalPages = Math.ceil(totalLogs / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageData = paymentLogs ? paymentLogs.slice(startIndex, endIndex) : []

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  if (error) {
    return (
      <div className="payment-logs-container">
        <div className="error-message">
          <h2>Error Loading Payment Logs</h2>
          <p>{error.message}</p>
          <button onClick={() => refetch()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Show message if normal user has no member record
  if (!canViewAllRecords && paymentLogs && paymentLogs.length === 0 && !isLoading) {
    return (
      <div className="payment-logs-container">
        <div className="no-member-record">
          <h2>No Payment Logs Found</h2>
          <p>You don't have any payment logs associated with your account.</p>
          <p>This usually means your member record hasn't been created yet or there's a mismatch between your user account and member record.</p>
          <button onClick={() => refetch()} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-logs-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Payment Logs</h1>
          <p>
            {canViewAllRecords 
              ? 'Track all payment activities and changes' 
              : 'Track your payment activities and changes'
            }
          </p>
          {!canViewAllRecords && (
            <div className="access-notice">
              <span>🔒 Viewing only your payment logs</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          <button 
            className="refresh-button"
            onClick={() => {
              refetch()
              // Also refresh stats
              window.location.reload()
            }}
            title="Refresh Payment Logs"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
          <button 
            className="refresh-button"
            onClick={() => {
              // Force a fresh call to getPaymentLogStats
              paymentLogService.getPaymentLogStats().then(() => {
                // Stats refreshed successfully
              }).catch(error => {
                console.error('❌ Manual stats error:', error)
              })
            }}
            title="Refresh Stats Only"
            style={{ backgroundColor: 'var(--info-color)' }}
          >
            <RefreshCw size={20} />
            Stats
          </button>
          <button 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
            Filters
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <h3>
                {canViewAllRecords ? stats.totalLogs : (paymentLogs?.length || 0)}
              </h3>
              <p>
                {canViewAllRecords ? 'TOTAL LOGS' : 'YOUR LOGS'}
              </p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Activity size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.updates}</h3>
              <p>
                {canViewAllRecords ? 'UPDATES' : 'YOUR UPDATES'}
              </p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Eye size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.deletions}</h3>
              <p>
                {canViewAllRecords ? 'DELETIONS' : 'YOUR DELETIONS'}
              </p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.todayLogs}</h3>
              <p>
                {canViewAllRecords ? 'TODAY' : 'YOUR TODAY'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-filters-section">
        <div className="payment-logs-month-filter">
          <MonthFilter
            selectedMonth={selectedMonth}
            onMonthChange={updateMonth}
          />
        </div>
        {!canViewAllRecords && (
          <div className="search-notice">
            <span>🔍 Search within your payment logs only</span>
          </div>
        )}
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder={canViewAllRecords ? "Search by member name, group name..." : "Search your payment logs..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="search-button">
            Search
          </button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            {!canViewAllRecords && (
              <div className="filter-notice">
                <span>🔧 Filters apply to your payment logs only</span>
              </div>
            )}
            <div className="filter-row">
              <div className="filter-group">
                <label>Action:</label>
                <select 
                  value={selectedAction} 
                  onChange={(e) => setSelectedAction(e.target.value)}
                >
                  <option value="">All Actions</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="deleted">Deleted</option>
                  <option value="status_changed">Status Changed</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label>End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="filter-actions">
              <button onClick={applyFilters} className="apply-filters-btn">
                Apply Filters
              </button>
              <button onClick={clearFilters} className="clear-filters-btn">
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Info */}
      {paymentLogs && paymentLogs.length > 0 && (
        <div className="payment-logs-pagination-section">
          <div className="payment-logs-page-size-selector">
            <label htmlFor="payment-logs-page-size">Rows per page</label>
            <select
              id="payment-logs-page-size"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
              className="payment-logs-page-size-dropdown"
            >
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
          
          <div className="payment-logs-pagination-info">
            <div className="payment-logs-pagination-stats">
              <span className="payment-logs-record-count">
                Showing {startIndex + 1}-{Math.min(endIndex, totalLogs)} of {totalLogs} logs
                {!canViewAllRecords && ' (your logs only)'}
              </span>
              <span className="payment-logs-page-info">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Logs Table */}
      <div className="logs-table-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading payment logs...</p>
          </div>
        ) : (
          <div className="logs-table">
            <div className="table-header">
              <div className="header-cell">Action</div>
              <div className="header-cell">Member</div>
              <div className="header-cell">Group</div>
              <div className="header-cell">Changes</div>
              <div className="header-cell">Amount</div>
              <div className="header-cell">Status</div>
              <div className="header-cell">Timestamp</div>
            </div>
            
            <div className="table-body">
              {currentPageData.length > 0 ? (
                currentPageData.map((log) => {
                  const actionDisplay = getActionDisplay(log.action)
                  return (
                    <div key={log.id} className="table-row">
                      <div className="table-cell action-cell">
                        <div 
                          className="action-badge"
                          style={{ backgroundColor: actionDisplay.color }}
                        >
                          {actionDisplay.icon}
                          {actionDisplay.label}
                        </div>
                      </div>
                      
                      <div className="table-cell member-cell">
                        {log.member ? (
                          <div className="member-info">
                            <User size={16} />
                            <span>{log.member.firstName} {log.member.lastName}</span>
                          </div>
                        ) : (
                          <span className="no-data">N/A</span>
                        )}
                      </div>
                      
                      <div className="table-cell group-cell">
                        {log.group ? (
                          <div className="group-info">
                            <Users size={16} />
                            <span>{log.group.name}</span>
                          </div>
                        ) : (
                          <span className="no-data">N/A</span>
                        )}
                      </div>
                      
                      <div className="table-cell changes-cell">
                        {log.changesSummary ? (
                          <span className="changes-summary">{log.changesSummary}</span>
                        ) : (
                          <span className="no-data">No changes</span>
                        )}
                      </div>
                      
                      <div className="table-cell amount-cell">
                        {log.newAmount && typeof log.newAmount === 'number' ? (
                          <span className="amount">${log.newAmount.toFixed(2)}</span>
                        ) : log.oldAmount && typeof log.oldAmount === 'number' ? (
                          <span className="amount old-amount">${log.oldAmount.toFixed(2)}</span>
                        ) : (
                          <span className="no-data">N/A</span>
                        )}
                      </div>
                      
                      <div className="table-cell status-cell">
                        {log.newStatus ? (
                          getStatusDisplay(log.newStatus)
                        ) : log.oldStatus ? (
                          getStatusDisplay(log.oldStatus)
                        ) : (
                          <span className="no-data">N/A</span>
                        )}
                      </div>
                      
                      <div className="table-cell timestamp-cell">
                        <div className="timestamp">
                          <Clock size={14} />
                          <span>{formatTimestamp(log.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="empty-state">
                  <FileText size={48} />
                  <h3>No Payment Logs Found</h3>
                  <p>No payment activities match your current filters.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {paymentLogs && paymentLogs.length > 0 && totalPages > 1 && (
        <div className="payment-logs-pagination-controls">
          <button
            className="payment-logs-btn-pagination payment-logs-btn-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div className="payment-logs-page-numbers">
            {(() => {
              const pages = []
              const maxVisiblePages = 5
              
              if (totalPages <= maxVisiblePages) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(
                    <button
                      key={i}
                      className={`payment-logs-btn-pagination payment-logs-btn-page ${i === currentPage ? 'payment-logs-active' : ''}`}
                      onClick={() => handlePageChange(i)}
                    >
                      {i}
                    </button>
                  )
                }
              } else {
                let startPage = Math.max(1, currentPage - 2)
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                
                if (endPage - startPage < maxVisiblePages - 1) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1)
                }
                
                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      className="payment-logs-btn-pagination payment-logs-btn-page"
                      onClick={() => handlePageChange(1)}
                    >
                      1
                    </button>
                  )
                  
                  if (startPage > 2) {
                    pages.push(
                      <span key="ellipsis1" className="payment-logs-ellipsis">...</span>
                    )
                  }
                }
                
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      className={`payment-logs-btn-pagination payment-logs-btn-page ${i === currentPage ? 'payment-logs-active' : ''}`}
                      onClick={() => handlePageChange(i)}
                    >
                      {i}
                    </button>
                  )
                }
                
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="ellipsis2" className="payment-logs-ellipsis">...</span>
                    )
                  }
                  
                  pages.push(
                    <button
                      key={totalPages}
                      className="payment-logs-btn-pagination payment-logs-btn-page"
                      onClick={() => handlePageChange(totalPages)}
                    >
                      {totalPages}
                    </button>
                  )
                }
              }
              
              return pages
            })()}
          </div>
          
          <button
            className="payment-logs-btn-pagination payment-logs-btn-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default PaymentLogs
