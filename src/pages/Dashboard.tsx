import { useState, useEffect } from 'react'
import { DollarSign, Users, CreditCard, AlertTriangle, TrendingUp, Calendar, Plus, UserPlus, CheckCircle } from 'lucide-react'
import { dashboardService, DashboardData } from '../services/dashboardService'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState([
    {
      title: 'Total Amount Expected',
      value: 'SRD 0',
      change: '0%',
      icon: Calendar,
      color: 'info'
    },
    {
      title: 'Total Amount Paid',
      value: 'SRD 0',
      change: '0%',
      icon: DollarSign,
      color: 'success'
    },
    {
      title: 'Total Amount Received',
      value: 'SRD 0',
      change: '0%',
      icon: TrendingUp,
      color: 'primary'
    },
    {
      title: 'Pending Payments',
      value: 'SRD 0',
      change: '0',
      icon: CreditCard,
      color: 'info'
    },
    {
      title: 'Overdue Payments',
      value: 'SRD 0',
      change: '0',
      icon: AlertTriangle,
      color: 'warning'
    },
    {
      title: 'Active Groups',
      value: '0',
      change: '0',
      icon: Users,
      color: 'success'
    },
    {
      title: 'Active Members',
      value: '0/0',
      change: '0',
      icon: UserPlus,
      color: 'primary'
    }
  ])

  const [loading, setLoading] = useState(true)
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [recentMembers, setRecentMembers] = useState<any[]>([])
  const [recentGroups, setRecentGroups] = useState<any[]>([])
  const [dashboardGroups, setDashboardGroups] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Use the optimized dashboard service
      const dashboardData: DashboardData = await dashboardService.getDashboardData()

      // Update stats with optimized data
      const newStats = [
        {
          title: 'Total Amount Expected',
          value: `SRD ${dashboardData.stats.totalExpected.toLocaleString()}`,
          change: dashboardData.stats.totalExpected > 0 ? '+100%' : '0%',
          icon: Calendar,
          color: 'info'
        },
        {
          title: 'Total Amount Paid',
          value: `SRD ${dashboardData.stats.totalPaid.toLocaleString()}`,
          change: dashboardData.stats.totalPaid > 0 ? `+${Math.round((dashboardData.stats.totalPaid / dashboardData.stats.totalExpected) * 100)}%` : '0%',
          icon: DollarSign,
          color: 'success'
        },
        {
          title: 'Total Amount Received',
          value: `SRD ${dashboardData.stats.totalReceived.toLocaleString()}`,
          change: dashboardData.stats.totalReceived > 0 ? `+100%` : '0%',
          icon: TrendingUp,
          color: 'primary'
        },
        {
          title: 'Pending Payments',
          value: `SRD ${dashboardData.stats.totalPending.toLocaleString()}`,
          change: dashboardData.stats.totalPending > 0 ? `+${dashboardData.stats.totalPending}` : '0',
          icon: CreditCard,
          color: 'info'
        },
        {
          title: 'Overdue Payments',
          value: `SRD ${dashboardData.stats.totalOverdue.toLocaleString()}`,
          change: dashboardData.stats.totalOverdue > 0 ? `+${dashboardData.stats.totalOverdue}` : '0',
          icon: AlertTriangle,
          color: 'warning'
        },
        {
          title: 'Active Groups',
          value: dashboardData.stats.activeGroups.toString(),
          change: dashboardData.stats.activeGroups > 0 ? `+${dashboardData.stats.activeGroups}` : '0',
          icon: Users,
          color: 'success'
        },
        {
          title: 'Active Members',
          value: `${dashboardData.stats.activeMembers}/${dashboardData.stats.totalMembers}`,
          change: dashboardData.stats.activeMembers > 0 ? `+${dashboardData.stats.activeMembers}` : '0',
          icon: UserPlus,
          color: 'primary'
        }
      ]

      setStats(newStats)
      setRecentPayments(dashboardData.recentPayments)
      setRecentMembers(dashboardData.recentMembers)
      setRecentGroups(dashboardData.recentGroups)
      
      // Sort dashboard groups by name in ascending order
      const sortedGroups = [...dashboardData.groups].sort((a, b) => 
        a.name.localeCompare(b.name)
      )
      setDashboardGroups(sortedGroups)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

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
    return date.toLocaleDateString()
  }

  // Navigation handlers
  const handleAddPayment = () => {
    navigate('/payments')
  }

  const handleCreateGroup = () => {
    navigate('/groups')
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <div className="header-text">
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">Overview of your group savings activities</p>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={loadDashboardData}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="container">
                 {/* Stats Grid */}
         <div className="grid grid-3">
           {loading ? (
             // Loading skeleton - keeping exact same structure
             Array.from({ length: 7 }).map((_, index) => {
               const IconComponent = [Calendar, DollarSign, TrendingUp, CreditCard, AlertTriangle, Users, UserPlus][index]
               return (
                 <div key={index} className={`stat-card stat-${['info', 'success', 'primary', 'info', 'warning', 'success', 'primary'][index]}`}>
                   <div className="stat-header">
                     <div className="stat-icon-status">
                       <div className="stat-icon">
                         <IconComponent size={10} />
                       </div>
                       <div className="stat-change">
                         <span className={`change-${['success', 'primary', 'info', 'warning', 'success', 'primary', 'info'][index]}`}>...</span>
                       </div>
                     </div>
                   </div>
                   <div className="stat-content">
                     <h3 className="stat-title">Loading...</h3>
                     <div className="stat-value">SRD 0</div>
                   </div>
                 </div>
               )
             })
           ) : (
            stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={index} className={`stat-card stat-${stat.color}`}>
                  <div className="stat-header">
                    <div className="stat-icon-status">
                      <div className="stat-icon">
                        <Icon size={24} />
                      </div>
                      <div className="stat-change">
                        <span className={`change-${stat.color}`}>{stat.change}</span>
                      </div>
                    </div>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-title">{stat.title}</h3>
                    <div className="stat-value">{stat.value}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="grid grid-2">
            <div className="action-card">
              <h3>Add New Payment</h3>
              <p>Record a new payment from a group member</p>
              <button className="btn" onClick={handleAddPayment}>
                <Plus size={16} />
                Add Payment
              </button>
            </div>
            <div className="action-card">
              <h3>Create New Group</h3>
              <p>Start a new savings group</p>
              <button className="btn" onClick={handleCreateGroup}>
                <Users size={16} />
                Create Group
              </button>
            </div>
          </div>
        </div>

                 {/* Recent Activity */}
         <div className="recent-activity">
           <h2 className="section-title">Recent Activity</h2>
           <div className="activity-list">
             {loading ? (
               // Loading skeleton
               Array.from({ length: 3 }).map((_, index) => (
                 <div key={index} className="activity-item">
                   <div className="activity-icon info">
                     <DollarSign size={16} />
                   </div>
                   <div className="activity-content">
                     <div className="activity-title">Loading...</div>
                     <div className="activity-details">Loading...</div>
                   </div>
                 </div>
               ))
             ) : (
               <>
                 {/* Recent Payments */}
                 {recentPayments.slice(0, 2).map((payment) => (
                   <div key={payment.id} className="activity-item">
                     <div className="activity-icon success">
                       <DollarSign size={16} />
                     </div>
                     <div className="activity-content">
                       <div className="activity-title">
                         Payment {payment.status} from {payment.member?.firstName} {payment.member?.lastName}
                       </div>
                       <div className="activity-details">
                         SRD {payment.amount.toLocaleString()} • {payment.group?.name} • {formatRelativeTime(payment.createdAt)}
                       </div>
                     </div>
                   </div>
                 ))}

                 {/* Recent Members */}
                 {recentMembers.slice(0, 1).map((member) => (
                   <div key={member.id} className="activity-item">
                     <div className="activity-icon info">
                       <UserPlus size={16} />
                     </div>
                     <div className="activity-content">
                       <div className="activity-content">
                         <div className="activity-title">
                           New member registered: {member.firstName} {member.lastName}
                         </div>
                         <div className="activity-details">
                           {formatRelativeTime(member.created_at)}
                         </div>
                       </div>
                     </div>
                   </div>
                 ))}

                 {/* Recent Groups */}
                 {recentGroups.slice(0, 1).map((group) => (
                   <div key={group.id} className="activity-item">
                     <div className="activity-icon info">
                       <Users size={16} />
                     </div>
                     <div className="activity-content">
                       <div className="activity-title">
                         New group created: {group.name}
                       </div>
                       <div className="activity-details">
                         Monthly: SRD {group.monthlyAmount.toLocaleString()} • {formatRelativeTime(group.createdAt)}
                       </div>
                     </div>
                   </div>
                 ))}

                 {/* Show message if no recent activity */}
                 {recentPayments.length === 0 && recentMembers.length === 0 && recentGroups.length === 0 && (
                   <div className="activity-item">
                     <div className="activity-icon info">
                       <Calendar size={16} />
                     </div>
                     <div className="activity-content">
                       <div className="activity-title">No recent activity</div>
                       <div className="activity-details">Start by adding payments, members, or groups</div>
                     </div>
                   </div>
                 )}
               </>
             )}
           </div>
         </div>

         {/* Groups Overview */}
         <div className="groups-overview">
           <h2 className="section-title">Groups Overview</h2>
           <div className="dashboard-groups-grid">
             {loading ? (
               // Loading skeleton
               Array.from({ length: 3 }).map((_, index) => (
                 <div key={index} className="dashboard-group-card">
                   <div className="group-header">
                     <h3 className="group-name">Loading...</h3>
                   </div>
                   <div className="group-stats">
                     <div className="stat-row">
                       <div className="stat-item">
                         <DollarSign size={16} />
                         <span>SRD 0/month</span>
                       </div>
                     </div>
                     <div className="stat-row">
                       <div className="stat-item">
                         <CheckCircle size={16} />
                         <span>Slots: 0 / 0</span>
                       </div>
                     </div>
                   </div>
                   <div className="payment-progress">
                     <div className="progress-header">
                       <span className="progress-label">Payment Progress</span>
                       <span className="progress-percentage">0%</span>
                     </div>
                     <div className="progress-bar">
                       <div className="progress-fill" style={{ width: '0%' }}></div>
                     </div>
                   </div>
                   <div className="group-period">
                     <div className="period-info">
                       <span>Period:</span>
                       <span>Loading...</span>
                     </div>
                   </div>
                   <div className="next-recipient">
                     <span>Next Recipient:</span>
                     <span>Loading...</span>
                   </div>
                 </div>
               ))
             ) : (
               dashboardGroups.map((group) => (
                 <div key={group.id} className="dashboard-group-card">
                   <div className="group-header">
                     <h3 className="group-name">{group.name}</h3>
                   </div>
                   <div className="group-stats">
                     <div className="stat-row">
                       <div className="stat-item">
                         <DollarSign size={16} />
                         <span>SRD {group.monthlyAmount.toLocaleString()}/month</span>
                       </div>
                     </div>
                     <div className="stat-row">
                       <div className="stat-item">
                         <CheckCircle size={16} />
                         <span>Slots: {Math.min(group.slotsPaid, group.slotsTotal)} / {group.slotsTotal}</span>
                       </div>
                     </div>
                   </div>
                   <div className="payment-progress">
                     <div className="progress-header">
                       <span className="progress-label">Payment Progress</span>
                       <span className="progress-percentage">
                         {group.slotsTotal > 0 
                           ? Math.min(100, Math.round((group.slotsPaid / group.slotsTotal) * 100))
                           : 0
                         }%
                       </span>
                     </div>
                     <div className="progress-bar">
                       <div 
                         className="progress-fill"
                         style={{
                           width: `${group.slotsTotal > 0 
                             ? Math.min(100, (group.slotsPaid / group.slotsTotal) * 100)
                             : 0
                           }%`
                         }}
                       ></div>
                     </div>
                   </div>
                   <div className="group-period">
                     <div className="period-info">
                       <span>Period:</span>
                       <span>
                         {group.startDate && group.endDate ? 
                           `${formatMonthYear(group.startDate)} - ${formatMonthYear(group.endDate)}`
                           : 'N/A'
                         }
                       </span>
                     </div>
                   </div>
                   <div className="next-recipient">
                     <span>Next Recipient:</span>
                     <span>{group.nextRecipient}</span>
                   </div>
                 </div>
               ))
             )}
           </div>
         </div>
      </div>
    </div>
  )
}

export default Dashboard
