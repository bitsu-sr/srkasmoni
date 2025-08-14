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
  Download,
  Upload
} from 'lucide-react'
import type { Group, GroupMember, GroupMemberFormData } from '../types/member'
import { groupService } from '../services/groupService'
import { memberService } from '../services/memberService'
import { paymentService } from '../services/paymentService'
import MemberSelectionModal from '../components/MemberSelectionModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import GroupModal from '../components/GroupModal'
import { formatDateRange, calculateDuration, formatMonthYear } from '../utils/dateUtils'
import './GroupDetails.css'

interface CSVImportResult {
  success: number
  errors: string[]
  total: number
}

interface CSVMemberData {
  memberId: number
  assignedMonthDate: string
}

const GroupDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [csvImportResult, setCsvImportResult] = useState<CSVImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [slotPaymentStatus, setSlotPaymentStatus] = useState<Map<string, boolean>>(new Map())
  
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
        
        // Load paid slots count for all members
        await loadPaidSlotsCount(groupId, membersData)
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

  const loadPaidSlotsCount = async (groupId: number, membersData: GroupMember[]) => {
    try {
      const slotStatus = new Map<string, boolean>()

      // Load payment status for each individual slot
      for (const member of membersData) {
        const monthDate = typeof member.assignedMonthDate === 'string' 
          ? member.assignedMonthDate 
          : `2024-${String(member.assignedMonthDate).padStart(2, '0')}`
        
        const isPaid = await paymentService.isSlotPaid(groupId, member.memberId)
        const slotKey = `${member.memberId}-${monthDate}`
        slotStatus.set(slotKey, isPaid)
      }
      
      setSlotPaymentStatus(slotStatus)
    } catch (err) {
      console.error('Error loading slot payment status:', err)
      // Don't fail the entire load, just log the error
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

  const handleRemoveSlot = async (memberId: number, monthDate: string) => {
    try {
      if (!group) return
      
      await groupService.removeMemberSlot(group.id, memberId, monthDate)
      // Reload members
      const updatedMembers = await groupService.getGroupMembers(group.id)
      setMembers(updatedMembers)
      // Reload payment status
      await loadPaidSlotsCount(group.id, updatedMembers)
    } catch (err) {
      setError('Failed to remove slot')
      console.error('Error removing slot:', err)
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

  // CSV Import Functions
  const downloadSampleCSV = () => {
    if (!group) return

    const sampleData = [
      {
        memberId: '1',
        assignedMonthDate: '2024-01'
      },
      {
        memberId: '2',
        assignedMonthDate: '2024-02'
      },
      {
        memberId: '3',
        assignedMonthDate: '2024-03'
      }
    ]

    const csvContent = [
      // Header row
      'memberId,assignedMonthDate',
      // Data rows
      ...sampleData.map(row => 
        Object.values(row).map(value => `"${value}"`).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `group_${group.id}_members_sample.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseCSV = (csvText: string): CSVMemberData[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV file must have at least a header row and one data row')

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data: CSVMemberData[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has ${values.length} values but expected ${headers.length}`)
      }

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })

      // Validate required fields
      const requiredFields = ['memberId', 'assignedMonthDate']
      for (const field of requiredFields) {
        if (!row[field] || row[field].trim() === '') {
          throw new Error(`Row ${i + 1}: Missing required field '${field}'`)
        }
      }

      // Validate memberId is a number
      const memberId = parseInt(row.memberId)
      if (isNaN(memberId) || memberId <= 0) {
        throw new Error(`Row ${i + 1}: Invalid member ID '${row.memberId}'`)
      }

      // Validate month date format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(row.assignedMonthDate)) {
        throw new Error(`Row ${i + 1}: Invalid month date format '${row.assignedMonthDate}'. Use YYYY-MM format`)
      }

      // Validate month is within group period
      if (group) {
        const monthDate = row.assignedMonthDate
        if (group.startDate && group.endDate) {
          const [startYear, startMonth] = group.startDate.split('-').map(Number)
          const [endYear, endMonth] = group.endDate.split('-').map(Number)
          const [monthYear, month] = monthDate.split('-').map(Number)
          
          if (monthYear < startYear || (monthYear === startYear && month < startMonth) ||
              monthYear > endYear || (monthYear === endYear && month > endMonth)) {
            throw new Error(`Row ${i + 1}: Month '${monthDate}' is outside the group period`)
          }
        }
      }

      data.push({
        memberId,
        assignedMonthDate: row.assignedMonthDate
      })
    }

    return data
  }

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !group) return

    try {
      setIsImporting(true)
      setCsvImportResult(null)

      const text = await file.text()
      const membersToImport = parseCSV(text)
      
      // Check if group has enough available slots
      const totalSlots = members.length
      const availableSlots = group.maxMembers - totalSlots
      if (membersToImport.length > availableSlots) {
        setCsvImportResult({
          success: 0,
          errors: [`Cannot import ${membersToImport.length} members. Group only has ${availableSlots} available slots.`],
          total: membersToImport.length
        })
        event.target.value = ''
        return
      }
      
      const results: CSVImportResult = {
        success: 0,
        errors: [],
        total: membersToImport.length
      }

      for (const memberData of membersToImport) {
        try {
          // Check if member exists
          const member = await memberService.getMemberById(memberData.memberId)
          if (!member) {
            results.errors.push(`Row ${results.success + results.errors.length + 1}: Member with ID ${memberData.memberId} not found`)
            continue
          }

          // Check if slot is already taken
          const existingMembers = await groupService.getGroupMembers(group.id)
          const isSlotTaken = existingMembers.some(m => m.assignedMonthDate === memberData.assignedMonthDate)
          if (isSlotTaken) {
            results.errors.push(`Row ${results.success + results.errors.length + 1}: Month ${memberData.assignedMonthDate} is already assigned`)
            continue
          }

          // Add member to group
          await groupService.addMemberToGroup(group.id, memberData)
          results.success++
        } catch (error: any) {
          const errorMsg = `Row ${results.success + results.errors.length + 1}: Failed to import member ${memberData.memberId} for month ${memberData.assignedMonthDate}: ${error.message || 'Unknown error'}`
          results.errors.push(errorMsg)
        }
      }

      setCsvImportResult(results)
      
      // Reload members if any were successfully imported
      if (results.success > 0) {
        const updatedMembers = await groupService.getGroupMembers(group.id)
        setMembers(updatedMembers)
      }
      
      // Clear the file input
      event.target.value = ''
    } catch (error: any) {
      setCsvImportResult({
        success: 0,
        errors: [error.message || 'Failed to parse CSV file'],
        total: 0
      })
    } finally {
      setIsImporting(false)
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

        {/* Slots Section */}
        <div className="members-section">
          <div className="section-header">
            <h2>Group Slots</h2>
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

          {/* CSV Import Section */}
          <div className="csv-import-section">
            <div className="csv-import-buttons">
              <button className="btn btn-secondary btn-compact" onClick={downloadSampleCSV}>
                <Download size={16} />
                Download Sample CSV
              </button>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="csv-upload"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={isImporting}
                  style={{ display: 'none' }}
                />
                <label htmlFor="csv-upload" className="btn btn-secondary btn-compact">
                  <Upload size={16} />
                  {isImporting ? 'Importing...' : 'Import CSV'}
                </label>
              </div>
            </div>
            <div className="csv-import-info">
              <p>
                Import members to this group using a CSV file with columns: <code>memberId,assignedMonthDate</code>
                {(() => {
                  const totalSlots = members.length
                  const availableSlots = group.maxMembers - totalSlots
                  return availableSlots > 0 ? 
                    ` • Available slots: ${availableSlots}` : 
                    ' • No available slots'
                })()}
              </p>
              <p className="csv-import-note">
                <strong>Note:</strong> memberId must be an existing member ID, and assignedMonthDate must be in YYYY-MM format within the group period.
              </p>
            </div>
          </div>

          {/* CSV Import Results */}
          {csvImportResult && (
            <div className={`csv-import-result ${csvImportResult.success > 0 ? 'success' : 'error'}`}>
              <div className="result-header">
                <h3>CSV Import Results</h3>
                <button 
                  className="close-result" 
                  onClick={() => setCsvImportResult(null)}
                >
                  ×
                </button>
              </div>
              <div className="result-summary">
                <p>
                  <strong>Total:</strong> {csvImportResult.total} | 
                  <strong>Success:</strong> {csvImportResult.success} | 
                  <strong>Errors:</strong> {csvImportResult.errors.length}
                </p>
              </div>
              {csvImportResult.errors.length > 0 && (
                <div className="result-errors">
                  <h4>Import Errors:</h4>
                  <ul>
                    {csvImportResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {members.length === 0 ? (
            <div className="empty-members">
              <Users size={64} className="empty-icon" />
              <h3>No Slots Yet</h3>
              <p>This group doesn't have any slots assigned yet. Add the first member slot to get started. Each member can reserve multiple monthly slots.</p>
              <button className="btn btn-primary btn-compact" onClick={() => setShowMemberModal(true)}>
                <Plus size={16} />
                Add First Slot
              </button>
            </div>
          ) : (
            <div className="slots-grid">
              {members.map((slot) => {
                const monthDate = typeof slot.assignedMonthDate === 'string' 
                  ? slot.assignedMonthDate 
                  : `2024-${String(slot.assignedMonthDate).padStart(2, '0')}`
                
                const slotKey = `${slot.memberId}-${monthDate}`
                const isPaid = slotPaymentStatus.get(slotKey) || false
                const groupDuration = group?.startDate && group?.endDate ? 
                  calculateDuration(group.startDate, group.endDate) : 0
                const slotAmount = (group?.monthlyAmount || 0) * groupDuration

                return (
                  <div key={slot.id} className="slot-card">
                    <div className="slot-info">
                      <div className="slot-header">
                        <div className="slot-month">
                          {formatMonthYear(monthDate)}
                        </div>
                        <div className="slot-payment-status">
                          {isPaid ? (
                            <span className="status-paid">Paid</span>
                          ) : (
                            <span className="status-unpaid">Unpaid</span>
                          )}
                        </div>
                      </div>
                      <div className="slot-member">
                        <div className="member-name">
                          {slot.member?.firstName} {slot.member?.lastName}
                        </div>
                        <div className="member-details">
                          <span className="member-phone">{slot.member?.phone}</span>
                          <span className="member-email">{slot.member?.email}</span>
                        </div>
                      </div>
                      <div className="slot-details">
                        <span className="slot-amount">
                          Receives: SRD {slotAmount.toLocaleString()}
                        </span>
                        <span className="slot-duration">
                          Duration: {groupDuration} month{groupDuration !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="slot-actions">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveSlot(slot.memberId, monthDate)}
                        title="Remove this slot"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
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
