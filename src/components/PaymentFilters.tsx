import { Search, Filter, Trash2 } from 'lucide-react'
import type { PaymentFilters as PaymentFiltersType } from '../types/payment'
import type { Group } from '../types/member'
import type { Bank } from '../types/bank'
import { groupService } from '../services/groupService'
import { bankService } from '../services/bankService'
import { useState, useEffect, useCallback } from 'react'
import './PaymentFilters.css'

interface PaymentFiltersProps {
  filters: PaymentFiltersType
  onFiltersChange: (filters: PaymentFiltersType) => void
  onClearFilters: () => void
}

const PaymentFilters = ({ filters, onFiltersChange, onClearFilters }: PaymentFiltersProps) => {
  const [groups, setGroups] = useState<Group[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchValue, setSearchValue] = useState(filters.search || '')
  // Store the timeout ID to be able to cancel it
  const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadGroups()
    loadBanks()
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId)
      }
    }
  }, [searchTimeoutId])

  // Update local search value when filters change
  useEffect(() => {
    setSearchValue(filters.search || '')
  }, [filters.search])

  const loadGroups = async () => {
    try {
      const groupsData = await groupService.getAllGroups()
      setGroups(groupsData)
    } catch (error) {
      console.error('Failed to load groups:', error)
    }
  }

  const loadBanks = async () => {
    try {
      const banksData = await bankService.getAllBanks()
      setBanks(banksData)
    } catch (error) {
      console.error('Failed to load banks:', error)
    }
  }

  // Debounced search to avoid too many API calls
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (value: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          onFiltersChange({ ...filters, search: value })
        }, 300) // 300ms delay
        setSearchTimeoutId(timeoutId)
      }
    })(),
    [filters, onFiltersChange]
  )

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    debouncedSearch(value)
  }

  const handleFilterChange = (key: keyof PaymentFiltersType, value: any) => {
    const newFilters = { ...filters, [key]: value }
    if (key === 'paymentMonth') {
      try {
        if (value) {
          localStorage.setItem('payments-selected-month', value)
        } else {
          localStorage.removeItem('payments-selected-month')
        }
      } catch (e) {
        // ignore storage errors
      }
    }
    onFiltersChange(newFilters)
  }

  const handleClearFilters = () => {
    setSearchValue('') // Clear local search value
    // Cancel any pending debounced search
    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId)
      setSearchTimeoutId(null)
    }
    // Clear all filters including search
    onClearFilters()
    setIsExpanded(false)
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== 0
  )

  return (
    <div className="payment-filters">
      {/* Search Bar */}
      <div className="payment-filters-search-section">
        <div className="payment-filters-search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by member name, group name..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        {/* Payment Month Selector (always visible) */}
        <div className="payment-filters-month">
          <input
            type="month"
            id="paymentMonth"
            name="paymentMonth"
            aria-label="Filter by Payment Month"
            value={filters.paymentMonth || ''}
            onChange={(e) => handleFilterChange('paymentMonth', e.target.value || undefined)}
            title="Filter by Payment Month"
          />
        </div>
        {searchValue && (
          <button
            className="payment-filters-search-clear"
            onClick={() => handleSearchChange('')}
            type="button"
            title="Clear search"
          >
            <Trash2 size={16} />
          </button>
        )}
        
        <button
          className={`payment-filters-toggle ${isExpanded ? 'payment-filters-toggle-active' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter size={20} />
          Filters
          {hasActiveFilters && <span className="payment-filters-indicator" />}
        </button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="payment-filters-expanded">
          <div className="payment-filters-grid">
            {/* Status Filter */}
            <div className="payment-filters-group">
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
            <div className="payment-filters-group">
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
            <div className="payment-filters-group">
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

            {/* Receiver's Bank Filter */}
            <div className="payment-filters-group">
              <label>Receiver's Bank</label>
              <select
                value={filters.receiverBankId || ''}
                onChange={(e) => handleFilterChange('receiverBankId', Number(e.target.value) || undefined)}
              >
                <option value="">All Banks</option>
                {banks.map(bank => (
                  <option key={bank.id} value={bank.id}>
                    {bank.shortName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filters */}
            <div className="payment-filters-group">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
              />
            </div>

            <div className="payment-filters-group">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="payment-filters-actions">
            <button className="payment-filters-btn payment-filters-btn-secondary" onClick={handleClearFilters}>
              <Trash2 size={16} />
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentFilters
