import { useState, useEffect } from 'react'
import { Calendar, Plus } from 'lucide-react'
import type { PaymentSlot } from '../types/paymentSlot'

import { paymentSlotService } from '../services/paymentSlotService'
import { groupService } from '../services/groupService'
import PaymentModal from '../components/PaymentModal'
import type { PaymentFormData } from '../types/payment'
import './PaymentsDue.css'

interface UnpaidSlot extends PaymentSlot {
  member: {
    id: number
    firstName: string
    lastName: string
  }
  group: {
    id: number
    name: string
    monthlyAmount: number
  }
}

type SortField = 'firstName' | 'lastName' | 'group' | 'slot' | 'amount'
type SortDirection = 'asc' | 'desc'

const PaymentsDue = () => {
  const [unpaidSlots, setUnpaidSlots] = useState<UnpaidSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('firstName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<UnpaidSlot | null>(null)
  const [showCurrentMonthOnly, setShowCurrentMonthOnly] = useState(false)

  useEffect(() => {
    loadUnpaidSlots()
  }, [])

  const loadUnpaidSlots = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get current month in YYYY-MM format
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      
      console.log('Looking for slots not paid in month:', currentMonth)
      
      // Get all groups first
      const groups = await groupService.getAllGroups()
      console.log('Found groups:', groups.length)
      
      const allUnpaidSlots: UnpaidSlot[] = []
      
      // For each group, get slots based on the filter
      for (const group of groups) {
        try {
          console.log(`Checking group: ${group.name} (ID: ${group.id})`)
          
          let unpaidSlots: any[]
          
          if (showCurrentMonthOnly) {
            // Get slots that were NOT paid in the current month (payment_date filter)
            unpaidSlots = await paymentSlotService.getSlotsNotPaidInCurrentMonth(group.id, currentMonth)
            console.log(`Found ${unpaidSlots.length} slots not paid in current month (${currentMonth}) for group ${group.name}`)
          } else {
            // Get ALL unpaid slots (no associated payments)
            unpaidSlots = await paymentSlotService.getAllUnpaidSlotsForGroup(group.id)
            console.log(`Found ${unpaidSlots.length} unpaid slots (no payments) in group ${group.name}`)
          }
          
          allUnpaidSlots.push(...unpaidSlots)
        } catch (error) {
          console.error(`Error loading unpaid slots for group ${group.id}:`, error)
        }
      }
      
      console.log(`Total slots found: ${allUnpaidSlots.length}`)
      console.log('Slots:', allUnpaidSlots)
      
      setUnpaidSlots(allUnpaidSlots)
    } catch (error) {
      console.error('Error loading unpaid slots:', error)
      setError('Failed to load unpaid slots. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedSlots = () => {
    return [...unpaidSlots].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'firstName':
          aValue = a.member.firstName.toLowerCase()
          bValue = b.member.firstName.toLowerCase()
          break
        case 'lastName':
          aValue = a.member.lastName.toLowerCase()
          bValue = b.member.lastName.toLowerCase()
          break
        case 'group':
          aValue = a.group.name.toLowerCase()
          bValue = b.group.name.toLowerCase()
          break
        case 'slot':
          aValue = a.monthDate
          bValue = b.monthDate
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        default:
          aValue = a.member.firstName.toLowerCase()
          bValue = b.member.firstName.toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }

  const handleRowClick = (slot: UnpaidSlot) => {
    setSelectedSlot(slot)
    setIsPaymentModalOpen(true)
  }

  const handlePaymentSave = async (_paymentData: PaymentFormData) => {
    try {
      // The payment will be saved through the PaymentModal
      // After successful save, refresh the unpaid slots list
      await loadUnpaidSlots()
      setIsPaymentModalOpen(false)
      setSelectedSlot(null)
    } catch (error) {
      console.error('Error saving payment:', error)
    }
  }

  const formatMonthDate = (monthDate: string) => {
    if (!monthDate || monthDate.length !== 7) return monthDate
    
    const [year, month] = monthDate.split('-')
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const getSortIconDisplay = (field: SortField) => {
    const icon = getSortIcon(field)
    return icon ? ` ${icon}` : ''
  }

  if (isLoading) {
    return (
      <div className="payments-due-container">
        <div className="loading">Loading unpaid slots...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="payments-due-container">
        <div className="error">{error}</div>
        <button onClick={loadUnpaidSlots} className="retry-btn">Retry</button>
      </div>
    )
  }

  const sortedSlots = getSortedSlots()

  return (
    <div className="payments-due-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Payments Due</h1>
          <p>
            {showCurrentMonthOnly 
              ? 'Slots that were NOT paid in the current month (regardless of slot month)'
              : 'All slots without associated payments'
            }
          </p>
        </div>
        <div className="header-actions">
          <div className="filter-toggle">
            <label className="filter-label">
              <input
                type="checkbox"
                checked={showCurrentMonthOnly}
                onChange={(e) => setShowCurrentMonthOnly(e.target.checked)}
              />
              Current Month Only
            </label>
          </div>
          <button 
            onClick={loadUnpaidSlots} 
            className="refresh-btn"
            title="Refresh"
          >
            <Calendar size={20} />
          </button>
        </div>
      </div>

      {sortedSlots.length === 0 ? (
        <div className="no-data">
          <Calendar size={48} />
          <h3>No Payments Due</h3>
          <p>All members have paid their current month's slots!</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="payments-due-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('firstName')} className="sortable">
                  First Name{getSortIconDisplay('firstName')}
                </th>
                <th onClick={() => handleSort('lastName')} className="sortable">
                  Last Name{getSortIconDisplay('lastName')}
                </th>
                <th onClick={() => handleSort('group')} className="sortable">
                  Group{getSortIconDisplay('group')}
                </th>
                <th onClick={() => handleSort('slot')} className="sortable">
                  Slot{getSortIconDisplay('slot')}
                </th>
                <th onClick={() => handleSort('amount')} className="sortable">
                  Amount Due{getSortIconDisplay('amount')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedSlots.map((slot) => (
                <tr key={`${slot.groupId}-${slot.memberId}-${slot.monthDate}`} className="table-row">
                  <td>{slot.member.firstName}</td>
                  <td>{slot.member.lastName}</td>
                  <td>{slot.group.name}</td>
                  <td>{formatMonthDate(slot.monthDate)}</td>
                  <td className="amount">${slot.amount.toFixed(2)}</td>
                  <td>
                    <button
                      onClick={() => handleRowClick(slot)}
                      className="add-payment-btn"
                      title="Add Payment"
                    >
                      <Plus size={16} />
                      Add Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isPaymentModalOpen && selectedSlot && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setSelectedSlot(null)
          }}
          onSave={handlePaymentSave}
          prefillData={{
            memberId: selectedSlot.memberId,
            groupId: selectedSlot.groupId,
            slotId: selectedSlot.id,
            amount: selectedSlot.amount,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'bank_transfer',
            status: 'pending',
            notes: ''
          }}
        />
      )}
    </div>
  )
}

export default PaymentsDue
