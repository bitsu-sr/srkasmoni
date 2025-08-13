import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Users, 
  Calendar, 
  DollarSign, 
  Plus,
  UserX
} from 'lucide-react'
import type { Group, GroupMember, GroupMemberFormData } from '../types/member'
import { groupService } from '../services/groupService'
import MemberSelectionModal from '../components/MemberSelectionModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import GroupModal from '../components/GroupModal'
import { formatDateRange, calculateDuration } from '../utils/dateUtils'
import './GroupDetails.css'

const GroupDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal states
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (id) {
      loadGroupData(parseInt(id))
    }
  }, [id])

  const loadGroupData = async (groupId: number) => {
    try {
      setLoading(true)
      const [groupData, membersData] = await Promise.all([
        groupService.getGroupById(groupId),
        groupService.getGroupMembers(groupId)
      ])
      
      if (groupData) {
        setGroup(groupData)
        setMembers(membersData)
      } else {
        setError('Group not found')
      }
    } catch (err) {
      setError('Failed to load group data')
      console.error('Error loading group data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (memberData: GroupMemberFormData) => {
    try {
      if (!group) return
      
      await groupService.addMemberToGroup(group.id, memberData)
      // Reload members
      const updatedMembers = await groupService.getGroupMembers(group.id)
      setMembers(updatedMembers)
    } catch (err) {
      setError('Failed to add member to group')
      console.error('Error adding member:', err)
    }
  }

  const handleRemoveMember = async (memberId: number) => {
    try {
      if (!group) return
      
      await groupService.removeMemberFromGroup(group.id, memberId)
      // Reload members
      const updatedMembers = await groupService.getGroupMembers(group.id)
      setMembers(updatedMembers)
    } catch (err) {
      setError('Failed to remove member from group')
      console.error('Error removing member:', err)
    }
  }

  const handleEditGroup = async (groupData: any) => {
    try {
      if (!group) return
      
      const updatedGroup = await groupService.updateGroup(group.id, groupData)
      setGroup(updatedGroup)
      setShowEditModal(false)
    } catch (err) {
      setError('Failed to update group')
      console.error('Error updating group:', err)
    }
  }

  const handleDeleteGroup = async () => {
    try {
      if (!group) return
      
      await groupService.deleteGroup(group.id)
      navigate('/groups')
    } catch (err) {
      setError('Failed to delete group')
      console.error('Error deleting group:', err)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (loading) {
    return (
      <div className="group-details">
        <div className="container">
          <div className="loading">Loading group details...</div>
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="group-details">
        <div className="container">
          <div className="error-state">
            <h2>Error</h2>
            <p>{error || 'Group not found'}</p>
            <button className="btn" onClick={() => navigate('/groups')}>
              Back to Groups
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group-details">
      {/* Header */}
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <button className="back-button" onClick={() => navigate('/groups')}>
              <ArrowLeft size={20} />
              Back to Groups
            </button>
            <div className="header-actions">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
                <Edit size={16} />
                Edit Group
              </button>
              <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={16} />
                Delete Group
              </button>
            </div>
          </div>
          <h1 className="page-title">{group.name}</h1>
          {group.description && <p className="page-subtitle">{group.description}</p>}
        </div>
      </div>

      <div className="container">
        {/* Group Overview */}
        <div className="group-overview">
          <div className="overview-grid">
            <div className="overview-card">
              <div className="overview-icon">
                <DollarSign size={24} />
              </div>
              <div className="overview-content">
                <h3>Monthly Amount</h3>
                <p className="overview-value">SRD {group.monthlyAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-icon">
                <Users size={24} />
              </div>
              <div className="overview-content">
                <h3>Members</h3>
                <p className="overview-value">{members.length} / {group.maxMembers}</p>
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-icon">
                <Calendar size={24} />
              </div>
              <div className="overview-content">
                <h3>Duration</h3>
                <p className="overview-value">
                  {group.startDate && group.endDate ? 
                    `${calculateDuration(group.startDate, group.endDate)} month${calculateDuration(group.startDate, group.endDate) !== 1 ? 's' : ''}`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-icon">
                <Calendar size={24} />
              </div>
              <div className="overview-content">
                <h3>Period</h3>
                <p className="overview-value">
                  {formatDateRange(group.startDate, group.endDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="members-section">
          <div className="section-header">
            <h2>Group Members</h2>
            {members.length < group.maxMembers && (
              <button className="btn btn-primary" onClick={() => setShowMemberModal(true)}>
                <Plus size={16} />
                Add Member
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <div className="empty-members">
              <Users size={64} className="empty-icon" />
              <h3>No Members Yet</h3>
              <p>This group doesn't have any members yet. Add the first member to get started.</p>
              <button className="btn btn-primary" onClick={() => setShowMemberModal(true)}>
                <Plus size={16} />
                Add First Member
              </button>
            </div>
          ) : (
            <div className="members-grid">
              {members.map((groupMember) => (
                <div key={groupMember.id} className="member-card">
                  <div className="member-info">
                    <div className="member-name">
                      {groupMember.member.firstName} {groupMember.member.lastName}
                    </div>
                    <div className="member-details">
                      <span className="member-month">
                        Month: {
                          typeof groupMember.assignedMonthDate === 'string' 
                            ? new Date(groupMember.assignedMonthDate + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                            : monthNames[groupMember.assignedMonthDate - 1] // Fallback to old format
                        }
                      </span>
                      <span className="member-city">{groupMember.member.city}</span>
                    </div>
                  </div>
                  <div className="member-actions">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveMember(groupMember.memberId)}
                      title="Remove member from group"
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MemberSelectionModal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        onAddMember={handleAddMember}
        groupId={group.id}
      />

      <GroupModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditGroup}
        group={group}
        mode="edit"
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteGroup}
        itemName={group.name}
        itemType="Group"
      />
    </div>
  )
}

export default GroupDetails
