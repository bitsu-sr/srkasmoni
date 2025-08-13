import { Search, Filter, X } from 'lucide-react'
import type { PaymentFilters as PaymentFiltersType } from '../types/payment'
import type { Group } from '../types/member'
import { groupService } from '../services/groupService'
import { useState, useEffect } from 'react'
import './PaymentFilters.css'

interface PaymentFiltersProps {
  filters: PaymentFiltersType
  onFiltersChange: (filters: PaymentFiltersType) => void
  onClearFilters: () => void
}

const PaymentFilters = ({ filters, onFiltersChange, onClearFilters }: PaymentFiltersProps) => {
  const [groups, setGroups] = useState<Group[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      const groupsData = await groupService.getAllGroups()
      setGroups(groupsData)
    } catch (error) {
      console.error('Failed to load groups:', error)
    }
  }

  const handleFilterChange = (key: keyof PaymentFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const handleClearFilters = () => {
    onClearFilters()
    setIsExpanded(false)
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== 0
  )

  return (
    <div className="payment-filters">
      {/* Search Bar */}
      <div className="search-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search payments by member name..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        
        <button
          className={`filter-toggle ${isExpanded ? 'active' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter size={20} />
          Filters
          {hasActiveFilters && <span className="filter-indicator" />}
        </button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="filters-expanded">
          <div className="filters-grid">
            {/* Status Filter */}
            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              >
                <option value="">All Statuses</option>
                <option value="not_paid">Not Paid</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="settled">Settled</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="filter-group">
              <label>Payment Method</label>
              <select
                value={filters.paymentMethod || ''}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value || undefined)}
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            {/* Group Filter */}
            <div className="filter-group">
              <label>Group</label>
              <select
                value={filters.groupId || ''}
                onChange={(e) => handleFilterChange('groupId', Number(e.target.value) || undefined)}
              >
                <option value="">All Groups</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filters */}
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
              />
            </div>

            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={handleClearFilters}>
              <X size={16} />
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentFilters
