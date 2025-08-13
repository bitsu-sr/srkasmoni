import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Calendar, DollarSign, Edit, Trash2, Eye } from 'lucide-react'
import type { Group, GroupMember } from '../types/member'
import { groupService } from '../services/groupService'
import GroupModal from '../components/GroupModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { formatDateRange, calculateDuration } from '../utils/dateUtils'
import './Groups.css'

const Groups = () => {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [groupMembers, setGroupMembers] = useState<{ [groupId: number]: GroupMember[] }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const groupsData = await groupService.getAllGroups()
      setGroups(groupsData)
      
      // Load member counts for each group
      const membersData: { [groupId: number]: GroupMember[] } = {}
      for (const group of groupsData) {
        try {
          const members = await groupService.getGroupMembers(group.id)
          membersData[group.id] = members
        } catch (err) {
          console.error(`Error loading members for group ${group.id}:`, err)
          membersData[group.id] = []
        }
      }
      setGroupMembers(membersData)
    } catch (err) {
      setError('Failed to load groups')
      console.error('Error loading groups:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (groupData: any) => {
    try {
      const newGroup = await groupService.createGroup(groupData)
      setGroups(prev => [...prev, newGroup])
      setGroupMembers(prev => ({ ...prev, [newGroup.id]: [] }))
      setShowCreateModal(false)
    } catch (err) {
      setError('Failed to create group')
      console.error('Error creating group:', err)
    }
  }

  const handleEditGroup = async (groupData: any) => {
    try {
      if (!selectedGroup) return
      
      const updatedGroup = await groupService.updateGroup(selectedGroup.id, groupData)
      setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g))
      setShowEditModal(false)
      setSelectedGroup(null)
    } catch (err) {
      setError('Failed to update group')
      console.error('Error updating group:', err)
    }
  }

  const handleDeleteGroup = async () => {
    try {
      if (!selectedGroup) return
      
      await groupService.deleteGroup(selectedGroup.id)
      setGroups(prev => prev.filter(g => g.id !== selectedGroup.id))
      setGroupMembers(prev => {
        const newMembers = { ...prev }
        delete newMembers[selectedGroup.id]
        return newMembers
      })
      setShowDeleteModal(false)
      setSelectedGroup(null)
    } catch (err) {
      setError('Failed to delete group')
      console.error('Error deleting group:', err)
    }
  }

  const openEditModal = (group: Group) => {
    setSelectedGroup(group)
    setShowEditModal(true)
  }

  const openDeleteModal = (group: Group) => {
    setSelectedGroup(group)
    setShowDeleteModal(true)
  }

  const navigateToGroupDetails = (groupId: number) => {
    navigate(`/groups/${groupId}`)
  }



  if (loading) {
    return (
      <div className="groups">
        <div className="container">
          <div className="loading">Loading groups...</div>
        </div>
      </div>
    )
  }

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
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={20} />
            Create New Group
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            {error}
            <button className="error-close" onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* Groups Grid */}
        <div className="groups-grid">
          {groups.map((group) => {
            const memberCount = groupMembers[group.id]?.length || 0
            return (
              <div key={group.id} className="group-card">
                <div className="group-header">
                  <div className="group-info">
                    <h3 className="group-name">{group.name}</h3>
                    {group.description && (
                      <p className="group-description">{group.description}</p>
                    )}
                  </div>
                  <div className="group-actions">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => navigateToGroupDetails(group.id)}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => openEditModal(group)}
                      title="Edit Group"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => openDeleteModal(group)}
                      title="Delete Group"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="group-stats">
                  <div className="stat-row">
                    <div className="stat-item">
                      <Users size={16} />
                      <span>{memberCount} / {group.maxMembers} members</span>
                    </div>
                    <div className="stat-item">
                      <Calendar size={16} />
                      <span>
                        {group.startDate && group.endDate ? 
                          `${calculateDuration(group.startDate, group.endDate)} month${calculateDuration(group.startDate, group.endDate) !== 1 ? 's' : ''}`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="stat-row">
                    <div className="stat-item">
                      <DollarSign size={16} />
                      <span>SRD {group.monthlyAmount.toLocaleString()}/month</span>
                    </div>
                  </div>
                </div>

                <div className="group-period">
                  <div className="period-info">
                    <span>Period:</span>
                    <span>
                      {formatDateRange(group.startDate, group.endDate)}
                    </span>
                  </div>
                </div>

                <div className="group-actions-main">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => navigateToGroupDetails(group.id)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {groups.length === 0 && (
          <div className="empty-state">
            <Users size={64} className="empty-icon" />
            <h3>No Groups Yet</h3>
            <p>Create your first savings group to get started</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Group
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <GroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateGroup}
        mode="create"
      />

      <GroupModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedGroup(null)
        }}
        onSave={handleEditGroup}
        group={selectedGroup}
        mode="edit"
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedGroup(null)
        }}
        onConfirm={handleDeleteGroup}
        itemName={selectedGroup?.name || ''}
        itemType="Group"
      />
    </div>
  )
}

export default Groups
