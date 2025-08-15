import { useState, useEffect } from 'react'
import { Calendar, Plus } from 'lucide-react'
import type { PaymentSlot } from '../types/paymentSlot'

import { paymentSlotService } from '../services/paymentSlotService'
import { groupService } from '../services/groupService'
import { paymentService } from '../services/paymentService'
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
  const [sortField, setSortField] = useState<SortField>('group')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<UnpaidSlot | null>(null)
  const [slotsWithPayments, setSlotsWithPayments] = useState<Set<string>>(new Set())
  // Removed showCurrentMonthOnly since we're showing all slots now

  useEffect(() => {
    loadUnpaidSlots()
  }, [])

  const loadUnpaidSlots = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get all groups first
      const groups = await groupService.getAllGroups()
      console.log('Found groups:', groups.length)
      
      const allSlots: UnpaidSlot[] = []
      
      // For each group, get ALL slots (both paid and unpaid)
      for (const group of groups) {
        try {
          console.log(`Getting all slots for group: ${group.name} (ID: ${group.id})`)
          
          // Get all slots for this group (both paid and unpaid)
          const slots = await paymentSlotService.getGroupSlots(group.id)
          console.log(`Found ${slots.length} total slots in group ${group.name}`)
          
          // Transform slots to include member and group information
          const transformedSlots = slots.map(slot => ({
            ...slot,
            member: {
              id: slot.memberId,
              firstName: slot.member?.first_name || '',
              lastName: slot.member?.last_name || ''
            },
            group: {
              id: group.id,
              name: group.name,
              monthlyAmount: group.monthlyAmount
            }
          }))
          
          allSlots.push(...transformedSlots)
        } catch (error) {
          console.error(`Error loading slots for group ${group.id}:`, error)
        }
      }
      
             console.log(`Total slots found: ${allSlots.length}`)
       console.log('Slots:', allSlots)
       
       // Check payment status for each slot
       const slotsWithPaymentsSet = new Set<string>()
       
       for (const slot of allSlots) {
         try {
           const hasPayment = await paymentService.checkSlotHasPayment(
             slot.groupId,
             slot.memberId,
             slot.monthDate
           )
           
           if (hasPayment) {
             const slotKey = `${slot.groupId}-${slot.memberId}-${slot.monthDate}`
             slotsWithPaymentsSet.add(slotKey)
           }
         } catch (error) {
           console.error(`Error checking payment status for slot:`, error)
         }
       }
       
       setSlotsWithPayments(slotsWithPaymentsSet)
       setUnpaidSlots(allSlots)
    } catch (error) {
      console.error('Error loading slots:', error)
      setError('Failed to load slots. Please try again.')
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
          <h2>All slots from all groups</h2>
          <p>Data from group_members table</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={loadUnpaidSlots} 
            className="refresh-btn"
            title="Refresh"
          >
            <Calendar size={20} />
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="statistics-section">
        <div className="stat-card">
          <div className="stat-number">{sortedSlots.length}</div>
          <div className="stat-label">Total Slots</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">SRD {sortedSlots.reduce((total, slot) => total + slot.amount, 0).toFixed(2)}</div>
          <div className="stat-label">Total Amount Due</div>
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
                             {sortedSlots.map((slot) => {
                 const slotKey = `${slot.groupId}-${slot.memberId}-${slot.monthDate}`
                 const hasPayment = slotsWithPayments.has(slotKey)
                 
                 return (
                   <tr 
                     key={slotKey} 
                     className={`table-row ${hasPayment ? 'has-payment' : ''}`}
                   >
                     <td>{slot.member.firstName}</td>
                     <td>{slot.member.lastName}</td>
                     <td>{slot.group.name}</td>
                     <td>{formatMonthDate(slot.monthDate)}</td>
                     <td className="amount">
                       <span className={`amount-label ${hasPayment ? 'paid' : 'unpaid'}`}>
                         SRD {slot.amount.toFixed(2)}
                       </span>
                     </td>
                     <td>
                       <button
                         onClick={() => handleRowClick(slot)}
                         className="add-payment-btn"
                         title="Add Payment"
                         disabled={hasPayment}
                       >
                         <Plus size={16} />
                         {hasPayment ? 'Paid' : 'Add Payment'}
                       </button>
                     </td>
                   </tr>
                 )
               })}
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
