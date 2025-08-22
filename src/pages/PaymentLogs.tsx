import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, User, Users, Activity, Clock, Eye, FileText, RefreshCw } from 'lucide-react'
import { paymentLogService } from '../services/paymentLogService'


import type { PaymentLogFilters } from '../types/paymentLog'
import './PaymentLogs.css'

const PaymentLogs: React.FC = () => {

  
  const [filters, setFilters] = useState<PaymentLogFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')


  
  // Fetch payment logs with filters
  const { data: paymentLogs, isLoading, error, refetch } = useQuery({
    queryKey: ['paymentLogs', filters],
    queryFn: () => paymentLogService.getPaymentLogs(filters),
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch when component mounts
  })


  
  // Fetch payment log statistics
  const { data: stats } = useQuery({
    queryKey: ['paymentLogStats'],
    queryFn: () => paymentLogService.getPaymentLogStats(),
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
    setFilters(prev => ({
      ...prev,
      action: selectedAction || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
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

  return (
    <div className="payment-logs-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Payment Logs</h1>
          <p>Track all payment activities and changes</p>
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
              paymentLogService.getPaymentLogStats().then(result => {
                console.log('📊 Manual stats result:', result)
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
              <h3>{stats.totalLogs}</h3>
              <p>TOTAL LOGS</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Activity size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.updates}</h3>
              <p>UPDATES</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Eye size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.deletions}</h3>
              <p>DELETIONS</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats.todayLogs}</h3>
              <p>TODAY</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by member name, group name..."
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
                                           {paymentLogs && paymentLogs.length > 0 ? (
                paymentLogs.map((log) => {
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

      {/* Pagination or Load More */}
      {paymentLogs && paymentLogs.length > 0 && (
        <div className="pagination-section">
          <p className="results-count">
            Showing {paymentLogs.length} payment logs
          </p>
        </div>
      )}
    </div>
  )
}

export default PaymentLogs
