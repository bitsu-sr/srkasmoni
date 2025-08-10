import { DollarSign, Users, CreditCard, AlertTriangle, TrendingUp, Calendar } from 'lucide-react'
import './Dashboard.css'

const Dashboard = () => {
  // Mock data - will be replaced with real data later
  const stats = [
    {
      title: 'Total Amount Paid',
      value: 'SRD 24,000',
      change: '+12%',
      icon: DollarSign,
      color: 'success'
    },
    {
      title: 'Total Amount Received',
      value: 'SRD 12,000',
      change: '+8%',
      icon: TrendingUp,
      color: 'primary'
    },
    {
      title: 'Total Amount Expected',
      value: 'SRD 36,000',
      change: '+15%',
      icon: Calendar,
      color: 'info'
    },
    {
      title: 'Overdue Payments',
      value: 'SRD 2,100',
      change: '+3',
      icon: AlertTriangle,
      color: 'warning'
    },
    {
      title: 'Active Groups',
      value: '3',
      change: '+1',
      icon: Users,
      color: 'success'
    },
    {
      title: 'Pending Payments',
      value: 'SRD 8,000',
      change: '-2',
      icon: CreditCard,
      color: 'info'
    }
  ]

  return (
    <div className="dashboard">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your group savings activities</p>
        </div>
      </div>

      <div className="container">
        {/* Stats Grid */}
        <div className="grid grid-3">
          {stats.map((stat, index) => {
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
          })}
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
