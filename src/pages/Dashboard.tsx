import { useState, useEffect } from 'react'
import { DollarSign, Users, CreditCard, AlertTriangle, TrendingUp, Calendar, Plus, UserPlus, CheckCircle } from 'lucide-react'
import { paymentService } from '../services/paymentService'
import { groupService } from '../services/groupService'
import { memberService } from '../services/memberService'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState([
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
      title: 'Total Amount Expected',
      value: 'SRD 0',
      change: '0%',
      icon: Calendar,
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
      title: 'Pending Payments',
      value: 'SRD 0',
      change: '0',
      icon: CreditCard,
      color: 'info'
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
      
      // Fetch all data in parallel
      const [
        paymentStats, 
        groups, 
        overduePaymentsData, 
        recentPayments, 
        recentMembers, 
        recentGroups,
        dashboardGroupsData
      ] = await Promise.all([
        paymentService.getPaymentStats(),
        groupService.getAllGroups(),
        paymentService.getOverduePayments(),
        paymentService.getRecentPayments(5),
        memberService.getRecentMembers(3),
        groupService.getRecentGroups(3),
        groupService.getDashboardGroups()
      ])

      // Calculate total expected amount (all groups monthly amounts * duration)
      let totalExpected = 0
      groups.forEach(group => {
        if (group.startDate && group.endDate) {
          const duration = calculateDuration(group.startDate, group.endDate)
          totalExpected += (group.monthlyAmount * duration)
        }
      })

      // Calculate percentage changes (simplified - could be enhanced with historical data)
      const totalPaid = paymentStats.receivedAmount + paymentStats.settledAmount
      const totalPending = paymentStats.pendingAmount

      const newStats = [
        {
          title: 'Total Amount Paid',
          value: `SRD ${(totalPaid).toLocaleString()}`,
          change: totalPaid > 0 ? '+100%' : '0%',
          icon: DollarSign,
          color: 'success'
        },
        {
          title: 'Total Amount Received',
          value: `SRD ${paymentStats.receivedAmount.toLocaleString()}`,
          change: paymentStats.receivedAmount > 0 ? '+100%' : '0%',
          icon: TrendingUp,
          color: 'primary'
        },
        {
          title: 'Total Amount Expected',
          value: `SRD ${totalExpected.toLocaleString()}`,
          change: totalExpected > 0 ? '+100%' : '0%',
          icon: Calendar,
          color: 'info'
        },
        {
          title: 'Overdue Payments',
          value: `SRD ${overduePaymentsData.amount.toLocaleString()}`,
          change: overduePaymentsData.count > 0 ? `+${overduePaymentsData.count}` : '0',
          icon: AlertTriangle,
          color: 'warning'
        },
        {
          title: 'Active Groups',
          value: groups.length.toString(),
          change: groups.length > 0 ? `+${groups.length}` : '0',
          icon: Users,
          color: 'success'
        },
        {
          title: 'Pending Payments',
          value: `SRD ${totalPending.toLocaleString()}`,
          change: totalPending > 0 ? `+${Math.ceil(totalPending / 1000)}` : '0',
          icon: CreditCard,
          color: 'info'
        }
      ]

      setStats(newStats)
      setRecentPayments(recentPayments)
      setRecentMembers(recentMembers)
      setRecentGroups(recentGroups)
      setDashboardGroups(dashboardGroupsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to calculate duration
  const calculateDuration = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0
    
    const [startYear, startMonth] = startDate.split('-').map(Number)
    const [endYear, endMonth] = endDate.split('-').map(Number)
    
    if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) {
      return 0
    }
    
    return (endYear - startYear) * 12 + (endMonth - startMonth) + 1
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
            <div>
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
            Array.from({ length: 6 }).map((_, index) => {
              const IconComponent = [DollarSign, TrendingUp, Calendar, AlertTriangle, Users, CreditCard][index]
              return (
                <div key={index} className={`stat-card stat-${['success', 'primary', 'info', 'warning', 'success', 'info'][index]}`}>
                  <div className="stat-header">
                    <div className="stat-icon">
                      <IconComponent size={24} />
                    </div>
                    <div className="stat-change">
                      <span className={`change-${['success', 'primary', 'info', 'warning', 'success', 'info'][index]}`}>...</span>
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
                    <div className="stat-icon">
                      <Icon size={24} />
                    </div>
                    <div className="stat-change">
                      <span className={`change-${stat.color}`}>{stat.change}</span>
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
                         <span>Slots: {group.slotsPaid} / {group.slotsTotal}</span>
                       </div>
                     </div>
                   </div>
                   <div className="payment-progress">
                     <div className="progress-header">
                       <span className="progress-label">Payment Progress</span>
                       <span className="progress-percentage">
                         {group.slotsTotal > 0 
                           ? Math.round((group.slotsPaid / group.slotsTotal) * 100)
                           : 0
                         }%
                       </span>
                     </div>
                     <div className="progress-bar">
                       <div 
                         className="progress-fill"
                         style={{
                           width: `${group.slotsTotal > 0 
                             ? (group.slotsPaid / group.slotsTotal) * 100
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
                           `${calculateDuration(group.startDate, group.endDate)} month${calculateDuration(group.startDate, group.endDate) !== 1 ? 's' : ''}`
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
