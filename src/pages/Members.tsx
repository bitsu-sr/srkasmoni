import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, User, MoreVertical, Eye, Download, Upload, ArrowUpDown, ArrowUp, ArrowDown, Grid, List } from 'lucide-react'
import { Member, MemberFormData, MemberFilters } from '../types/member'
import { memberService } from '../services/memberService'
import { getAllMembersWithStatus, getMemberWithStatus, MemberWithStatus } from '../services/memberStatusService'
import { useAuth } from '../contexts/AuthContext'
import MemberModal from '../components/MemberModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import './Members.css'
import { useLanguage } from '../contexts/LanguageContext'

// Using the centralized MemberWithStatus interface from memberStatusService

interface CSVImportResult {
  success: number
  errors: string[]
  total: number
}

type SortField = 'name' | 'status'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

const Members = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { t } = useLanguage()
  const [members, setMembers] = useState<MemberWithStatus[]>([])
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'name',
    direction: 'asc'
  })
  const [csvImportResult, setCsvImportResult] = useState<CSVImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    if (typeof window === 'undefined') return 'card'
    const saved = localStorage.getItem('members-view-mode')
    return saved === 'table' || saved === 'card' ? saved : 'card'
  })

  useEffect(() => {
    try {
      localStorage.setItem('members-view-mode', viewMode)
    } catch {}
  }, [viewMode])

  // Load members on component mount
  useEffect(() => {
    const loadMembers = async () => {
      try {
        setIsLoadingMembers(true)
        const data = await getAllMembersWithStatus()
        
        // If user is not admin, filter to show only their member card
        if (!isAdmin && user?.username) {
          // Find the member record that matches the current user's username
          const userMember = data.find(member => 
            member.firstName.toLowerCase() + '.' + member.lastName.toLowerCase() === user.username.toLowerCase()
          )
          setMembers(userMember ? [userMember] : [])
        } else {
          setMembers(data)
        }
      } catch (error) {
        console.error('Failed to load members:', error)
        // Fallback to empty array if Supabase is not configured
        setMembers([])
      } finally {
        setIsLoadingMembers(false)
      }
    }

    loadMembers()
  }, [isAdmin, user?.username])

  // Filter and sort members based on search, filters, and sort configuration
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members.filter(member => {
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

    // Sort the filtered members
    filtered.sort((a, b) => {
      if (sortConfig.field === 'name') {
        const aName = `${a.firstName} ${a.lastName}`.toLowerCase()
        const bName = `${b.firstName} ${b.lastName}`.toLowerCase()
        
        if (sortConfig.direction === 'asc') {
          return aName.localeCompare(bName)
        } else {
          return bName.localeCompare(aName)
        }
      } else if (sortConfig.field === 'status') {
        const aStatus = a.statusInfo.isActive ? 1 : 0
        const bStatus = b.statusInfo.isActive ? 1 : 0
        
        if (sortConfig.direction === 'asc') {
          return aStatus - bStatus
        } else {
          return bStatus - aStatus
        }
      }
      return 0
    })

    return filtered
  }, [members, filters, sortConfig])

  const handleSaveMember = async (memberData: MemberFormData) => {
    if (!isAdmin) {
      alert('Only administrators can create or edit members.')
      return
    }
    
    try {
      setIsLoading(true)
      if (editingMember) {
        const updatedMember = await memberService.updateMember(editingMember.id, memberData)
        // Reload status info for the updated member
        const memberWithStatus = await getMemberWithStatus(updatedMember.id)
        if (memberWithStatus) {
          setMembers(prev => prev.map(m => m.id === editingMember.id ? memberWithStatus : m))
        }
      } else {
        const newMember = await memberService.createMember(memberData)
        // Load status info for the new member
        const memberWithStatus = await getMemberWithStatus(newMember.id)
        if (memberWithStatus) {
          setMembers(prev => [...prev, memberWithStatus])
        }
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
    if (!isAdmin) {
      alert('Only administrators can delete members.')
      return
    }
    setDeletingMember(member)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingMember) return
    
    if (!isAdmin) {
      alert('Only administrators can delete members.')
      return
    }

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
    if (!isAdmin) {
      alert('Only administrators can add new members.')
      return
    }
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
    if (!isAdmin) {
      alert('Only administrators can download sample CSV files.')
      return
    }
    
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
    if (!isAdmin) {
      alert('Only administrators can import CSV files.')
      return
    }
    
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
          
          // Add to local state with status info
          const memberWithStatus = await getMemberWithStatus(newMember.id)
          if (memberWithStatus) {
            setMembers(prev => [...prev, memberWithStatus])
          }
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
      <div className="members-page">
        <div className="members-container">
          <div className="members-loading">{t('members.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="members-page">
      <div className="members-page-header">
        <div className="members-container">
          <h1 className="members-page-title">{t('members.title')}</h1>
          <p className="members-page-subtitle">
            {isAdmin ? t('members.subtitle.admin') : t('members.subtitle.user')}
          </p>
        </div>
      </div>

      <div className="members-container">
        {/* Header Actions - Only show for admins */}
        {isAdmin && (
          <div className="members-page-actions">
            <div className="members-csv-import-section">
              <button className="members-btn members-btn-secondary" onClick={downloadSampleCSV}>
                <Download size={20} />
                {t('members.downloadSample')}
              </button>
              <div className="members-file-upload-wrapper">
                <input
                  type="file"
                  id="csv-upload"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={isImporting}
                  style={{ display: 'none' }}
                />
                <label htmlFor="csv-upload" className="members-btn members-btn-secondary">
                  <Upload size={20} />
                  {isImporting ? 'Importing...' : t('members.importCsv')}
                </label>
              </div>
            </div>
            <div className="members-create-member-section">
              <button className="members-btn members-btn-primary" onClick={openAddModal}>
                <Plus size={20} />
                {t('members.addMember')}
              </button>
            </div>
            <div className="members-view-mode-toggle" aria-label="View Mode">
              <div className="members-toggle-label">{t('members.viewMode')}</div>
              <div className="members-toggle-switch">
                <button 
                  className={`members-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                  onClick={() => setViewMode('card')}
                  title="Card View"
                >
                  <Grid size={18} />
                  <span>{t('members.cards')}</span>
                </button>
                <button 
                  className={`members-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <List size={18} />
                  <span>{t('members.table')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Results - Only show for admins */}
        {isAdmin && csvImportResult && (
          <div className={`members-csv-import-result ${csvImportResult.success > 0 ? 'success' : 'error'}`}>
            <div className="members-result-header">
              <h3>{t('members.csvResults')}</h3>
              <button 
                className="members-close-result" 
                onClick={() => setCsvImportResult(null)}
              >
                ×
              </button>
            </div>
            <div className="members-result-summary">
              <p>
                <strong>Total:</strong> {csvImportResult.total} | 
                <strong>Success:</strong> {csvImportResult.success} | 
                <strong>Errors:</strong> {csvImportResult.errors.length}
              </p>
            </div>
            {csvImportResult.errors.length > 0 && (
              <div className="members-result-errors">
                <h4>{t('members.importErrors')}</h4>
                <ul>
                  {csvImportResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Search and Filters - Only show for admins */}
        {isAdmin && (
          <div className="members-filters-section">
            <div className="members-search-box">
              <Search size={20} />
              <input
                type="text"
                className="members-search-input"
                placeholder={t('members.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div className="members-filters-row">
              <select
                className="members-filter-select"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              >
                <option value="">{t('members.filter.allCities')}</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              {/* Sorting Controls */}
              <div className="members-sorting-controls">
                <button
                  className={`members-sort-btn ${sortConfig.field === 'name' ? 'active' : ''}`}
                  onClick={() => {
                    if (sortConfig.field === 'name') {
                      setSortConfig(prev => ({
                        ...prev,
                        direction: prev.direction === 'asc' ? 'desc' : 'asc'
                      }))
                    } else {
                      setSortConfig({ field: 'name', direction: 'asc' })
                    }
                  }}
                  title="Sort by name (click to change direction)"
                >
                  {t('members.sort.name')}
                  {sortConfig.field === 'name' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                  ) : (
                    <ArrowUpDown size={16} />
                  )}
                </button>

                <button
                  className={`members-sort-btn ${sortConfig.field === 'status' ? 'active' : ''}`}
                  onClick={() => {
                    if (sortConfig.field === 'status') {
                      setSortConfig(prev => ({
                        ...prev,
                        direction: prev.direction === 'asc' ? 'desc' : 'asc'
                      }))
                    } else {
                      setSortConfig({ field: 'status', direction: 'asc' })
                    }
                  }}
                  title="Sort by status (click to change direction)"
                >
                  {t('members.sort.status')}
                  {sortConfig.field === 'status' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                  ) : (
                    <ArrowUpDown size={16} />
                  )}
                </button>

                {(sortConfig.field !== 'name' || sortConfig.direction !== 'asc') && (
                  <button
                    className="members-sort-btn clear-sort"
                    onClick={() => setSortConfig({ field: 'name', direction: 'asc' })}
                    title={t('members.sort.resetTitle')}
                  >
                    {t('members.sort.reset')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        

        {/* Member Count - Only show for admins */}
        {isAdmin && (
          <div>
            <div className="members-member-count">
              {t('members.count.found')
                .replace('{count}', String(filteredAndSortedMembers.length))
                .replace('{plural}', filteredAndSortedMembers.length !== 1 ? 's' : '')}
              {filteredAndSortedMembers.length > 0 && (
                <span className="members-sort-info">
                  {t('members.count.sortedBy')
                    .replace('{field}', sortConfig.field === 'name' ? t('members.sort.name') : t('members.sort.status'))
                    .replace('{dir}', sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Members Display */}
        {viewMode === 'card' ? (
          /* Members Grid */
          <div className="members-grid">
            {filteredAndSortedMembers.map((member) => (
              <div key={member.id} className="members-member-card">
                <div className="members-member-header">
                  <div className="members-member-info">
                    <h3 className="members-member-name">{member.firstName} {member.lastName}</h3>
                    <div className="members-status-tags">
                      <span className={`members-status-tag ${member.statusInfo.isActive ? 'active' : 'inactive'}`}>
                        {member.statusInfo.isActive ? t('members.status.active') : t('members.status.inactive')}
                      </span>
                    </div>
                  </div>
                  <div className="members-member-menu">
                    <button className="members-menu-btn">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                <div className="members-member-details">
                  <div className="members-detail-item">
                    <span className="members-detail-label">{t('members.detail.slots')}: {member.statusInfo.totalSlots}</span>
                  </div>
                  <div className="members-detail-item">
                    <span className="members-detail-label">{t('members.detail.nationalId')}: {member.nationalId}</span>
                  </div>
                </div>

                <div className="members-financial-box">
                  <div className="members-financial-row">
                    <span className="members-financial-label">{t('members.fin.totalMonthly')}</span>
                    <span className="members-financial-value">
                      SRD {member.statusInfo.totalMonthlyAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="members-financial-row">
                    <span className="members-financial-label">{t('members.fin.nextReceive')}</span>
                    <span className="members-financial-value">
                      {formatMonthDisplay(member.statusInfo.nextReceiveMonth)}
                    </span>
                  </div>
                </div>

                <div className="members-member-actions">
                  <button className="members-btn members-btn-secondary members-view-btn" onClick={() => handleViewDetails(member.id)}>
                    <Eye size={16} />
                    {t('members.btn.viewDetails')}
                  </button>
                  {isAdmin && (
                    <button 
                      className="members-btn members-btn-danger"
                      onClick={() => handleDeleteMember(member)}
                    >
                      <Trash2 size={16} />
                      {t('members.btn.delete')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Members Table */
          <div className="members-table-container">
            <table className="members-table">
              <thead>
                <tr>
                  <th>{t('members.table.name')}</th>
                  <th>{t('members.table.status')}</th>
                  <th>{t('members.table.nationalId')}</th>
                  <th>{t('members.table.phone')}</th>
                  <th>{t('members.table.city')}</th>
                  <th>{t('members.table.slots')}</th>
                  <th>{t('members.table.monthlyAmount')}</th>
                  <th>{t('members.table.nextReceive')}</th>
                  <th>{t('members.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="members-member-name-cell">
                      <div className="members-member-name-info">
                        <span className="members-member-full-name">{member.firstName} {member.lastName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`members-status-tag ${member.statusInfo.isActive ? 'active' : 'inactive'}`}>
                        {member.statusInfo.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>{member.nationalId}</td>
                    <td>{member.phone}</td>
                    <td>{member.city}</td>
                    <td>{member.statusInfo.totalSlots}</td>
                    <td>SRD {member.statusInfo.totalMonthlyAmount.toLocaleString()}</td>
                    <td>{formatMonthDisplay(member.statusInfo.nextReceiveMonth)}</td>
                    <td className="members-member-actions-cell">
                      <div className="members-table-actions">
                        <button 
                          className="members-table-action-btn members-table-action-view"
                          onClick={() => handleViewDetails(member.id)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {isAdmin && (
                          <button 
                            className="members-table-action-btn members-table-action-delete"
                            onClick={() => handleDeleteMember(member)}
                            title="Delete Member"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {filteredAndSortedMembers.length === 0 && (
          <div className="members-empty-state">
            <User size={64} className="members-empty-icon" />
            <h3>{t('members.empty.title')}</h3>
            <p>{t('members.empty.desc')}</p>
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

