import { useNavigate } from 'react-router-dom'
import { Plus, Users, UserPlus, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, ArrowRight, AlertTriangle } from 'lucide-react'
import { useCachedDashboard } from '../hooks/useCachedQueries'
import { dashboardService } from '../services/dashboardService'
import './Dashboard.css'

// Dashboard Skeleton Component
const DashboardSkeleton = () => (
  <div className="dashboard">
    <div className="page-header">
      <div className="container">
        <div className="header-content">
          <div className="header-text">
            <div className="dashboard-skeleton-title"></div>
            <div className="dashboard-skeleton-subtitle"></div>
          </div>
          <div className="header-actions">
            <div className="dashboard-skeleton-button"></div>
            <div className="dashboard-skeleton-button"></div>
          </div>
        </div>
      </div>
    </div>
    
    <div className="container">
      {/* Stats Cards Skeleton */}
      <div className="dashboard-stats-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="dashboard-stat-card dashboard-skeleton-card">
            <div className="dashboard-skeleton-icon"></div>
            <div className="dashboard-skeleton-content">
              <div className="dashboard-skeleton-value"></div>
              <div className="dashboard-skeleton-title"></div>
              <div className="dashboard-skeleton-change"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Skeleton */}
      <div className="dashboard-recent-activity">
        <div className="dashboard-skeleton-section-header"></div>
        <div className="dashboard-activity-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="dashboard-activity-card dashboard-skeleton-card">
              <div className="dashboard-skeleton-activity-content">
                <div className="dashboard-skeleton-activity-title"></div>
                <div className="dashboard-skeleton-activity-subtitle"></div>
                <div className="dashboard-skeleton-activity-meta"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Groups Table Skeleton */}
      <div className="dashboard-groups-section">
        <div className="dashboard-skeleton-section-header"></div>
        <div className="dashboard-groups-table dashboard-skeleton-table">
          <div className="dashboard-skeleton-table-header"></div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="dashboard-skeleton-table-row"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

const Dashboard = () => {
  const navigate = useNavigate()
  
  // Navigation handlers
  const handleAddPayment = () => {
    navigate('/payments')
  }

  const handleCreateGroup = () => {
    navigate('/groups')
  }
  
  // Redirect regular users to My Dashboard
  // Temporarily commented out to debug the issue
  // if (user && !isAdmin() && !isSuperUser()) {
  //   return <Navigate to="/my-dashboard" replace />
  // }

  // Use cached dashboard data with React Query
  const { data: dashboardData, isLoading, error, refetch, isFetching } = useCachedDashboard()

  // Show skeleton while loading
  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Show error state
  if (error) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="error-state">
            <h2>Error Loading Dashboard</h2>
            <p>There was a problem loading the dashboard data.</p>
            <button onClick={() => refetch()} className="retry-button">
              Try Again
            </button>
            <button 
              onClick={async () => {
                try {
                  await dashboardService.testDatabaseConnection()
                  alert('Database connection test completed successfully')
                } catch (err) {
                  alert('Database connection test failed')
                }
              }} 
              className="retry-button"
              style={{ marginLeft: '10px' }}
            >
              Test Database
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state if no data
  if (!dashboardData || (!dashboardData.stats && !dashboardData.groups && !dashboardData.recentPayments)) {
    return (
      <div className="dashboard">
        <div className="dashboard-page-header">
          <div className="container">
            <div className="dashboard-header-content">
              <div className="dashboard-header-text">
                <h1>Dashboard</h1>
                <p>Overview of your Kasmoni groups and payments</p>
              </div>
              <div className="dashboard-header-actions">
                <button className="btn btn-primary" onClick={handleAddPayment}>
                  <Plus size={20} />
                  Add Payment
                </button>
                <button className="btn btn-secondary" onClick={handleCreateGroup}>
                  <UserPlus size={20} />
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container">
          <div className="empty-dashboard">
            <div className="empty-icon">
              <Users size={64} />
            </div>
            <h2>Welcome to Sranan Kasmoni</h2>
            <p>Your dashboard is ready but there's no data yet. Get started by:</p>
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={handleCreateGroup}>
                <UserPlus size={20} />
                Create Your First Group
              </button>
              <button className="btn btn-secondary" onClick={handleAddPayment}>
                <Plus size={20} />
                Add Your First Payment
              </button>
            </div>
            <div className="empty-info">
              <p>Once you have data, your dashboard will show:</p>
              <ul>
                <li>📊 Financial statistics and overview</li>
                <li>👥 Active groups and members</li>
                <li>💰 Recent payment activities</li>
                <li>📈 Progress tracking and insights</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading indicator if refetching
  const showLoadingIndicator = isFetching && !isLoading

  // Transform data for display
  const stats = [
    {
      title: 'Total Amount Expected',
      value: `SRD ${(dashboardData?.stats?.totalExpected || 0).toLocaleString()}`,
      change: (dashboardData?.stats?.totalExpected || 0) > 0 ? '+100%' : '0%',
      icon: Users, // Changed from Calendar to Users
      color: 'info'
    },
    {
      title: 'Total Amount Paid',
      value: `SRD ${(dashboardData?.stats?.totalPaid || 0).toLocaleString()}`,
      change: (dashboardData?.stats?.totalPaid || 0) > 0 && (dashboardData?.stats?.totalExpected || 0) > 0 ? 
        `+${Math.round(((dashboardData?.stats?.totalPaid || 0) / (dashboardData?.stats?.totalExpected || 1)) * 100)}%` : '0%',
      icon: DollarSign,
      color: 'success'
    },
    {
      title: 'Total Amount Received',
      value: `SRD ${(dashboardData?.stats?.totalReceived || 0).toLocaleString()}`,
      change: (dashboardData?.stats?.totalReceived || 0) > 0 ? `+100%` : '0%',
      icon: TrendingUp,
      color: 'primary'
    },
    {
      title: 'Pending Payments',
      value: `SRD ${(dashboardData?.stats?.totalPending || 0).toLocaleString()}`,
      change: (dashboardData?.stats?.totalPending || 0) > 0 ? `+${dashboardData?.stats?.totalPending || 0}` : '0',
      icon: Clock, // Changed from CreditCard to Clock
      color: 'info'
    },
    {
      title: 'Total Amount Due',
      value: `SRD ${(dashboardData?.stats?.totalAmountDue || 0).toLocaleString()}`,
      change: (dashboardData?.stats?.totalAmountDue || 0) > 0 ? `+${dashboardData?.stats?.totalAmountDue || 0}` : '0',
      icon: AlertTriangle,
      color: 'danger'
    },
    {
      title: 'Overdue Payments',
      value: `SRD ${(dashboardData?.stats?.totalOverdue || 0).toLocaleString()}`,
      change: (dashboardData?.stats?.totalOverdue || 0) > 0 ? `+${dashboardData?.stats?.totalOverdue || 0}` : '0',
      icon: XCircle, // Changed from AlertTriangle to XCircle
      color: 'warning'
    },
    {
      title: 'Active Groups',
      value: (dashboardData?.stats?.activeGroups || 0).toString(),
      change: (dashboardData?.stats?.activeGroups || 0) > 0 ? `+${dashboardData?.stats?.activeGroups || 0}` : '0',
      icon: Users, // Changed from Users to Users
      color: 'success'
    },
    {
      title: 'Active Members',
      value: `${dashboardData?.stats?.activeMembers || 0}/${dashboardData?.stats?.totalMembers || 0}`,
      change: (dashboardData?.stats?.activeMembers || 0) > 0 ? `+${dashboardData?.stats?.activeMembers || 0}` : '0',
          icon: UserPlus,
          color: 'primary'
        }
      ]

  // Helper function to format month-year
  const formatMonthYear = (dateString: string): string => {
    if (!dateString) return 'N/A'
    
    const [year, month] = dateString.split('-').map(Number)
    if (isNaN(year) || isNaN(month)) return 'N/A'
    
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    
    return `${monthNames[month - 1]} ${year}`
  }

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    return formatMonthYear(dateString) // Changed to use formatMonthYear
  }

  return (
    <div className="dashboard">
      <div className="dashboard-page-header">
        <div className="container">
          <div className="dashboard-header-content">
            <div className="dashboard-header-text">
              <h1>Dashboard</h1>
              <p>Overview of your Kasmoni groups and payments</p>
              {showLoadingIndicator && (
                <div className="loading-indicator">
                  <div className="loading-spinner"></div>
                  <span>Refreshing data...</span>
                </div>
              )}
            </div>
            <div className="dashboard-header-actions">
              <button className="btn btn-primary" onClick={handleAddPayment}>
                <Plus size={20} />
                Add Payment
              </button>
              <button className="btn btn-secondary" onClick={handleCreateGroup}>
                <UserPlus size={20} />
                Create Group
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Stats Cards */}
        <div className="dashboard-stats-grid">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon
              return (
                <div key={index} className={`dashboard-stat-card dashboard-stat-${stat.color}`}>
                      <div className="dashboard-stat-icon">
                  <IconComponent size={24} />
                  </div>
                  <div className="dashboard-stat-content">
                    <div className="dashboard-stat-value">{stat.value}</div>
                  <div className="dashboard-stat-title">{stat.title}</div>
                  <div className="dashboard-stat-change">{stat.change}</div>
                </div>
                </div>
              )
          })}
        </div>

        {/* Groups Table */}
        <div className="dashboard-groups-section">
          <h2>All Groups</h2>
          <div className="dashboard-groups-table">
            <div className="dashboard-table-header">
              <div className="dashboard-header-cell">Group Name</div>
              <div className="dashboard-header-cell">Monthly Amount</div>
              <div className="dashboard-header-cell">Next Recipient</div>
              <div className="dashboard-header-cell">Slots Progress</div>
              <div className="dashboard-header-cell">Created</div>
                       </div>
            {dashboardData?.groups
              .sort((a: any, b: any) => a.name.localeCompare(b.name))
              .map((group: any) => (
              <div key={group.id} className="dashboard-table-row">
                <div className="dashboard-table-cell">
                  <div className="dashboard-group-name">{group.name}</div>
                     </div>
                <div className="dashboard-table-cell">
                  SRD {group.monthlyAmount?.toLocaleString()}
                   </div>
                <div className="dashboard-table-cell">
                  {group.nextRecipient}
                     </div>
                <div className="dashboard-table-cell">
                  <div className="dashboard-slots-progress">
                    <span className="dashboard-slots-text">
                      {group.slotsPaid}/{group.slotsTotal}
                       </span>
                    <div className="dashboard-progress-bar">
                      <div 
                        className="dashboard-progress-fill" 
                        style={{ width: `${group.slotsTotal > 0 ? (group.slotsPaid / group.slotsTotal) * 100 : 0}%` }}
                       ></div>
                     </div>
                   </div>
                     </div>
                <div className="dashboard-table-cell">
                  {formatMonthYear(group.created_at)}
                   </div>
                 </div>
            ))}
            {(!dashboardData?.groups || dashboardData.groups.length === 0) && (
              <div className="dashboard-table-empty">No active groups</div>
             )}
           </div>
         </div>

        {/* Recent Activity */}
        <div className="dashboard-recent-activity">
          <h2>Recent Activity</h2>
          <div className="dashboard-activity-grid">
            {/* Recent Payments */}
            <div className="dashboard-activity-card">
              <div className="dashboard-activity-header">
                <h3>Recent Payments</h3>
                <span className="dashboard-activity-count">{dashboardData?.recentPayments.length || 0}</span>
              </div>
              <div className="dashboard-activity-list">
                {dashboardData?.recentPayments.slice(0, 3).map((payment: any, index: number) => {
                  // Determine icon and styling based on payment status
                  let icon, titleText, statusClass
                  
                  switch (payment.status) {
                    case 'received':
                      icon = <CheckCircle size={16} />
                      titleText = `Payment of SRD ${payment.amount?.toLocaleString()} received`
                      statusClass = 'dashboard-status-received'
                      break
                    case 'pending':
                      icon = <Clock size={16} />
                      titleText = `Payment of SRD ${payment.amount?.toLocaleString()} pending`
                      statusClass = 'dashboard-status-pending'
                      break
                    case 'settled':
                      icon = <CheckCircle size={16} />
                      titleText = `Payment of SRD ${payment.amount?.toLocaleString()} settled`
                      statusClass = 'dashboard-status-settled'
                      break
                    case 'cancelled':
                      icon = <XCircle size={16} />
                      titleText = `Payment of SRD ${payment.amount?.toLocaleString()} cancelled`
                      statusClass = 'dashboard-status-cancelled'
                      break
                    default:
                      icon = <ArrowRight size={16} />
                      titleText = `Payment of SRD ${payment.amount?.toLocaleString()} - ${payment.status}`
                      statusClass = 'dashboard-status-default'
                  }
                  
                  return (
                    <div key={index} className={`dashboard-activity-item ${statusClass}`}>
                      <div className="dashboard-activity-icon">
                        {icon}
                      </div>
                      <div className="dashboard-activity-content">
                        <div className="dashboard-activity-title">
                          {titleText}
                        </div>
                        <div className="dashboard-activity-subtitle">
                          {payment.member_name || 'Unknown Member'}
                        </div>
                        <div className="dashboard-activity-meta">
                          {formatRelativeTime(payment.payment_date)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {(!dashboardData?.recentPayments || dashboardData.recentPayments.length === 0) && (
                  <div className="dashboard-activity-empty">No recent payments</div>
                )}
              </div>
            </div>

            {/* Recent Members */}
            <div className="dashboard-activity-card">
              <div className="dashboard-activity-header">
                <h3>Recent Members</h3>
                <span className="dashboard-activity-count">{dashboardData?.recentMembers.length || 0}</span>
              </div>
              <div className="dashboard-activity-list">
                {dashboardData?.recentMembers.slice(0, 3).map((member: any, index: number) => (
                  <div key={index} className="dashboard-activity-item">
                    <div className="dashboard-activity-icon">
                       <UserPlus size={16} />
                     </div>
                       <div className="dashboard-activity-content">
                         <div className="dashboard-activity-title">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="dashboard-activity-subtitle">
                        {member.email || 'No email'}
                         </div>
                      <div className="dashboard-activity-meta">
                           {formatRelativeTime(member.created_at)}
                         </div>
                       </div>
                  </div>
                ))}
                {(!dashboardData?.recentMembers || dashboardData.recentMembers.length === 0) && (
                  <div className="dashboard-activity-empty">No recent members</div>
                )}
                     </div>
                   </div>

            {/* Recent Groups */}
            <div className="dashboard-activity-card">
              <div className="dashboard-activity-header">
                <h3>Recent Groups</h3>
                <span className="dashboard-activity-count">{dashboardData?.recentGroups.length || 0}</span>
              </div>
              <div className="dashboard-activity-list">
                {dashboardData?.recentGroups.slice(0, 3).map((group: any, index: number) => (
                  <div key={index} className="dashboard-activity-item">
                    <div className="dashboard-activity-icon">
                       <Users size={16} />
                     </div>
                     <div className="dashboard-activity-content">
                      <div className="dashboard-activity-title">{group.name}</div>
                      <div className="dashboard-activity-subtitle">
                        SRD {group.monthly_amount?.toLocaleString()}/month
                       </div>
                      <div className="dashboard-activity-meta">
                        {formatRelativeTime(group.created_at)}
                       </div>
                     </div>
                   </div>
                 ))}
                {(!dashboardData?.recentGroups || dashboardData.recentGroups.length === 0) && (
                  <div className="dashboard-activity-empty">No recent groups</div>
             )}
           </div>
         </div>
                       </div>
                     </div>
      </div>
    </div>
  )
}

export default Dashboard
