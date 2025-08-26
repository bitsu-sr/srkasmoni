import { useState, useEffect } from 'react'
import { DollarSign, Users, CreditCard, Calendar, TrendingUp, Clock } from 'lucide-react'
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

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid'
      case 'pending':
        return 'Pending'
      case 'settled':
        return 'Settled'
      case 'not_paid':
        return 'Not Paid'
      default:
        return 'Unknown'
    }
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
        <div className="my-dashboard-stats-grid">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => {
              const IconComponent = [Calendar, DollarSign, TrendingUp, Users, CreditCard, Clock][index]
              return (
                <div key={index} className={`my-dashboard-stat-card my-dashboard-stat-${['info', 'success', 'primary', 'success', 'info', 'warning'][index]}`}>
                  <div className="my-dashboard-stat-header">
                    <div className="my-dashboard-stat-icon-status">
                      <div className="my-dashboard-stat-icon">
                        <IconComponent size={24} />
                      </div>
                      <div className="my-dashboard-stat-change">
                        <span className={`my-dashboard-change-${['info', 'success', 'primary', 'success', 'info', 'warning'][index]}`}>...</span>
                      </div>
                    </div>
                  </div>
                  <div className="my-dashboard-stat-content">
                    <h3 className="my-dashboard-stat-title">Loading...</h3>
                    <div className="my-dashboard-stat-value">SRD 0</div>
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
                <div key={index} className={`my-dashboard-stat-card my-dashboard-stat-${stat.color}`}>
                  <div className="my-dashboard-stat-header">
                    <div className="my-dashboard-stat-icon-status">
                      <div className="my-dashboard-stat-icon">
                        <Icon size={24} />
                      </div>
                      <div className="my-dashboard-stat-change">
                        <span className={`my-dashboard-change-${stat.color}`}>{stat.change}</span>
                      </div>
                    </div>
                  </div>
                  <div className="my-dashboard-stat-content">
                    <h3 className="my-dashboard-stat-title">{stat.title}</h3>
                    <div className="my-dashboard-stat-value">{stat.value}</div>
                  </div>
                </div>
              )
            })
          ) : null}
        </div>

        {/* User Slots Overview */}
        <div className="user-slots-overview">
          <h2 className="section-title">My Slots Overview</h2>
          {loading ? (
            // Loading skeleton
            <div className="user-slots-table-skeleton">
              <div className="table-header-skeleton">
                <div className="header-cell-skeleton">Group Name</div>
                <div className="header-cell-skeleton">Status</div>
                <div className="header-cell-skeleton">Monthly Amount</div>
                <div className="header-cell-skeleton">Assigned Month</div>
                <div className="header-cell-skeleton">Payment Status</div>
                <div className="header-cell-skeleton">Description</div>
              </div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="table-row-skeleton">
                  <div className="cell-skeleton">Loading...</div>
                  <div className="cell-skeleton">Loading...</div>
                  <div className="cell-skeleton">Loading...</div>
                  <div className="cell-skeleton">Loading...</div>
                  <div className="cell-skeleton">Loading...</div>
                  <div className="cell-skeleton">Loading...</div>
                </div>
              ))}
            </div>
          ) : dashboardData?.userSlots.length ? (
            <div className="user-slots-table-container">
              <table className="user-slots-table">
                  <thead>
                    <tr>
                      <th>Group Name</th>
                      <th>Monthly Amount</th>
                      <th>Payment Status</th>
                      <th>Assigned Month</th>
                      <th>Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.userSlots.map((slot) => (
                      <tr key={slot.id} className="slot-table-row">
                        <td className="slot-group-name-cell">
                          <span className="group-name-text">{slot.groupName}</span>
                        </td>
                        <td className="slot-amount-cell">
                          <span className="amount-display">SRD {slot.monthlyAmount}</span>
                        </td>
                        <td className="slot-payment-status-cell">
                          <span className={`payment-status-badge payment-status-${slot.paymentStatus}`}>
                            {getPaymentStatusText(slot.paymentStatus)}
                          </span>
                        </td>
                        <td className="slot-month-cell">
                          <span className="month-display">{slot.assignedMonthFormatted}</span>
                        </td>
                        <td className="slot-status-cell">
                          <span className={`slot-status-badge ${slot.isFuture ? 'future' : slot.isCurrentMonth ? 'current' : 'past'}`}>
                            {slot.isFuture ? 'Upcoming' : slot.isCurrentMonth ? 'Current' : 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
