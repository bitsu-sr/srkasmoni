import { Plus, Users, Calendar, DollarSign, MoreVertical } from 'lucide-react'
import './Groups.css'

const Groups = () => {
  // Mock data - will be replaced with real data later
  const groups = [
    {
      id: 1,
      name: 'Group A',
      members: 8,
      monthlyAmount: 2000,
      duration: 8,
      currentMonth: 3,
      totalCollected: 16000,
      nextRecipient: 'John Doe',
      status: 'active'
    },
    {
      id: 2,
      name: 'Group B',
      members: 6,
      monthlyAmount: 1500,
      duration: 6,
      currentMonth: 5,
      totalCollected: 9000,
      nextRecipient: 'Jane Smith',
      status: 'active'
    },
    {
      id: 3,
      name: 'Group C',
      members: 12,
      monthlyAmount: 3000,
      duration: 12,
      currentMonth: 1,
      totalCollected: 12000,
      nextRecipient: 'Mike Johnson',
      status: 'active'
    }
  ]

  return (
    <div className="groups">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">Manage your savings groups</p>
        </div>
      </div>

      <div className="container">
        {/* Header Actions */}
        <div className="page-actions">
          <button className="btn">
            <Plus size={20} />
            Create New Group
          </button>
        </div>

        {/* Groups Grid */}
        <div className="groups-grid">
          {groups.map((group) => (
            <div key={group.id} className="group-card">
              <div className="group-header">
                <div className="group-info">
                  <h3 className="group-name">{group.name}</h3>
                  <span className={`group-status status-${group.status}`}>
                    {group.status}
                  </span>
                </div>
                <button className="group-menu-btn">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="group-stats">
                <div className="stat-row">
                  <div className="stat-item">
                    <Users size={16} />
                    <span>{group.members} members</span>
                  </div>
                  <div className="stat-item">
                    <Calendar size={16} />
                    <span>Month {group.currentMonth}/{group.duration}</span>
                  </div>
                </div>
                <div className="stat-row">
                  <div className="stat-item">
                    <DollarSign size={16} />
                    <span>SRD {group.monthlyAmount.toLocaleString()}/month</span>
                  </div>
                </div>
              </div>

              <div className="group-progress">
                <div className="progress-info">
                  <span>Progress</span>
                  <span>{group.currentMonth}/{group.duration} months</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(group.currentMonth / group.duration) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="group-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Collected:</span>
                  <span className="summary-value">SRD {group.totalCollected.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Next Recipient:</span>
                  <span className="summary-value">{group.nextRecipient}</span>
                </div>
              </div>

              <div className="group-actions">
                <button className="btn btn-secondary">View Details</button>
                <button className="btn">Manage Group</button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {groups.length === 0 && (
          <div className="empty-state">
            <Users size={64} className="empty-icon" />
            <h3>No Groups Yet</h3>
            <p>Create your first savings group to get started</p>
            <button className="btn">Create Group</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Groups
