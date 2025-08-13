import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, User, MoreVertical, Eye } from 'lucide-react'
import { Member, MemberFormData, MemberFilters } from '../types/member'
import { memberService } from '../services/memberService'
import MemberModal from '../components/MemberModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import './Members.css'

const Members = () => {
  const navigate = useNavigate()
  const [members, setMembers] = useState<Member[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingMember, setDeletingMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [filters, setFilters] = useState<MemberFilters>({
    search: '',
    location: ''
  })

  // Load members on component mount
  useEffect(() => {
    const loadMembers = async () => {
      try {
        setIsLoadingMembers(true)
        const data = await memberService.getAllMembers()
        setMembers(data)
      } catch (error) {
        console.error('Failed to load members:', error)
        // Fallback to empty array if Supabase is not configured
        setMembers([])
      } finally {
        setIsLoadingMembers(false)
      }
    }

    loadMembers()
  }, [])

  // Filter members based on search and filters
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = 
        member.firstName.toLowerCase().includes(filters.search.toLowerCase()) ||
        member.lastName.toLowerCase().includes(filters.search.toLowerCase()) ||
        member.nationalId.includes(filters.search) ||
        member.phone.includes(filters.search) ||
        member.bankName.toLowerCase().includes(filters.search.toLowerCase()) ||
        member.accountNumber.includes(filters.search)

      const matchesCity = !filters.location || member.city === filters.location

      return matchesSearch && matchesCity
    })
  }, [members, filters])

  const handleSaveMember = async (memberData: MemberFormData) => {
    try {
      setIsLoading(true)
      if (editingMember) {
        const updatedMember = await memberService.updateMember(editingMember.id, memberData)
        setMembers(prev => prev.map(m => m.id === editingMember.id ? updatedMember : m))
      } else {
        const newMember = await memberService.createMember(memberData)
        setMembers(prev => [...prev, newMember])
      }
      setIsModalOpen(false)
      setEditingMember(null)
    } catch (error) {
      console.error('Error saving member:', error)
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false)
    }
  }



  const handleDeleteMember = (member: Member) => {
    setDeletingMember(member)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingMember) return

    try {
      setIsLoading(true)
      await memberService.deleteMember(deletingMember.id)
      setMembers(prev => prev.filter(m => m.id !== deletingMember.id))
      setIsDeleteModalOpen(false)
      setDeletingMember(null)
    } catch (error) {
      console.error('Error deleting member:', error)
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingMember(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingMember(null)
  }

  const handleViewDetails = (memberId: number) => {
    navigate(`/members/${memberId}`)
  }

  // Get unique values for filter dropdowns
  const uniqueCities = [...new Set(members.map(m => m.city))]

  if (isLoadingMembers) {
    return (
      <div className="members">
        <div className="container">
          <div className="loading">Loading members...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="members">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">Manage your organization's members</p>
        </div>
      </div>

      <div className="container">
        {/* Header Actions */}
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={20} />
            Add Member
          </button>
        </div>

        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="Search members by name, national ID, phone, bank, or account number..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="filters-row">
            <select
              className="filter-select"
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            >
              <option value="">All Cities</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="member-count">
          {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
        </div>

        {/* Members Grid */}
        <div className="members-grid">
          {filteredMembers.map((member) => (
            <div key={member.id} className="member-card">
              <div className="member-header">
                <div className="member-info">
                  <h3 className="member-name">{member.firstName} {member.lastName}</h3>
                  <div className="status-tags">
                    <span className="status-tag active">ACTIVE</span>
                    <span className="status-tag pending">Pending</span>
                  </div>
                </div>
                <div className="member-menu">
                  <button className="menu-btn">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>

              <div className="member-details">
                <div className="detail-item">
                  <span className="detail-label">Slots 5</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">National ID: {member.nationalId}</span>
                </div>
              </div>

              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">Progress</span>
                  <span className="progress-text">2/5 Slots Paid</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '40%' }}></div>
                </div>
              </div>

              <div className="financial-box">
                <div className="financial-row">
                  <span className="financial-label">Total Monthly Amount:</span>
                  <span className="financial-value">SRD {member.totalReceived.toLocaleString()}</span>
                </div>
                <div className="financial-row">
                  <span className="financial-label">Next Receive Month:</span>
                  <span className="financial-value">{new Date(member.nextPayment).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="member-actions">
                <button className="btn btn-secondary view-btn" onClick={() => handleViewDetails(member.id)}>
                  <Eye size={16} />
                  View Details
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteMember(member)}
                >
                  <Trash2 size={16} />
                  Delete Member
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredMembers.length === 0 && (
          <div className="empty-state">
            <User size={64} className="empty-icon" />
            <h3>No Members Found</h3>
            <p>No members match your current search criteria</p>
          </div>
        )}
      </div>

      <MemberModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveMember}
        member={editingMember}
        isEditing={!!editingMember}
        isLoading={isLoading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={`${deletingMember?.firstName} ${deletingMember?.lastName}`}
        itemType="Member"
        isLoading={isLoading}
      />
    </div>
  )
}

export default Members

