import { useState, useEffect } from 'react'
import { DollarSign, Users, CreditCard, Calendar, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { userDashboardService, UserDashboardData } from '../services/userDashboardService'
import { useAuth } from '../contexts/AuthContext'

import { formatDate } from '../utils/dateUtils'
import './MyDashboard.css'

const MyDashboard = () => {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await userDashboardService.getUserDashboardData()
      setDashboardData(data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Set empty data on error
      setDashboardData({
        stats: {
          totalSlots: 0,
          totalMonthlyAmount: 0,
          nextReceiveMonth: null,
          totalReceived: 0,
          totalExpected: 0,
          activeGroups: 0
        },
        userSlots: [],
        recentPayments: []
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (slot: any) => {
    if (slot.isCurrentMonth) return <Clock size={16} />
    if (slot.isFuture) return <Calendar size={16} />
    return <CheckCircle size={16} />
  }

  const getStatusColor = (slot: any) => {
    if (slot.isCurrentMonth) return 'warning'
    if (slot.isFuture) return 'info'
    return 'success'
  }

  const getStatusText = (slot: any) => {
    if (slot.isCurrentMonth) return 'Current Month'
    if (slot.isFuture) return 'Upcoming'
    return 'Completed'
  }

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    return formatDate(dateString)
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="my-dashboard">
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <div className="header-text">
              <h1 className="page-title">My Dashboard</h1>
              <p className="page-subtitle">Welcome back, {user.first_name}! Here's your personal overview</p>
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
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => {
              const IconComponent = [Calendar, DollarSign, TrendingUp, Users, CreditCard, Clock][index]
              return (
                <div key={index} className={`stat-card stat-${['info', 'success', 'primary', 'success', 'info', 'warning'][index]}`}>
                  <div className="stat-header">
                    <div className="stat-icon-status">
                      <div className="stat-icon">
                        <IconComponent size={24} />
                      </div>
                      <div className="stat-change">
                        <span className={`change-${['info', 'success', 'primary', 'success', 'info', 'warning'][index]}`}>...</span>
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
          ) : dashboardData ? (
            [
              {
                title: 'Total Slots',
                value: dashboardData.stats.totalSlots.toString(),
                change: `${dashboardData.stats.activeGroups} groups`,
                icon: Calendar,
                color: 'info'
              },
              {
                title: 'Monthly Amount',
                value: `SRD ${dashboardData.stats.totalMonthlyAmount.toLocaleString()}`,
                change: 'per month',
                icon: DollarSign,
                color: 'success'
              },
              {
                title: 'Total Expected',
                value: `SRD ${dashboardData.stats.totalExpected.toLocaleString()}`,
                change: 'overall',
                icon: TrendingUp,
                color: 'primary'
              },
              {
                title: 'Active Groups',
                value: dashboardData.stats.activeGroups.toString(),
                change: 'participating',
                icon: Users,
                color: 'success'
              },
              {
                title: 'Total Received',
                value: `SRD ${dashboardData.stats.totalReceived.toLocaleString()}`,
                change: 'completed',
                icon: CreditCard,
                color: 'info'
              },
              {
                title: 'Next Receive',
                value: dashboardData.stats.nextReceiveMonth || 'N/A',
                change: 'upcoming',
                icon: Clock,
                color: 'warning'
              }
            ].map((stat, index) => {
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
          ) : null}
        </div>

        {/* User Slots Overview */}
        <div className="user-slots-overview">
          <h2 className="section-title">My Slots Overview</h2>
          <div className="user-slots-grid">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="user-slot-card">
                  <div className="slot-header">
                    <h3 className="slot-group-name">Loading...</h3>
                    <div className="slot-status info">Loading...</div>
                  </div>
                  <div className="slot-stats">
                    <div className="stat-row">
                      <div className="stat-item">
                        <DollarSign size={16} />
                        <span>SRD 0/month</span>
                      </div>
                    </div>
                    <div className="stat-row">
                      <div className="stat-item">
                        <Calendar size={16} />
                        <span>Month: Loading...</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : dashboardData?.userSlots.length ? (
              dashboardData.userSlots.map((slot) => (
                <div key={slot.id} className="user-slot-card">
                  <div className="slot-header">
                    <h3 className="slot-group-name">{slot.groupName}</h3>
                    <div className={`slot-status ${getStatusColor(slot)}`}>
                      {getStatusIcon(slot)}
                      {getStatusText(slot)}
                    </div>
                  </div>
                  <div className="slot-stats">
                    <div className="stat-row">
                      <div className="stat-item">
                        <DollarSign size={16} />
                        <span>SRD {slot.monthlyAmount.toLocaleString()}/month</span>
                      </div>
                    </div>
                    <div className="stat-row">
                      <div className="stat-item">
                        <Calendar size={16} />
                        <span>Month: {slot.assignedMonthFormatted}</span>
                      </div>
                    </div>
                  </div>
                  {slot.groupDescription && (
                    <div className="slot-description">
                      <p>{slot.groupDescription}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-slots-message">
                <div className="no-slots-icon">
                  <Calendar size={48} />
                </div>
                <h3>No Slots Found</h3>
                <p>You don't have any assigned slots yet. Contact your group administrator to get started.</p>
              </div>
            )}
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
            ) : dashboardData?.recentPayments.length ? (
              dashboardData.recentPayments.map((payment) => (
                <div key={payment.id} className="activity-item">
                  <div className={`activity-icon ${payment.status === 'completed' ? 'success' : 'info'}`}>
                    <DollarSign size={16} />
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">
                      Payment {payment.status} - SRD {payment.amount.toLocaleString()}
                    </div>
                    <div className="activity-details">
                      {payment.group?.name} • {formatRelativeTime(payment.created_at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="activity-item">
                <div className="activity-icon info">
                  <Calendar size={16} />
                </div>
                <div className="activity-content">
                  <div className="activity-title">No recent activity</div>
                  <div className="activity-details">Your payment history will appear here</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyDashboard
