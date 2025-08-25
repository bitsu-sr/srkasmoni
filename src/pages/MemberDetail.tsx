import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, User, Phone, Mail, MapPin, Calendar, CreditCard, Hash, DollarSign, FileText, Users, Clock, X, Save } from 'lucide-react'

import { memberService } from '../services/memberService'
import { getMemberWithStatus, MemberWithStatus, getMemberStatusText, getMemberStatusBadgeClass } from '../services/memberStatusService'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import MemberPaymentHistory from '../components/MemberPaymentHistory'
import './MemberDetail.css'

interface MemberSlot {
  id: number
  groupId: number
  groupName: string
  groupDescription: string | null
  monthlyAmount: number
  assignedMonthDate: string
  assignedMonthFormatted: string
  isFuture: boolean
}

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [member, setMember] = useState<MemberWithStatus | null>(null)
  const [memberSlots, setMemberSlots] = useState<MemberSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    birthplace: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    nationalId: '',
    nationality: '',
    occupation: '',
    bankName: '',
    accountNumber: '',
    dateOfRegistration: '',
    totalReceived: 0,
    lastPayment: '',
    nextPayment: '',
    notes: ''
  })

  useEffect(() => {
    if (id) {
      loadMember(parseInt(id))
    }
  }, [id])

  const loadMember = async (memberId: number) => {
    try {
      setLoading(true)
      const [memberWithStatus, slotsData] = await Promise.all([
        getMemberWithStatus(memberId),
        memberService.getMemberSlotsDetails(memberId)
      ])
      
      if (memberWithStatus) {
        setMember(memberWithStatus)
        setMemberSlots(slotsData)
        // Initialize edit form with current member data
        setEditForm({
          firstName: memberWithStatus.firstName,
          lastName: memberWithStatus.lastName,
          birthDate: memberWithStatus.birthDate,
          birthplace: memberWithStatus.birthplace,
          address: memberWithStatus.address,
          city: memberWithStatus.city,
          phone: memberWithStatus.phone,
          email: memberWithStatus.email,
          nationalId: memberWithStatus.nationalId,
          nationality: memberWithStatus.nationality,
          occupation: memberWithStatus.occupation,
          bankName: memberWithStatus.bankName,
          accountNumber: memberWithStatus.accountNumber,
          dateOfRegistration: memberWithStatus.dateOfRegistration,
          totalReceived: memberWithStatus.totalReceived,
          lastPayment: memberWithStatus.lastPayment,
          nextPayment: memberWithStatus.nextPayment,
          notes: memberWithStatus.notes || ''
        })
      } else {
        setError('Member not found')
      }
    } catch (err) {
      setError('Failed to load member details')
      console.error('Error loading member:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMember = async () => {
    if (!member) return
    
    try {
      await memberService.deleteMember(member.id)
      navigate('/members')
    } catch (err) {
      setError('Failed to delete member')
      console.error('Error deleting member:', err)
    }
  }

  const handleEditMember = () => {
    setIsEditing(true)
    setError('')
    setSuccess('')
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setError('')
    setSuccess('')
    // Reset form to original values
    if (member) {
      setEditForm({
        firstName: member.firstName,
        lastName: member.lastName,
        birthDate: member.birthDate,
        birthplace: member.birthplace,
        address: member.address,
        city: member.city,
        phone: member.phone,
        email: member.email,
        nationalId: member.nationalId,
        nationality: member.nationality,
        occupation: member.occupation,
        bankName: member.bankName,
        accountNumber: member.accountNumber,
        dateOfRegistration: member.dateOfRegistration,
        totalReceived: member.totalReceived,
        lastPayment: member.lastPayment,
        nextPayment: member.nextPayment,
        notes: member.notes || ''
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!member) return
    
    try {
      const updatedMember = await memberService.updateMember(member.id, editForm)
      setMember({ ...member, ...updatedMember })
      setIsEditing(false)
      setSuccess('Member details updated successfully!')
      setError('')
      // Reload member data to get updated status info
      await loadMember(member.id)
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to save member changes')
      setSuccess('')
      console.error('Error saving member:', err)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="member-detail">
        <div className="container">
          <div className="loading">Loading member details...</div>
        </div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="member-detail">
        <div className="container">
          <div className="error-state">
            <h3>Error</h3>
            <p>{error || 'Member not found'}</p>
            <button className="btn btn-primary" onClick={() => navigate('/members')}>
              Back to Members
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="member-detail">
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <button className="back-btn" onClick={() => navigate('/members')}>
              <ArrowLeft size={20} />
              Back to Members
            </button>
            <div className="header-actions">
              {!isEditing ? (
                <>
                  <button className="btn btn-secondary" onClick={handleEditMember}>
                    <Edit size={16} />
                    Edit Member
                  </button>
                  <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                    <Trash2 size={16} />
                    Delete Member
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={handleCancelEdit}>
                    <X size={16} />
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveEdit}>
                    <Save size={16} />
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Success and Error Messages */}
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="member-overview">
          <div className="member-card-large">
            <div className="member-header-large">
              <div className="member-avatar">
                <User size={48} />
              </div>
              <div className="member-info-large">
                <h1 className="member-name-large">{member.firstName} {member.lastName}</h1>
                <div className="member-status">
                  <span className={`status-badge ${getMemberStatusBadgeClass(member.statusInfo)}`}>
                    {getMemberStatusText(member.statusInfo)}
                  </span>
                  <span className="member-id">ID: {member.nationalId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="member-details-grid">
          {/* Member Status Overview */}
          <div className="detail-section">
            <h2 className="section-title">
              <Users size={20} />
              Member Status Overview
            </h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`detail-value status-${getMemberStatusBadgeClass(member.statusInfo)}`}>
                  {getMemberStatusText(member.statusInfo)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Slots</span>
                <span className="detail-value">{member.statusInfo.totalSlots}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Active Slots</span>
                <span className="detail-value">{member.statusInfo.activeSlots}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Monthly Amount</span>
                <span className="detail-value amount">
                  SRD {member.statusInfo.totalMonthlyAmount.toLocaleString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Next Receive Month</span>
                <span className="detail-value">
                  <Calendar size={16} />
                  {member.statusInfo.nextReceiveMonth ? 
                    new Date(member.statusInfo.nextReceiveMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 
                    'No upcoming slots'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="detail-section">
            <h2 className="section-title">
              <User size={20} />
              Personal Information
            </h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">First Name</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">{member.firstName}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Name</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">{member.lastName}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Date of Birth</span>
                {isEditing ? (
                  <input
                    type="date"
                    className="edit-input"
                    value={editForm.birthDate}
                    onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <Calendar size={16} />
                    {new Date(member.birthDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Birthplace</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.birthplace}
                    onChange={(e) => handleInputChange('birthplace', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <MapPin size={16} />
                    {member.birthplace}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Nationality</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.nationality}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">{member.nationality}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Occupation</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.occupation}
                    onChange={(e) => handleInputChange('occupation', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">{member.occupation}</span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="detail-section">
            <h2 className="section-title">
              <Phone size={20} />
              Contact Information
            </h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                {isEditing ? (
                  <input
                    type="tel"
                    className="edit-input"
                    value={editForm.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <Phone size={16} />
                    {member.phone}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Email</span>
                {isEditing ? (
                  <input
                    type="email"
                    className="edit-input"
                    value={editForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <Mail size={16} />
                    {member.email}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Address</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <MapPin size={16} />
                    {member.address}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">City</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <MapPin size={16} />
                    {member.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="detail-section">
            <h2 className="section-title">
              <DollarSign size={20} />
              Financial Information
            </h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Bank Name</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <CreditCard size={16} />
                    {member.bankName}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Account Number</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <Hash size={16} />
                    {member.accountNumber}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Received</span>
                {isEditing ? (
                  <input
                    type="number"
                    className="edit-input"
                    value={editForm.totalReceived}
                    onChange={(e) => handleInputChange('totalReceived', parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <span className="detail-value amount">
                    <DollarSign size={16} />
                    SRD {member.totalReceived.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Payment</span>
                {isEditing ? (
                  <input
                    type="date"
                    className="edit-input"
                    value={editForm.lastPayment}
                    onChange={(e) => handleInputChange('lastPayment', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <Calendar size={16} />
                    {new Date(member.lastPayment).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Next Payment</span>
                {isEditing ? (
                  <input
                    type="date"
                    className="edit-input"
                    value={editForm.nextPayment}
                    onChange={(e) => handleInputChange('nextPayment', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <Calendar size={16} />
                    {new Date(member.nextPayment).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Registration Information */}
          <div className="detail-section">
            <h2 className="section-title">
              <FileText size={20} />
              Registration Information
            </h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Date of Registration</span>
                {isEditing ? (
                  <input
                    type="date"
                    className="edit-input"
                    value={editForm.dateOfRegistration}
                    onChange={(e) => handleInputChange('dateOfRegistration', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <Calendar size={16} />
                    {new Date(member.dateOfRegistration).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">National ID</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="edit-input"
                    value={editForm.nationalId}
                    onChange={(e) => handleInputChange('nationalId', e.target.value)}
                  />
                ) : (
                  <span className="detail-value">
                    <Hash size={16} />
                    {member.nationalId}
                  </span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Created</span>
                <span className="detail-value">
                  <Calendar size={16} />
                  {new Date(member.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Updated</span>
                <span className="detail-value">
                  <Calendar size={16} />
                  {new Date(member.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Slot Details */}
          <div className="detail-section full-width">
            <h2 className="section-title">
              <Users size={20} />
              Slot Details
            </h2>
            <div className="slots-content">
              {memberSlots.length === 0 ? (
                <div className="no-slots">
                  <Clock size={48} />
                  <p>No slots assigned to this member yet.</p>
                </div>
              ) : (
                <div className="slots-table-container">
                  <table className="slots-table">
                    <thead>
                      <tr>
                        <th>Group</th>
                        <th>Month</th>
                        <th>Monthly Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberSlots.map((slot) => (
                        <tr key={slot.id} className={slot.isFuture ? 'future-slot' : 'past-slot'}>
                          <td>
                            <div className="group-info">
                              <div className="group-name">{slot.groupName}</div>
                              {slot.groupDescription && (
                                <div className="group-description">{slot.groupDescription}</div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="month-date">{slot.assignedMonthFormatted}</span>
                          </td>
                          <td>
                            <span className="monthly-amount">
                              SRD {slot.monthlyAmount.toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${slot.isFuture ? 'future' : 'completed'}`}>
                              {slot.isFuture ? 'Upcoming' : 'Completed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="slots-summary">
                        <td colSpan={2}>
                          <strong>Total Slots: {memberSlots.length}</strong>
                        </td>
                        <td colSpan={2}>
                          <strong>
                            Total Monthly Amount: SRD {memberSlots.reduce((sum, slot) => sum + slot.monthlyAmount, 0).toLocaleString()}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="detail-section full-width">
            <h2 className="section-title">
              <DollarSign size={20} />
              Payment History
            </h2>
            <div className="payment-history-content">
              <MemberPaymentHistory
                memberId={member.id}
                memberName={`${member.firstName} ${member.lastName}`}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="detail-section full-width">
            <h2 className="section-title">
              <FileText size={20} />
              Notes
            </h2>
            <div className="notes-content">
              {isEditing ? (
                <textarea
                  className="edit-textarea"
                  value={editForm.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter notes about this member..."
                  rows={4}
                />
              ) : (
                <p>{member.notes || 'No notes available'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteMember}
        itemName={`${member.firstName} ${member.lastName}`}
        itemType="Member"
      />
    </div>
  )
}

export default MemberDetail

