import { Plus, User, Phone, Mail, MapPin, MoreVertical, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import './Members.css'

const Members = () => {
  // Mock data - will be replaced with real data later
  const members = [
    {
      id: 1,
      name: 'John Doe',
      phone: '+597 123-4567',
      email: 'john.doe@email.com',
      location: 'Paramaribo',
      groups: ['Group A', 'Group B'],
      totalPaid: 8000,
      totalReceived: 12000,
      status: 'active',
      lastPayment: '2024-01-15',
      nextPayment: '2024-02-15'
    },
    {
      id: 2,
      name: 'Jane Smith',
      phone: '+597 234-5678',
      email: 'jane.smith@email.com',
      location: 'Nieuw Nickerie',
      groups: ['Group B'],
      totalPaid: 6000,
      totalReceived: 9000,
      status: 'active',
      lastPayment: '2024-01-20',
      nextPayment: '2024-02-20'
    },
    {
      id: 3,
      name: 'Mike Johnson',
      phone: '+597 345-6789',
      email: 'mike.johnson@email.com',
      location: 'Lelydorp',
      groups: ['Group C'],
      totalPaid: 3000,
      totalReceived: 0,
      status: 'pending',
      lastPayment: '2024-01-10',
      nextPayment: '2024-02-10'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} className="status-icon active" />
      case 'pending':
        return <Clock size={16} className="status-icon pending" />
      case 'overdue':
        return <AlertTriangle size={16} className="status-icon overdue" />
      default:
        return <Clock size={16} className="status-icon pending" />
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active'
      case 'pending':
        return 'status-pending'
      case 'overdue':
        return 'status-overdue'
      default:
        return 'status-pending'
    }
  }

  return (
    <div className="members">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">Manage your group members</p>
        </div>
      </div>

      <div className="container">
        {/* Header Actions */}
        <div className="page-actions">
          <button className="btn">
            <Plus size={20} />
            Add New Member
          </button>
        </div>

        {/* Members List */}
        <div className="members-list">
          {members.map((member) => (
            <div key={member.id} className="member-card">
              <div className="member-header">
                <div className="member-avatar">
                  <User size={24} />
                </div>
                <div className="member-info">
                  <h3 className="member-name">{member.name}</h3>
                  <div className="member-meta">
                    <span className="member-location">
                      <MapPin size={14} />
                      {member.location}
                    </span>
                    <span className={`member-status ${getStatusClass(member.status)}`}>
                      {getStatusIcon(member.status)}
                      {member.status}
                    </span>
                  </div>
                </div>
                <button className="member-menu-btn">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="member-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <Phone size={16} />
                    <span>{member.phone}</span>
                  </div>
                  <div className="detail-item">
                    <Mail size={16} />
                    <span>{member.email}</span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Groups:</span>
                    <span>{member.groups.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className="member-financials">
                <div className="financial-item">
                  <span className="financial-label">Total Paid:</span>
                  <span className="financial-value">SRD {member.totalPaid.toLocaleString()}</span>
                </div>
                <div className="financial-item">
                  <span className="financial-label">Total Received:</span>
                  <span className="financial-value">SRD {member.totalReceived.toLocaleString()}</span>
                </div>
              </div>

              <div className="member-payments">
                <div className="payment-info">
                  <div className="payment-item">
                    <span className="payment-label">Last Payment:</span>
                    <span className="payment-date">{member.lastPayment}</span>
                  </div>
                  <div className="payment-item">
                    <span className="payment-label">Next Payment:</span>
                    <span className="payment-date">{member.nextPayment}</span>
                  </div>
                </div>
              </div>

              <div className="member-actions">
                <button className="btn btn-secondary">View Details</button>
                <button className="btn">Record Payment</button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {members.length === 0 && (
          <div className="empty-state">
            <User size={64} className="empty-icon" />
            <h3>No Members Yet</h3>
            <p>Add your first group member to get started</p>
            <button className="btn">Add Member</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Members
