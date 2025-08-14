import { useState, useEffect } from 'react'
import { DollarSign, Users, CreditCard, AlertTriangle, TrendingUp, Calendar } from 'lucide-react'
import { paymentService } from '../services/paymentService'
import { groupService } from '../services/groupService'
import './Dashboard.css'

const Dashboard = () => {
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

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [paymentStats, groups] = await Promise.all([
        paymentService.getPaymentStats(),
        groupService.getAllGroups()
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
      const overdueAmount = paymentStats.notPaidAmount

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
          value: `SRD ${overdueAmount.toLocaleString()}`,
          change: overdueAmount > 0 ? `+${Math.ceil(overdueAmount / 1000)}` : '0',
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
              <button className="btn">Add Payment</button>
            </div>
            <div className="action-card">
              <h3>Create New Group</h3>
              <p>Start a new savings group</p>
              <button className="btn">Create Group</button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon success">
                <DollarSign size={16} />
              </div>
              <div className="activity-content">
                <div className="activity-title">Payment received from John Doe</div>
                <div className="activity-details">SRD 2,000 • Group A • 2 hours ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon warning">
                <AlertTriangle size={16} />
              </div>
              <div className="activity-content">
                <div className="activity-title">Late payment reminder sent</div>
                <div className="activity-details">Jane Smith • Group B • 1 day ago</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon info">
                <Users size={16} />
              </div>
              <div className="activity-content">
                <div className="activity-title">New member added to Group C</div>
                <div className="activity-details">Mike Johnson • 2 days ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
