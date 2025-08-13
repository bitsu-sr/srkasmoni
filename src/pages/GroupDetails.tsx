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
import { formatDateRange, calculateDuration, formatMonthYear } from '../utils/dateUtils'
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
    } catch (err: any) {
      let errorMessage = 'Failed to add member to group'
      
      // Handle specific database constraint errors
      if (err?.code === '23505') {
        if (err.message?.includes('group_id, member_id')) {
          errorMessage = 'This member is already in this group. You can add multiple slots to the same member.'
        } else if (err.message?.includes('group_id, assigned_month_date')) {
          errorMessage = 'This month is already assigned to another member in this group.'
        }
      }
      
      setError(errorMessage)
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
                <p className="overview-value">
                  {(() => {
                    const uniqueMembers = new Set(members.map(m => m.memberId)).size
                    const totalSlots = members.length
                    return `${uniqueMembers} members, ${totalSlots} slots / ${group.maxMembers}`
                  })()}
                </p>
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
            {(() => {
              const totalSlots = members.length
              const hasAvailableSlots = totalSlots < group.maxMembers
              return hasAvailableSlots ? (
                <button className="btn btn-primary btn-compact" onClick={() => setShowMemberModal(true)}>
                  <Plus size={16} />
                  Add Member
                </button>
              ) : (
                <div className="no-slots-available">
                  <span>All slots filled</span>
                </div>
              )
            })()}
          </div>

          {members.length === 0 ? (
            <div className="empty-members">
              <Users size={64} className="empty-icon" />
              <h3>No Members Yet</h3>
              <p>This group doesn't have any members yet. Add the first member to get started. Each member can reserve multiple monthly slots.</p>
              <button className="btn btn-primary btn-compact" onClick={() => setShowMemberModal(true)}>
                <Plus size={16} />
                Add First Member
              </button>
            </div>
          ) : (
            <div className="members-grid">
              {(() => {
                // Group members by member ID to show multiple slots per member
                const memberSlots = new Map<number, GroupMember[]>()
                members.forEach(member => {
                  if (!memberSlots.has(member.memberId)) {
                    memberSlots.set(member.memberId, [])
                  }
                  memberSlots.get(member.memberId)!.push(member)
                })

                return Array.from(memberSlots.entries()).map(([memberId, memberSlots]) => {
                  const firstMember = memberSlots[0]
                  const totalSlots = memberSlots.length
                  const totalAmount = totalSlots * (group?.monthlyAmount || 0)

                  return (
                    <div key={memberId} className="member-card">
                      <div className="member-info">
                        <div className="member-name">
                          {firstMember.member?.firstName} {firstMember.member?.lastName}
                          <span className="member-slot-count">({totalSlots} slot{totalSlots !== 1 ? 's' : ''})</span>
                        </div>
                        <div className="member-details">
                          <span className="member-recipient">
                            Recipient: {firstMember.member?.firstName} {firstMember.member?.lastName}
                          </span>
                          <span className="member-slots">
                            Payment Months: {memberSlots.map(slot => 
                              formatMonthYear(typeof slot.assignedMonthDate === 'string' 
                                ? slot.assignedMonthDate
                                : `2024-${String(slot.assignedMonthDate).padStart(2, '0')}`
                              )
                            ).join(', ')}
                          </span>
                          <span className="member-amount">
                            Total Receives: SRD {totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="member-actions">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveMember(memberId)}
                          title="Remove all slots for this member"
                        >
                          <UserX size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })
              })()}
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
