import { useState, useEffect, useMemo } from 'react'
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
  Upload,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react'
import type { Group, GroupMember, GroupMemberFormData } from '../types/member'
import { groupService } from '../services/groupService'
import { memberService } from '../services/memberService'
import { paymentService } from '../services/paymentService'
import { pdfService } from '../services/pdfService'
import { useAuth } from '../contexts/AuthContext'
import MemberSelectionModal from '../components/MemberSelectionModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import GroupModal from '../components/GroupModal'
import { formatDateRange, calculateDuration, formatMonthYear } from '../utils/dateUtils'
import './GroupDetails.css'
import '../components/PaymentTable.css'

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
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [csvImportResult, setCsvImportResult] = useState<CSVImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [slotPaymentStatus, setSlotPaymentStatus] = useState<Map<string, boolean>>(new Map())
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window === 'undefined') return 'cards'
    const saved = localStorage.getItem('group-details-view-mode')
    return saved === 'table' || saved === 'cards' ? (saved as 'cards' | 'table') : 'cards'
  })
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportPdfSuccess, setExportPdfSuccess] = useState<string | null>(null)
  const [exportPdfError, setExportPdfError] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem('group-details-view-mode', viewMode)
    } catch {}
  }, [viewMode])
  
  // Modal states
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSlotRemoveModal, setShowSlotRemoveModal] = useState(false)
  const [slotToRemove, setSlotToRemove] = useState<{ memberId: number; monthDate: string; memberName: string } | null>(null)

  const membersPerMonth = useMemo(() => {
    const m = new Map<string, number>()
    members.forEach((s) => {
      const d = typeof s.assignedMonthDate === 'string' ? s.assignedMonthDate : `2024-${String(s.assignedMonthDate).padStart(2, '0')}`
      m.set(d, (m.get(d) || 0) + 1)
    })
    return m
  }, [members])

  useEffect(() => {
    // Redirect non-admin users away from this page
    if (!isAdmin) {
      navigate('/groups')
      return
    }
    
    if (id) {
      loadGroupData(parseInt(id))
    }
  }, [id, isAdmin, navigate])

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
      const currentMonth = new Date().toISOString().slice(0, 7)

      // Fetch all payments for the current month in this group
      const currentMonthPayments = await paymentService.getPayments({ paymentMonth: currentMonth, groupId })
      // Consider only meaningful paid statuses if available
      const paidMemberIds = new Set(
        currentMonthPayments
          .filter(p => (p.status === 'received' || p.status === 'settled'))
          .map(p => p.memberId)
      )

      // Mark a slot as paid only if that member has a payment in the current month
      for (const member of membersData) {
        const monthDate = typeof member.assignedMonthDate === 'string' 
          ? member.assignedMonthDate 
          : `2024-${String(member.assignedMonthDate).padStart(2, '0')}`
        const slotKey = `${member.memberId}-${monthDate}`
        slotStatus.set(slotKey, paidMemberIds.has(member.memberId))
      }

      setSlotPaymentStatus(slotStatus)
    } catch (err) {
      console.error('Error loading slot payment status:', err)
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

  const confirmRemoveSlot = (memberId: number, monthDate: string, memberName: string) => {
    setSlotToRemove({ memberId, monthDate, memberName })
    setShowSlotRemoveModal(true)
  }

  const executeRemoveSlot = async () => {
    if (!slotToRemove) return
    
    try {
      await handleRemoveSlot(slotToRemove.memberId, slotToRemove.monthDate)
      setShowSlotRemoveModal(false)
      setSlotToRemove(null)
    } catch (err) {
      // Error is already handled in handleRemoveSlot
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
      
      const groupDuration = group.startDate && group.endDate ? calculateDuration(group.startDate, group.endDate) : 0
      const maxTotalMemberSlots = groupDuration * (group.maxMembersPerSlot ?? 2)
      const availableSlots = maxTotalMemberSlots - members.length
      if (membersToImport.length > availableSlots) {
        setCsvImportResult({
          success: 0,
          errors: [`Cannot import ${membersToImport.length} rows. Only ${availableSlots} member slot(s) available (max ${maxTotalMemberSlots} total).`],
          total: membersToImport.length
        })
        event.target.value = ''
        return
      }

      let currentMembers = [...members]
      const results: CSVImportResult = {
        success: 0,
        errors: [],
        total: membersToImport.length
      }

      for (const memberData of membersToImport) {
        try {
          const member = await memberService.getMemberById(memberData.memberId)
          if (!member) {
            results.errors.push(`Row ${results.success + results.errors.length + 1}: Member with ID ${memberData.memberId} not found`)
            continue
          }

          const maxPerSlot = group.maxMembersPerSlot ?? 2
          const countInMonth = currentMembers.filter(m => {
            const d = typeof m.assignedMonthDate === 'string' ? m.assignedMonthDate : `2024-${String(m.assignedMonthDate).padStart(2, '0')}`
            return d === memberData.assignedMonthDate
          }).length
          if (countInMonth >= maxPerSlot) {
            results.errors.push(`Row ${results.success + results.errors.length + 1}: Month ${memberData.assignedMonthDate} is full (${maxPerSlot} members per slot)`)
            continue
          }

          await groupService.addMemberToGroup(group.id, memberData)
          results.success++
          currentMembers = await groupService.getGroupMembers(group.id)
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

  const handleExportPdf = async () => {
    if (!group) return
    try {
      setIsExportingPdf(true)
      setExportPdfSuccess(null)
      setExportPdfError(null)

      const buildMonthRange = (start: string, end: string): string[] => {
        const result: string[] = []
        if (!start || !end) return result
        const [sy, sm] = start.split('-').map(Number)
        const [ey, em] = end.split('-').map(Number)
        if ([sy, sm, ey, em].some(n => Number.isNaN(n))) return result

        let y = sy
        let m = sm
        while (y < ey || (y === ey && m <= em)) {
          result.push(`${y}-${String(m).padStart(2, '0')}`)
          m++
          if (m === 13) {
            m = 1
            y++
          }
        }
        return result
      }

      const months = buildMonthRange(group.startDate, group.endDate)

      // Build status-by-member-and-month for dots: received=green, not_paid=red, pending=orange, settled=purple
      const statusMap: Record<string, 'received' | 'not_paid' | 'pending' | 'settled'> = {}
      const payments = await paymentService.getPayments({ groupId: group.id })
      payments.forEach(p => {
        if (p.paymentMonth && (p.status === 'received' || p.status === 'not_paid' || p.status === 'pending' || p.status === 'settled')) {
          statusMap[`${p.memberId}-${p.paymentMonth}`] = p.status
        }
      })

      await pdfService.generateGroupDetailsPDF(group, members, statusMap, months)
      setExportPdfSuccess('PDF exported successfully.')
      setTimeout(() => setExportPdfSuccess(null), 4000)
    } catch (err) {
      console.error('Error exporting PDF:', err)
      setExportPdfError('Failed to export PDF. Please try again.')
      setTimeout(() => setExportPdfError(null), 5000)
    } finally {
      setIsExportingPdf(false)
    }
  }

  // Show loading while checking permissions or loading data
  if (loading || !isAdmin) {
    return (
      <div className="group-details">
        <div className="container">
          <div className="loading">
            {!isAdmin ? 'Access denied. Redirecting...' : 'Loading group details...'}
          </div>
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
            <div className="slots-controls">
              <div className="slots-view-toggle" role="tablist" aria-label="Slots view mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'cards'}
                  className={`toggle-option ${viewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => setViewMode('cards')}
                  title="Card view"
                >
                  <LayoutGrid size={16} />
                  Cards
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'table'}
                  className={`toggle-option ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table view"
                >
                  <TableIcon size={16} />
                  Table
                </button>
              </div>
              {(() => {
                const groupDuration = group?.startDate && group?.endDate ? calculateDuration(group.startDate, group.endDate) : 0
                const maxTotalMemberSlots = groupDuration * (group.maxMembersPerSlot ?? 2)
                const hasAvailableSlots = members.length < maxTotalMemberSlots
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
          </div>

          {/* CSV Import & PDF Export Section */}
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
              <button
                type="button"
                className="btn btn-primary btn-compact"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                title="Export group, members and slots to PDF"
              >
                <Download size={16} />
                {isExportingPdf ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
            {(exportPdfSuccess || exportPdfError) && (
              <div className={`group-details-pdf-message ${exportPdfError ? 'error' : 'success'}`}>
                {exportPdfSuccess ?? exportPdfError}
              </div>
            )}
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
              <p>This group doesn't have any slots assigned yet. Add the first member slot to get started. Each member can reserve multiple monthly slots; multiple members can share one slot (split payout).</p>
              <button className="btn btn-primary btn-compact" onClick={() => setShowMemberModal(true)}>
                <Plus size={16} />
                Add First Slot
              </button>
            </div>
          ) : (
            viewMode === 'cards' ? (
              <div className="slots-grid">
                {members.map((slot) => {
                  const monthDate = typeof slot.assignedMonthDate === 'string' 
                    ? slot.assignedMonthDate 
                    : `2024-${String(slot.assignedMonthDate).padStart(2, '0')}`
                  const groupDuration = group?.startDate && group?.endDate ? calculateDuration(group.startDate, group.endDate) : 0
                  const sharersCount = membersPerMonth.get(monthDate) || 1
                  const slotAmount = ((group?.monthlyAmount || 0) / sharersCount) * groupDuration
                  const slotKey = `${slot.memberId}-${monthDate}`
                  const isPaid = slotPaymentStatus.get(slotKey) || false

                  return (
                    <div key={slot.id} className="slot-card">
                      <div className="slot-info">
                        <div className="slot-header">
                          <div className="slot-month">
                            {formatMonthYear(monthDate)}
                            {sharersCount > 1 && (
                              <span className="slot-shared-badge" title="Shared slot"> ({sharersCount})</span>
                            )}
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
                            {sharersCount > 1 && (
                              <span className="slot-split-note"> (split)</span>
                            )}
                          </span>
                          <span className="slot-duration">
                            Duration: {groupDuration} month{groupDuration !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="slot-actions">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => confirmRemoveSlot(slot.memberId, monthDate, `${slot.member?.firstName} ${slot.member?.lastName}`)}
                          title="Remove this slot"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="slots-table-wrapper">
                <table className="slots-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Member</th>
                      <th>Contact</th>
                      <th>Receives</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((slot) => {
                      const monthDate = typeof slot.assignedMonthDate === 'string' 
                        ? slot.assignedMonthDate 
                        : `2024-${String(slot.assignedMonthDate).padStart(2, '0')}`
                      const slotKey = `${slot.memberId}-${monthDate}`
                      const isPaid = slotPaymentStatus.get(slotKey) || false
                      const groupDuration = group?.startDate && group?.endDate ? 
                        calculateDuration(group.startDate, group.endDate) : 0
                      const sharersCount = membersPerMonth.get(monthDate) || 1
                      const slotAmount = ((group?.monthlyAmount || 0) / sharersCount) * groupDuration

                      return (
                        <tr 
                          key={slot.id}
                          onClick={() => navigate(`/members/${slot.memberId}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>{formatMonthYear(monthDate)}</td>
                          <td>{slot.member?.firstName} {slot.member?.lastName}</td>
                          <td>
                            <div className="table-contact">
                              <span className="member-phone">{slot.member?.phone}</span>
                              <span className="member-email">{slot.member?.email}</span>
                            </div>
                          </td>
                          <td>SRD {slotAmount.toLocaleString()}</td>
                          <td>{groupDuration} month{groupDuration !== 1 ? 's' : ''}</td>
                          <td>
                            {isPaid ? (
                              <span className="status-paid">Paid</span>
                            ) : (
                              <span className="status-unpaid">Unpaid</span>
                            )}
                          </td>
                          <td className="payment-table-actions">
                            <button
                              className="payment-table-action-btn payment-table-action-delete"
                              onClick={(e) => { e.stopPropagation(); confirmRemoveSlot(slot.memberId, monthDate, `${slot.member?.firstName} ${slot.member?.lastName}`) }}
                              title="Remove this slot"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
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

      <DeleteConfirmModal
        isOpen={showSlotRemoveModal}
        onClose={() => {
          setShowSlotRemoveModal(false)
          setSlotToRemove(null)
        }}
        onConfirm={executeRemoveSlot}
        itemName={`${slotToRemove?.memberName}'s slot for ${slotToRemove?.monthDate ? formatMonthYear(slotToRemove.monthDate) : 'this month'}`}
        itemType="Slot"
      />
    </div>
  )
}

export default GroupDetails
