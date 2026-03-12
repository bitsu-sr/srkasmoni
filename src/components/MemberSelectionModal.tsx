import { useState, useEffect } from 'react'
import { X, Search, Users } from 'lucide-react'
import type { Member, GroupMemberFormData } from '../types/member'
import { memberService } from '../services/memberService'
import { groupService } from '../services/groupService'
import { formatMonthYear } from '../utils/dateUtils'
import './MemberSelectionModal.css'

interface MemberSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onAddMember: (memberData: GroupMemberFormData) => Promise<void>
  groupId: number
}

interface GroupMonthSlot {
  month: string
  memberCount: number
  memberNames: string[]
  maxPerSlot: number
  isFull: boolean
  isReserved: boolean
  reservedBy?: string
}

const MemberSelectionModal: React.FC<MemberSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddMember, 
  groupId 
}) => {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [allMonths, setAllMonths] = useState<GroupMonthSlot[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadMembers()
      loadAllMonths()
      setSuccessMessage('') // Clear any previous success messages
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

  const loadAllMonths = async () => {
    try {
      const months = await groupService.getAllGroupMonths(groupId)
      setAllMonths(months)
      // Set the first slot that can accept another member (not full)
      const firstAvailable = months.find(m => !m.isFull)
      if (firstAvailable) {
        setSelectedMonth(firstAvailable.month)
      }
    } catch (err) {
      setError('Failed to load months')
      console.error('Error loading months:', err)
    }
  }

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member)
    setSuccessMessage('') // Clear success message when selecting a new member
  }

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month)
  }

  const handleAddMember = async () => {
    if (!selectedMember || !selectedMonth) {
      setError('Please select both a member and a month')
      return
    }

    try {
      setError('') // Clear any previous errors
      setSuccessMessage('') // Clear any previous success messages
      setAddingMember(true) // Show loading state
      
      await onAddMember({
        memberId: selectedMember.id,
        assignedMonthDate: selectedMonth
      })

      // Success! Update the local months state (one more member in this slot)
      const addedName = `${selectedMember.firstName} ${selectedMember.lastName}`
      setAllMonths(prevMonths =>
        prevMonths.map(month =>
          month.month === selectedMonth
            ? {
                ...month,
                memberCount: month.memberCount + 1,
                memberNames: [...month.memberNames, addedName],
                isFull: month.memberCount + 1 >= month.maxPerSlot,
                isReserved: true,
                reservedBy: [...month.memberNames, addedName].join(', ')
              }
            : month
        )
      )

      // Reset month selection: stay on same month if it can still take another, else first available
      const updatedSlot = allMonths.find(m => m.month === selectedMonth)
      const sameSlotStillAvailable = updatedSlot && (updatedSlot.memberCount + 1) < updatedSlot.maxPerSlot
      const nextAvailable = sameSlotStillAvailable ? selectedMonth : (allMonths.find(m => !m.isFull)?.month || '')
      setSelectedMonth(nextAvailable)
      setSuccessMessage(`Successfully added ${selectedMember.firstName} ${selectedMember.lastName} for ${formatMonthYear(selectedMonth)}`)
      
      // Don't close the modal - let user add more slots or close manually
      // Don't reset selectedMember - keep it selected for convenience
      // Don't reset searchTerm - keep the search results
    } catch (err: any) {
      // Error occurred, show it to the user
      let errorMessage = 'Failed to add member to group'
      
      // Handle specific database constraint errors
      if (err?.code === '23505') {
        if (err.message?.includes('group_id, member_id')) {
          errorMessage = 'This member is already in this group. You can add multiple slots to the same member.'
        } else if (err.message?.includes('group_id, assigned_month_date')) {
          errorMessage = 'This slot is full. Maximum members per slot reached.'
        }
      }
      if (err?.message?.includes('maximum number of members')) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      console.error('Error adding member:', err)
    } finally {
      setAddingMember(false) // Reset loading state
    }
  }

  // Handle errors from the parent component
  useEffect(() => {
    // This will be called when the parent component sets an error
    // We can add error handling here if needed
  }, [])


  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content member-selection-modal">
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

          {/* Month Selection (slot sharing: multiple members per month allowed up to maxPerSlot) */}
          <div className="month-selection-section">
            <h3>Select Month (slot)</h3>
            <p className="month-selection-hint">You can add another member to a month that already has one (shared slot).</p>
            <div className="months-grid">
              {allMonths.map((monthData) => {
                const canSelect = !monthData.isFull
                const label = monthData.memberCount === 0
                  ? 'Available'
                  : `${monthData.memberNames.join(', ')} (${monthData.memberCount}/${monthData.maxPerSlot})`
                return (
                  <button
                    key={monthData.month}
                    className={`month-button ${selectedMonth === monthData.month ? 'selected' : ''} ${monthData.memberCount > 0 ? 'has-members' : ''} ${monthData.isFull ? 'full' : ''}`}
                    onClick={() => canSelect && handleMonthSelect(monthData.month)}
                    disabled={!canSelect}
                    title={monthData.memberCount > 0 ? label : 'Available for assignment'}
                  >
                    {formatMonthYear(monthData.month)}
                    {monthData.memberCount > 0 && (
                      <div className="reserved-indicator">
                        <span className="reserved-text">{monthData.isFull ? 'Full' : 'Shared'}</span>
                        <span className="reserved-by">{monthData.memberNames.join(', ')} ({monthData.memberCount}/{monthData.maxPerSlot})</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {allMonths.length === 0 && (
              <div className="no-months">
                <p>No months available for this group</p>
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

        {/* Success Message */}
        {successMessage && (
          <div className="success-banner success-banner-bottom">
            {successMessage}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddMember}
            disabled={!selectedMember || !selectedMonth || addingMember}
          >
            {addingMember ? 'Adding...' : 'Add Member'}
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default MemberSelectionModal

