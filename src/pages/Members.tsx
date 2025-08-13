import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, User, MoreVertical, Eye, Download, Upload } from 'lucide-react'
import { Member, MemberFormData, MemberFilters } from '../types/member'
import { memberService } from '../services/memberService'
import MemberModal from '../components/MemberModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import './Members.css'

interface MemberWithSlots extends Member {
  slotsInfo?: {
    totalSlots: number
    totalMonthlyAmount: number
    nextReceiveMonth: string | null
    isActive: boolean
  }
}

interface CSVImportResult {
  success: number
  errors: string[]
  total: number
}

const Members = () => {
  const navigate = useNavigate()
  const [members, setMembers] = useState<MemberWithSlots[]>([])
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
  const [csvImportResult, setCsvImportResult] = useState<CSVImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Load members on component mount
  useEffect(() => {
    const loadMembers = async () => {
      try {
        setIsLoadingMembers(true)
        const data = await memberService.getAllMembers()
        
        // Load slots info for each member
        const membersWithSlots = await Promise.all(
          data.map(async (member) => {
            try {
              const slotsInfo = await memberService.getMemberSlotsInfo(member.id)
              return { ...member, slotsInfo }
            } catch (error) {
              console.error(`Failed to load slots info for member ${member.id}:`, error)
              return { ...member, slotsInfo: undefined }
            }
          })
        )
        
        setMembers(membersWithSlots)
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
        // Reload slots info for the updated member
        const slotsInfo = await memberService.getMemberSlotsInfo(updatedMember.id)
        const memberWithSlots = { ...updatedMember, slotsInfo }
        
        setMembers(prev => prev.map(m => m.id === editingMember.id ? memberWithSlots : m))
      } else {
        const newMember = await memberService.createMember(memberData)
        // Load slots info for the new member
        const slotsInfo = await memberService.getMemberSlotsInfo(newMember.id)
        const memberWithSlots = { ...newMember, slotsInfo }
        
        setMembers(prev => [...prev, memberWithSlots])
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

  // Helper function to format month display
  const formatMonthDisplay = (monthDate: string | null) => {
    if (!monthDate) return 'No upcoming slots'
    
    try {
      const [year, month] = monthDate.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } catch (error) {
      return monthDate
    }
  }

  // CSV Import Functions
  const downloadSampleCSV = () => {
    const sampleData = [
      {
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-15',
        birthplace: 'Paramaribo',
        address: '123 Main Street',
        city: 'Paramaribo',
        phone: '+59712345678',
        email: 'john.doe@example.com',
        nationalId: '123456789',
        nationality: 'Surinamese',
        occupation: 'Engineer',
        bankName: 'Suriname Bank',
        accountNumber: 'SR123456789',
        dateOfRegistration: '2024-01-01',
        notes: 'Sample member data'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        birthDate: '1985-05-20',
        birthplace: 'Nieuw Nickerie',
        address: '456 Oak Avenue',
        city: 'Nieuw Nickerie',
        phone: '+59787654321',
        email: 'jane.smith@example.com',
        nationalId: '987654321',
        nationality: 'Surinamese',
        occupation: 'Teacher',
        bankName: 'Suriname Bank',
        accountNumber: 'SR987654321',
        dateOfRegistration: '2024-01-02',
        notes: 'Another sample member'
      }
    ]

    const csvContent = [
      // Header row
      'firstName,lastName,birthDate,birthplace,address,city,phone,email,nationalId,nationality,occupation,bankName,accountNumber,dateOfRegistration,notes',
      // Data rows
      ...sampleData.map(row => 
        Object.values(row).map(value => `"${value}"`).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'members_sample.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseCSV = (csvText: string): MemberFormData[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV file must have at least a header row and one data row')

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data: MemberFormData[] = []

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
      const requiredFields = ['firstName', 'lastName', 'birthDate', 'birthplace', 'address', 'city', 'phone', 'email', 'nationalId', 'nationality', 'occupation', 'bankName', 'accountNumber']
      for (const field of requiredFields) {
        if (!row[field] || row[field].trim() === '') {
          throw new Error(`Row ${i + 1}: Missing required field '${field}'`)
        }
      }

      // Transform to MemberFormData format
      const memberData: MemberFormData = {
        firstName: row.firstName,
        lastName: row.lastName,
        birthDate: row.birthDate,
        birthplace: row.birthplace,
        address: row.address,
        city: row.city,
        phone: row.phone,
        email: row.email,
        nationalId: row.nationalId,
        nationality: row.nationality,
        occupation: row.occupation,
        bankName: row.bankName,
        accountNumber: row.accountNumber,
        dateOfRegistration: row.dateOfRegistration || new Date().toISOString().split('T')[0],
        totalReceived: 0,
        lastPayment: '',
        nextPayment: '',
        notes: row.notes || ''
      }

      data.push(memberData)
    }

    return data
  }

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)
      setCsvImportResult(null)

      const text = await file.text()
      const membersToImport = parseCSV(text)
      
      const results: CSVImportResult = {
        success: 0,
        errors: [],
        total: membersToImport.length
      }

      for (const memberData of membersToImport) {
        try {
          const newMember = await memberService.createMember(memberData)
          results.success++
          
          // Add to local state with slots info
          const slotsInfo = await memberService.getMemberSlotsInfo(newMember.id)
          const memberWithSlots = { ...newMember, slotsInfo }
          setMembers(prev => [...prev, memberWithSlots])
        } catch (error: any) {
          const errorMsg = `Failed to import ${memberData.firstName} ${memberData.lastName}: ${error.message || 'Unknown error'}`
          results.errors.push(errorMsg)
        }
      }

      setCsvImportResult(results)
      
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
          <div className="csv-import-section">
            <button className="btn btn-secondary" onClick={downloadSampleCSV}>
              <Download size={20} />
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
              <label htmlFor="csv-upload" className="btn btn-secondary">
                <Upload size={20} />
                {isImporting ? 'Importing...' : 'Import CSV'}
              </label>
            </div>
          </div>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={20} />
            Add Member
          </button>
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
                    <span className={`status-tag ${member.slotsInfo?.isActive ? 'active' : 'inactive'}`}>
                      {member.slotsInfo?.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
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
                  <span className="detail-label">Slots: {member.slotsInfo?.totalSlots || 0}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">National ID: {member.nationalId}</span>
                </div>
              </div>

              <div className="financial-box">
                <div className="financial-row">
                  <span className="financial-label">Total Monthly Amount:</span>
                  <span className="financial-value">
                    SRD {member.slotsInfo?.totalMonthlyAmount.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="financial-row">
                  <span className="financial-label">Next Receive Month:</span>
                  <span className="financial-value">
                    {formatMonthDisplay(member.slotsInfo?.nextReceiveMonth || null)}
                  </span>
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

