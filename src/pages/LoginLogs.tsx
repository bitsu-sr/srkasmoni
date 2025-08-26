import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { RefreshCw, Shield, LogIn, LogOut, XCircle, Users, Activity, Calendar } from 'lucide-react'
import './LoginLogs.css'

interface LoginLog {
  id: number
  timestamp: string
  username: string
  first_name: string | null
  last_name: string | null
  ip_address: string
  action: 'login' | 'logout' | 'failed_login'
  success: boolean
  error_details?: string | null
}

const LoginLogs = () => {
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalActivities: 0,
    successfulLogins: 0,
    logouts: 0,
    failedAttempts: 0,
    uniqueUsers: 0,
    todayLogins: 0
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [logsPerPage] = useState(20)
  const [totalLogs, setTotalLogs] = useState(0)

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get total count
      const { count } = await supabase
        .from('auth_logs')
        .select('*', { count: 'exact', head: true })
      
      setTotalLogs(count || 0)
      
      // Get paginated logs
      const { data, error } = await supabase
        .from('auth_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range((currentPage - 1) * logsPerPage, currentPage * logsPerPage - 1)
      
      if (error) throw error
      
      setLogs(data || [])
      calculateStats(data || [])
    } catch (err) {
      console.error('Error loading login logs:', err)
      setError('Failed to load login logs')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (logsData: LoginLog[]) => {
    const today = new Date().toISOString().split('T')[0]
    
    const stats = {
      totalActivities: logsData.length,
      successfulLogins: logsData.filter(log => log.action === 'login' && log.success).length,
      logouts: logsData.filter(log => log.action === 'logout').length,
      failedAttempts: logsData.filter(log => log.action === 'failed_login').length,
      uniqueUsers: new Set(logsData.map(log => log.username)).size,
      todayLogins: logsData.filter(log => 
        log.action === 'login' && 
        log.success && 
        log.timestamp.startsWith(today)
      ).length
    }
    
    setStats(stats)
  }

  const handleRefresh = () => {
    setCurrentPage(1) // Reset to first page
    loadLogs()
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  useEffect(() => {
    loadLogs()
  }, [currentPage])

  const totalPages = Math.ceil(totalLogs / logsPerPage)

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <LogIn size={16} />
      case 'logout':
        return <LogOut size={16} />
      case 'failed_login':
        return <XCircle size={16} />
      default:
        return <Activity size={16} />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login':
        return 'login-logs-action-login'
      case 'logout':
        return 'login-logs-action-logout'
      case 'failed_login':
        return 'login-logs-action-failed'
      default:
        return 'login-logs-action-default'
    }
  }

  if (loading && logs.length === 0) {
    return (
      <div className="login-logs-page">
        <div className="login-logs-header">
          <div className="login-logs-title-section">
            <Shield className="login-logs-title-icon" />
            <h1>Login Logs</h1>
          </div>
        </div>
        <div className="login-logs-loading">
          <div className="spinner"></div>
          <p>Loading login logs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="login-logs-page">
        <div className="login-logs-header">
          <div className="login-logs-title-section">
            <Shield className="login-logs-title-icon" />
            <h1>Login Logs</h1>
          </div>
        </div>
        <div className="login-logs-error">
          <p>Error: {error}</p>
          <button onClick={handleRefresh} className="login-logs-btn-retry">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-logs-page">
      <div className="login-logs-header">
        <div className="login-logs-title-section">
          <Shield className="login-logs-title-icon" />
          <h1>Login Logs</h1>
        </div>
        <button 
          onClick={handleRefresh} 
          className="login-logs-btn-refresh"
          title="Refresh logs"
        >
          <RefreshCw size={20} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="login-logs-stats">
        <div className="login-logs-stat-card login-logs-stat-total">
          <div className="login-logs-stat-icon">
            <Activity size={24} />
          </div>
          <div className="login-logs-stat-content">
            <div className="login-logs-stat-number">{stats.totalActivities}</div>
            <div className="login-logs-stat-label">Total Activities</div>
          </div>
        </div>

        <div className="login-logs-stat-card login-logs-stat-success">
          <div className="login-logs-stat-icon">
            <LogIn size={24} />
          </div>
          <div className="login-logs-stat-content">
            <div className="login-logs-stat-number">{stats.successfulLogins}</div>
            <div className="login-logs-stat-label">Successful Logins</div>
          </div>
        </div>

        <div className="login-logs-stat-card login-logs-stat-logout">
          <div className="login-logs-stat-icon">
            <LogOut size={24} />
          </div>
          <div className="login-logs-stat-content">
            <div className="login-logs-stat-number">{stats.logouts}</div>
            <div className="login-logs-stat-label">Logouts</div>
          </div>
        </div>

        <div className="login-logs-stat-card login-logs-stat-failed">
          <div className="login-logs-stat-icon">
            <XCircle size={24} />
          </div>
          <div className="login-logs-stat-content">
            <div className="login-logs-stat-number">{stats.failedAttempts}</div>
            <div className="login-logs-stat-label">Failed Attempts</div>
          </div>
        </div>

        <div className="login-logs-stat-card login-logs-stat-users">
          <div className="login-logs-stat-icon">
            <Users size={24} />
          </div>
          <div className="login-logs-stat-content">
            <div className="login-logs-stat-number">{stats.uniqueUsers}</div>
            <div className="login-logs-stat-label">Unique Users</div>
          </div>
        </div>

        <div className="login-logs-stat-card login-logs-stat-today">
          <div className="login-logs-stat-icon">
            <Calendar size={24} />
          </div>
          <div className="login-logs-stat-content">
            <div className="login-logs-stat-number">{stats.todayLogins}</div>
            <div className="login-logs-stat-label">Today's Logins</div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="login-logs-table-container">
        <table className="login-logs-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Username</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>IP Address</th>
              <th>Error Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="login-log-row">
                <td className="login-log-action-cell">
                  <span className={`login-log-action-badge ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                    {log.action.replace('_', ' ')}
                  </span>
                </td>
                <td className="login-log-username-cell">
                  <span className="username-text">{log.username}</span>
                </td>
                <td className="login-log-firstname-cell">
                  <span className="firstname-text">{log.first_name || '-'}</span>
                </td>
                <td className="login-log-lastname-cell">
                  <span className="lastname-text">{log.last_name || '-'}</span>
                </td>
                <td className="login-log-ip-cell">
                  <span className="ip-address-text">{log.ip_address || '-'}</span>
                </td>
                <td className="login-log-error-cell">
                  <span className="error-details-text">
                    {log.action === 'failed_login' && log.error_details ? log.error_details : '-'}
                  </span>
                </td>
                <td className="login-log-timestamp-cell">
                  <span className="timestamp-text">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="login-logs-pagination">
          <button
            className="login-logs-btn-pagination login-logs-btn-first login-logs-btn-secondary"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            title="Go to first page"
          >
            First
          </button>
          
          <button
            className="login-logs-btn-pagination login-logs-btn-prev"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <div className="login-logs-page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 2 && page <= currentPage + 2)
              )
              .map((page, index, array) => (
                <React.Fragment key={page}>
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="login-logs-page-ellipsis">...</span>
                  )}
                  <button
                    className={`login-logs-btn-pagination ${
                      page === currentPage ? 'login-logs-btn-active' : ''
                    }`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
          </div>

          <button
            className="login-logs-btn-pagination login-logs-btn-next"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>

          <button
            className="login-logs-btn-pagination login-logs-btn-last login-logs-btn-secondary"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Go to last page"
          >
            Last
          </button>
        </div>
      )}

      {logs.length === 0 && !loading && (
        <div className="login-logs-empty">
          <p>No login logs found.</p>
        </div>
      )}
    </div>
  )
}

export default LoginLogs
