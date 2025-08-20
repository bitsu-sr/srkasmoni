import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Calendar, DollarSign, Edit, Trash2, Eye, Download, Upload, CheckCircle } from 'lucide-react'
import type { Group, GroupFormData } from '../types/member'
import { groupService } from '../services/groupService'
import { groupsOptimizedService, GroupWithDetails } from '../services/groupsOptimizedService'
import GroupModal from '../components/GroupModal'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { formatDateRange, calculateDuration } from '../utils/dateUtils'
import './Groups.css'

interface CSVImportResult {
  success: number
  errors: string[]
  total: number
}

const Groups = () => {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<GroupWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [csvImportResult, setCsvImportResult] = useState<CSVImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupWithDetails | null>(null)
  
  // Sorting state
  const [sortField, setSortField] = useState<'name' | 'monthlyAmount' | 'members'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      setLoading(true)
      
      // Use the optimized service to get all groups with details
      const groupsData = await groupsOptimizedService.getAllGroupsWithDetails()
      setGroups(groupsData)
    } catch (err) {
      setError('Failed to load groups')
      console.error('Error loading groups:', err)
    } finally {
      setLoading(false)
    }
  }

  // Sort groups based on current sort field and direction
  const getSortedGroups = () => {
    return [...groups].sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'monthlyAmount':
          aValue = a.monthlyAmount || 0
          bValue = b.monthlyAmount || 0
          break
        case 'members':
          aValue = a.members?.length || 0
          bValue = b.members?.length || 0
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }

  // Handle sort field change
  const handleSortFieldChange = (field: 'name' | 'monthlyAmount' | 'members') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field with ascending direction
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get sort icon for a field
  const getSortIcon = (field: 'name' | 'monthlyAmount' | 'members') => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  // Helper function to convert Group to GroupWithDetails
  const convertGroupToGroupWithDetails = (group: Group): GroupWithDetails => ({
    ...group,
    description: group.description || '',
    created_at: group.createdAt || new Date().toISOString(),
    updated_at: group.updatedAt || new Date().toISOString(),
    members: [],
    slotsInfo: { paid: 0, total: 0 }
  })

  // Helper function to convert GroupWithDetails back to Group for modals
  const convertGroupWithDetailsToGroup = (groupWithDetails: GroupWithDetails): Group => ({
    id: groupWithDetails.id,
    name: groupWithDetails.name,
    description: groupWithDetails.description,
    monthlyAmount: groupWithDetails.monthlyAmount,
    startDate: groupWithDetails.startDate,
    endDate: groupWithDetails.endDate,
    maxMembers: groupWithDetails.maxMembers,
    duration: groupWithDetails.duration,
    paymentDeadlineDay: groupWithDetails.paymentDeadlineDay,
    lateFinePercentage: groupWithDetails.lateFinePercentage,
    lateFineFixedAmount: groupWithDetails.lateFineFixedAmount,
    createdAt: groupWithDetails.created_at,
    updatedAt: groupWithDetails.updated_at
  })

  const handleCreateGroup = async (groupData: any) => {
    try {
      const newGroup = await groupService.createGroup(groupData)
      const newGroupWithDetails = convertGroupToGroupWithDetails(newGroup)
      setGroups(prev => [...prev, newGroupWithDetails])
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
      const updatedGroupWithDetails = convertGroupToGroupWithDetails(updatedGroup)
      setGroups(prev => prev.map(g => g.id === updatedGroupWithDetails.id ? updatedGroupWithDetails : g))
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
      setShowDeleteModal(false)
      setSelectedGroup(null)
    } catch (err) {
      setError('Failed to delete group')
      console.error('Error deleting group:', err)
    }
  }

  const openEditModal = (group: GroupWithDetails) => {
    setSelectedGroup(group)
    setShowEditModal(true)
  }

  const openDeleteModal = (group: GroupWithDetails) => {
    setSelectedGroup(group)
    setShowDeleteModal(true)
  }

  const navigateToGroupDetails = (groupId: number) => {
    navigate(`/groups/${groupId}`)
  }

  // CSV Import Functions
  const downloadSampleCSV = () => {
    const sampleData = [
      {
        name: 'Family Savings Group',
        description: 'Monthly family savings for emergency fund',
        monthlyAmount: '500',
        maxMembers: '12',
        duration: '12',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        paymentDeadlineDay: '29',
        lateFinePercentage: '5.00',
        lateFineFixedAmount: '100'
      },
      {
        name: 'Business Investment Group',
        description: 'Investment group for small business owners',
        monthlyAmount: '1000',
        maxMembers: '8',
        duration: '24',
        startDate: '2024-01-01',
        endDate: '2025-12-31',
        paymentDeadlineDay: '29',
        lateFinePercentage: '10.00',
        lateFineFixedAmount: '100'
      }
    ]

    const csvContent = [
      // Header row
      'name,description,monthlyAmount,maxMembers,duration,startDate,endDate,paymentDeadlineDay,lateFinePercentage,lateFineFixedAmount',
      // Data rows
      ...sampleData.map(row => 
        Object.values(row).map(value => `"${value}"`).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'groups_sample.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseCSV = (csvText: string): GroupFormData[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) throw new Error('CSV file must have at least a header row and one data row')

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data: GroupFormData[] = []

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
      const requiredFields = ['name', 'monthlyAmount', 'maxMembers', 'duration', 'startDate', 'endDate', 'paymentDeadlineDay']
      for (const field of requiredFields) {
        if (!row[field] || row[field].trim() === '') {
          throw new Error(`Row ${i + 1}: Missing required field '${field}'`)
        }
      }

      // Transform to GroupFormData format
      const groupData: GroupFormData = {
        name: row.name,
        description: row.description || '',
        monthlyAmount: parseFloat(row.monthlyAmount),
        maxMembers: parseInt(row.maxMembers),
        duration: parseInt(row.duration),
        startDate: row.startDate,
        endDate: row.endDate,
        paymentDeadlineDay: parseInt(row.paymentDeadlineDay) || 29,
        lateFinePercentage: parseFloat(row.lateFinePercentage) || 5.00,
        lateFineFixedAmount: parseFloat(row.lateFineFixedAmount) || 100
      }

      // Validate numeric fields
      if (isNaN(groupData.monthlyAmount) || groupData.monthlyAmount <= 0) {
        throw new Error(`Row ${i + 1}: Invalid monthly amount '${row.monthlyAmount}'`)
      }
      if (isNaN(groupData.maxMembers) || groupData.maxMembers <= 0) {
        throw new Error(`Row ${i + 1}: Invalid max members '${row.maxMembers}'`)
      }
      if (isNaN(groupData.duration) || groupData.duration <= 0) {
        throw new Error(`Row ${i + 1}: Invalid duration '${row.duration}'`)
      }
      if (isNaN(groupData.paymentDeadlineDay) || groupData.paymentDeadlineDay < 1 || groupData.paymentDeadlineDay > 31) {
        throw new Error(`Row ${i + 1}: Invalid payment deadline day '${row.paymentDeadlineDay}'. Must be between 1 and 31`)
      }
      if (isNaN(groupData.lateFinePercentage) || groupData.lateFinePercentage < 0 || groupData.lateFinePercentage > 100) {
        throw new Error(`Row ${i + 1}: Invalid late fine percentage '${row.lateFinePercentage}'. Must be between 0 and 100`)
      }
      if (isNaN(groupData.lateFineFixedAmount) || groupData.lateFineFixedAmount < 0) {
        throw new Error(`Row ${i + 1}: Invalid late fine amount '${row.lateFineFixedAmount}'. Must be non-negative`)
      }

      // Validate dates
      if (!/^\d{4}-\d{2}-\d{2}$/.test(groupData.startDate)) {
        throw new Error(`Row ${i + 1}: Invalid start date format '${row.startDate}'. Use YYYY-MM-DD format`)
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(groupData.endDate)) {
        throw new Error(`Row ${i + 1}: Invalid end date format '${row.endDate}'. Use YYYY-MM-DD format`)
      }

      data.push(groupData)
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
      const groupsToImport = parseCSV(text)
      
      const results: CSVImportResult = {
        success: 0,
        errors: [],
        total: groupsToImport.length
      }

      for (const groupData of groupsToImport) {
        try {
          const newGroup = await groupService.createGroup(groupData)
          const newGroupWithDetails = convertGroupToGroupWithDetails(newGroup)
          results.success++
          
          // Add to local state
          setGroups(prev => [...prev, newGroupWithDetails])
        } catch (error: any) {
          const errorMsg = `Failed to import group '${groupData.name}': ${error.message || 'Unknown error'}`
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

  const exportGroupsToCSV = () => {
    if (groups.length === 0) {
      setError('No groups to export')
      return
    }

    try {
      setIsExporting(true)
      
      const csvContent = [
        // Header row
        'name,description,monthlyAmount,maxMembers,duration,startDate,endDate,paymentDeadlineDay,lateFinePercentage,lateFineFixedAmount',
        // Data rows
        ...groups.map(group => 
          [
            `"${group.name}"`,
            `"${group.description || ''}"`,
            group.monthlyAmount.toString(),
            group.maxMembers.toString(),
            group.duration.toString(),
            group.startDate,
            group.endDate,
            group.paymentDeadlineDay.toString(),
            group.lateFinePercentage.toString(),
            group.lateFineFixedAmount.toString()
          ].join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `groups_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      setError('Failed to export groups')
      console.error('Error exporting groups:', error)
    } finally {
      setIsExporting(false)
    }
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
          <div className="csv-import-section">
            <button className="btn btn-secondary" onClick={downloadSampleCSV}>
              <Download size={20} />
              Download Sample CSV
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={exportGroupsToCSV}
              disabled={isExporting || groups.length === 0}
            >
              <Download size={20} />
              {isExporting ? 'Exporting...' : 'Export Groups'}
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

        {/* Sorting Controls */}
        <div className="sorting-controls">
          <div className="sort-label">Sort by:</div>
          <button 
            className={`sort-btn ${sortField === 'name' ? 'active' : ''}`}
            onClick={() => handleSortFieldChange('name')}
          >
            Group Name {getSortIcon('name')}
          </button>
          <button 
            className={`sort-btn ${sortField === 'monthlyAmount' ? 'active' : ''}`}
            onClick={() => handleSortFieldChange('monthlyAmount')}
          >
            Monthly Amount {getSortIcon('monthlyAmount')}
          </button>
          <button 
            className={`sort-btn ${sortField === 'members' ? 'active' : ''}`}
            onClick={() => handleSortFieldChange('members')}
          >
            Members {getSortIcon('members')}
          </button>
        </div>

        {/* Groups Grid */}
        <div className="groups-grid">
          {getSortedGroups().map((group) => {
            const memberCount = group.members?.length || 0
            const slotsInfo = group.slotsInfo || { paid: 0, total: 0 }
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
                    <div className="stat-item">
                      <CheckCircle size={16} />
                      <span>
                        Slots Paid: {slotsInfo.paid || 0} / {slotsInfo.total || 0}
                      </span>
                    </div>
                  </div>
                  <div className="stat-row">
                    <div className="stat-item">
                      <Calendar size={16} />
                      <span>Due: {group.paymentDeadlineDay}th</span>
                    </div>
                    <div className="stat-item">
                      <span className="fine-info">
                        {group.lateFineFixedAmount > 0 
                          ? `Fine: SRD ${group.lateFineFixedAmount}`
                          : `Fine: ${group.lateFinePercentage}%`
                        }
                      </span>
                    </div>
                  </div>
                  
                  {/* Payment Progress Bar */}
                  <div className="payment-progress">
                    <div className="progress-header">
                      <span className="progress-label">Payment Progress</span>
                      <span className="progress-percentage">
                        {slotsInfo.total > 0 
                          ? Math.round((slotsInfo.paid || 0) / slotsInfo.total * 100)
                          : 0
                        }%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{
                          width: `${slotsInfo.total > 0 
                            ? (slotsInfo.paid || 0) / slotsInfo.total * 100
                            : 0
                          }%`
                        }}
                      ></div>
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

      {/* Edit Group Modal */}
      {showEditModal && selectedGroup && (
        <GroupModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditGroup}
          group={convertGroupWithDetailsToGroup(selectedGroup)}
          mode="edit"
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedGroup && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteGroup}
          itemName={selectedGroup?.name || ''}
          itemType="group"
        />
      )}
    </div>
  )
}

export default Groups
