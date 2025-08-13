import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, User, Phone, Mail, MapPin, Calendar, CreditCard, Hash, DollarSign, FileText } from 'lucide-react'
import { Member } from '../types/member'
import { memberService } from '../services/memberService'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import './MemberDetail.css'

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (id) {
      loadMember(parseInt(id))
    }
  }, [id])

  const loadMember = async (memberId: number) => {
    try {
      setLoading(true)
      const memberData = await memberService.getMemberById(memberId)
      setMember(memberData)
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
    navigate(`/members/edit/${member?.id}`)
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
              <button className="btn btn-secondary" onClick={handleEditMember}>
                <Edit size={16} />
                Edit Member
              </button>
              <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={16} />
                Delete Member
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="member-overview">
          <div className="member-card-large">
            <div className="member-header-large">
              <div className="member-avatar">
                <User size={48} />
              </div>
              <div className="member-info-large">
                <h1 className="member-name-large">{member.firstName} {member.lastName}</h1>
                <div className="member-status">
                  <span className="status-badge active">ACTIVE MEMBER</span>
                  <span className="member-id">ID: {member.nationalId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="member-details-grid">
          {/* Personal Information */}
          <div className="detail-section">
            <h2 className="section-title">
              <User size={20} />
              Personal Information
            </h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Full Name</span>
                <span className="detail-value">{member.firstName} {member.lastName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Date of Birth</span>
                <span className="detail-value">
                  <Calendar size={16} />
                  {new Date(member.birthDate).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Birthplace</span>
                <span className="detail-value">
                  <MapPin size={16} />
                  {member.birthplace}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Nationality</span>
                <span className="detail-value">{member.nationality}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Occupation</span>
                <span className="detail-value">{member.occupation}</span>
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
                <span className="detail-value">
                  <Phone size={16} />
                  {member.phone}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-value">
                  <Mail size={16} />
                  {member.email}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Address</span>
                <span className="detail-value">
                  <MapPin size={16} />
                  {member.address}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">City</span>
                <span className="detail-value">
                  <MapPin size={16} />
                  {member.city}
                </span>
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
                <span className="detail-value">
                  <CreditCard size={16} />
                  {member.bankName}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Account Number</span>
                <span className="detail-value">
                  <Hash size={16} />
                  {member.accountNumber}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Received</span>
                <span className="detail-value amount">
                  <DollarSign size={16} />
                  SRD {member.totalReceived.toLocaleString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Payment</span>
                <span className="detail-value">
                  <Calendar size={16} />
                  {new Date(member.lastPayment).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Next Payment</span>
                <span className="detail-value">
                  <Calendar size={16} />
                  {new Date(member.nextPayment).toLocaleDateString()}
                </span>
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
                <span className="detail-value">
                  <Calendar size={16} />
                  {new Date(member.dateOfRegistration).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">National ID</span>
                <span className="detail-value">
                  <Hash size={16} />
                  {member.nationalId}
                </span>
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

          {/* Notes */}
          {member.notes && (
            <div className="detail-section full-width">
              <h2 className="section-title">
                <FileText size={20} />
                Notes
              </h2>
              <div className="notes-content">
                <p>{member.notes}</p>
              </div>
            </div>
          )}
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

