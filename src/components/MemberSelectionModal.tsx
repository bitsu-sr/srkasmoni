import React, { useState, useEffect } from 'react'
import { X, Search, Users } from 'lucide-react'
import type { Member, GroupMemberFormData } from '../types/member'
import { memberService } from '../services/memberService'
import { groupService } from '../services/groupService'
import { formatMonthYear } from '../utils/dateUtils'
import './MemberSelectionModal.css'

interface MemberSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onAddMember: (memberData: GroupMemberFormData) => void
  groupId: number
}

const MemberSelectionModal: React.FC<MemberSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddMember, 
  groupId 
}) => {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadMembers()
      loadAvailableMonths()
    }
  }, [isOpen, groupId])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMembers(members)
    } else {
      const filtered = members.filter(member =>
        member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredMembers(filtered)
    }
  }, [searchTerm, members])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const allMembers = await memberService.getAllMembers()
      setMembers(allMembers)
      setFilteredMembers(allMembers)
    } catch (err) {
      setError('Failed to load members')
      console.error('Error loading members:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableMonths = async () => {
    try {
      const months = await groupService.getAvailableMonths(groupId)
      setAvailableMonths(months)
      if (months.length > 0) {
        setSelectedMonth(months[0])
      }
    } catch (err) {
      setError('Failed to load available months')
      console.error('Error loading available months:', err)
    }
  }

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member)
  }

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month)
  }

  const handleAddMember = () => {
    if (!selectedMember || !selectedMonth) {
      setError('Please select both a member and a month')
      return
    }

    onAddMember({
      memberId: selectedMember.id,
      assignedMonthDate: selectedMonth
    })

    // Reset form
    setSelectedMember(null)
    setSelectedMonth(availableMonths[0] || '')
    setSearchTerm('')
    onClose()
  }



  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content member-selection-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Member to Group</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}

          {/* Search Members */}
          <div className="search-section">
            <div className="search-input-wrapper">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search members by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="members-section">
            <h3>Select Member</h3>
            <div className="members-list">
              {loading ? (
                <div className="loading">Loading members...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} />
                  <p>No members found</p>
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`member-item ${selectedMember?.id === member.id ? 'selected' : ''}`}
                    onClick={() => handleMemberSelect(member)}
                  >
                    <div className="member-info">
                      <div className="member-name">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="member-details">
                        {member.city} • {member.phone}
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

          {/* Month Selection */}
          <div className="month-selection-section">
            <h3>Select Month</h3>
            <div className="months-grid">
              {availableMonths.map((month) => (
                <button
                  key={month}
                  className={`month-button ${selectedMonth === month ? 'selected' : ''}`}
                  onClick={() => handleMonthSelect(month)}
                >
                  {formatMonthYear(month)}
                </button>
              ))}
            </div>
            {availableMonths.length === 0 && (
              <div className="no-months">
                <p>No available months for this group</p>
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedMember && selectedMonth && (
            <div className="selection-summary">
              <h3>Summary</h3>
              <div className="summary-content">
                <div className="summary-item">
                  <span className="summary-label">Member:</span>
                  <span className="summary-value">
                    {selectedMember.firstName} {selectedMember.lastName}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Assigned Month:</span>
                  <span className="summary-value">{formatMonthYear(selectedMonth)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddMember}
            disabled={!selectedMember || !selectedMonth}
          >
            Add Member
          </button>
        </div>
      </div>
    </div>
  )
}

export default MemberSelectionModal

