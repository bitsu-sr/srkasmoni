import { useState, useEffect } from 'react'
import { Calendar, Plus, CreditCard, DollarSign, AlertTriangle } from 'lucide-react'
import type { PaymentSlot } from '../types/paymentSlot'
import { usePerformanceSettings } from '../contexts/PerformanceSettingsContext'

import { paymentSlotService } from '../services/paymentSlotService'
import { groupService } from '../services/groupService'
import { paymentService } from '../services/paymentService'
import { optimizedQueryService } from '../services/optimizedQueryService'
import { performanceTracker } from '../utils/performanceMetrics'
import PaymentModal from '../components/PaymentModal'
import type { PaymentFormData } from '../types/payment'
import './PaymentsDue.css'

// Utility function to format currency with thousands separators and remove trailing zeros
const formatCurrency = (amount: number): string => {
  // Convert to string with 2 decimal places
  const formatted = amount.toFixed(2)
  
  // Remove trailing zeros after decimal point
  const withoutTrailingZeros = formatted.replace(/\.?0+$/, '')
  
  // Add thousands separators
  const parts = withoutTrailingZeros.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  
  return parts.join('.')
}

interface UnpaidSlot extends PaymentSlot {
  member: {
    id: number
    first_name: string
    last_name: string
  }
  group: {
    id: number
    name: string
    monthly_amount: number
  }
}

type SortField = 'firstName' | 'lastName' | 'group' | 'slot' | 'amount'
type SortDirection = 'asc' | 'desc'

const PaymentsDue = () => {
  const { isFeatureEnabled } = usePerformanceSettings()
  const [unpaidSlots, setUnpaidSlots] = useState<UnpaidSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('group')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<UnpaidSlot | null>(null)
  const [slotsWithPayments, setSlotsWithPayments] = useState<Set<string>>(new Set())
  const [totalAmount, setTotalAmount] = useState(0)
  const [totalAmountPaid, setTotalAmountPaid] = useState(0)
  // Removed showCurrentMonthOnly since we're showing all slots now



  useEffect(() => {
    loadUnpaidSlots()
  }, [])

    const loadUnpaidSlots = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const enableParallelCalls = isFeatureEnabled('enableParallelCalls')
      const enableOptimizedQueries = isFeatureEnabled('enableOptimizedQueries')
      
      if (enableOptimizedQueries) {
        console.log('🚀 Phase 2: Using single optimized queries...')
        
        try {
          // PHASE 2: Single optimized queries with JOINs
          performanceTracker.startPhase('Phase 2: Single Optimized Queries')
          
          // Single query to get all slots with member, group, and payment data
          const optimizedSlots = await optimizedQueryService.getAllSlotsOptimized()
          
          // Single query to get all groups with calculated totals
          const optimizedGroups = await optimizedQueryService.getAllGroupsOptimized()
          
          // Single query to get payment statistics
          const paymentStats = await optimizedQueryService.getPaymentStatsOptimized()
          
          // Transform optimized data to our component format
          const transformedSlots: UnpaidSlot[] = optimizedSlots.map(slot => ({
            id: slot.id,
            groupId: slot.groupId,
            memberId: slot.memberId,
            monthDate: slot.monthDate,
            amount: slot.amount,
            dueDate: slot.monthDate, // Use monthDate as dueDate for now
            createdAt: new Date().toISOString(), // Use current date as fallback
            member: {
              id: slot.memberId,
              first_name: slot.member_first_name,
              last_name: slot.member_last_name
            },
            group: {
              id: slot.groupId,
              name: slot.group_name,
              monthly_amount: slot.group_monthly_amount
            }
          }))
          
          // Calculate totals from optimized data
          const totalAmount = optimizedGroups.reduce((sum, group) => sum + group.total_monthly_amount, 0)
          const totalAmountPaid = paymentStats.pendingAmount + paymentStats.receivedAmount + paymentStats.settledAmount
          
          setTotalAmount(totalAmount)
          setTotalAmountPaid(totalAmountPaid)
          
          // Check payment status using optimized bulk check
          const slotsWithPaymentsSet = await optimizedQueryService.checkMultipleSlotsPaymentStatusOptimized(
            transformedSlots.map(slot => ({
              groupId: slot.groupId,
              memberId: slot.memberId,
              monthDate: slot.monthDate
            }))
          )
          
          setSlotsWithPayments(slotsWithPaymentsSet)
          setUnpaidSlots(transformedSlots)
          
          // End performance tracking for Phase 2
          performanceTracker.endPhase(transformedSlots.length, 4) // 4 queries: slots, groups, stats, payment status
          
          console.log(`📊 Phase 2: Processed ${transformedSlots.length} slots with ${slotsWithPaymentsSet.size} payments`)
          
        } catch (phase2Error) {
          console.warn('⚠️ Phase 2 optimization failed, falling back to Phase 1:', phase2Error)
          
          // Fallback to Phase 1 if Phase 2 fails
          console.log('⚡ Phase 1: Falling back to parallel database calls...')
          
          // PHASE 1: PARALLEL APPROACH: Load all data simultaneously
          performanceTracker.startPhase('Phase 1: Parallel Database Calls (Fallback)')
          
          const [groups, allSlots, paymentStats] = await Promise.all([
            groupService.getAllGroups(),
            paymentSlotService.getAllSlots(),
            paymentService.getPaymentStats()
          ])
          
          console.log(`Found ${groups.length} groups and ${allSlots.length} total slots`)
          
          // Transform slots to include member and group information
          const transformedSlots: UnpaidSlot[] = allSlots.map(slot => ({
            ...slot,
            member: {
              id: slot.memberId,
              first_name: slot.member?.first_name || '',
              last_name: slot.member?.last_name || ''
            },
            group: {
              id: slot.group?.id || slot.groupId,
              name: slot.group?.name || '',
              monthly_amount: slot.group?.monthly_amount || 0
            }
          }))
          
          // Calculate total amounts in parallel
          const totalAmountPaid = paymentStats.pendingAmount + paymentStats.receivedAmount + paymentStats.settledAmount
          
          // Calculate total amount from groups
          let totalAmount = 0
          for (const group of groups) {
            const groupMembers = await groupService.getGroupMembers(group.id)
            totalAmount += groupMembers.length * group.monthlyAmount
          }
          
          setTotalAmount(totalAmount)
          setTotalAmountPaid(totalAmountPaid)
          
          console.log(`Total slots found: ${transformedSlots.length}`)
          console.log('Slots:', transformedSlots)
          
          // PARALLEL APPROACH: Check payment status for all slots at once
          const slotsWithPaymentsSet = await paymentService.checkMultipleSlotsPaymentStatus(
            transformedSlots.map(slot => ({
              groupId: slot.groupId,
              memberId: slot.memberId,
              monthDate: slot.monthDate
            }))
          )
          
          setSlotsWithPayments(slotsWithPaymentsSet)
          setUnpaidSlots(transformedSlots)
          
          // End performance tracking for Phase 1 fallback
          performanceTracker.endPhase(transformedSlots.length, 3 + groups.length) // 3 initial + 1 per group for members
        }
        
      } else if (enableParallelCalls) {
        console.log('⚡ Phase 1: Using parallel database calls...')
        
        // PHASE 1: PARALLEL APPROACH: Load all data simultaneously
        performanceTracker.startPhase('Phase 1: Parallel Database Calls')
        
        const [groups, allSlots, paymentStats] = await Promise.all([
          groupService.getAllGroups(),
          paymentSlotService.getAllSlots(),
          paymentService.getPaymentStats()
        ])
        
        console.log(`Found ${groups.length} groups and ${allSlots.length} total slots`)
        
        // Transform slots to include member and group information
        const transformedSlots: UnpaidSlot[] = allSlots.map(slot => ({
          ...slot,
          member: {
            id: slot.memberId,
            first_name: slot.member?.first_name || '',
            last_name: slot.member?.last_name || ''
          },
          group: {
            id: slot.group?.id || slot.groupId,
            name: slot.group?.name || '',
            monthly_amount: slot.group?.monthly_amount || 0
          }
        }))
        
        // Calculate total amounts in parallel
        const totalAmountPaid = paymentStats.pendingAmount + paymentStats.receivedAmount + paymentStats.settledAmount
        
        // Calculate total amount from groups
        let totalAmount = 0
        for (const group of groups) {
          const groupMembers = await groupService.getGroupMembers(group.id)
          totalAmount += groupMembers.length * group.monthlyAmount
        }
        
        setTotalAmount(totalAmount)
        setTotalAmountPaid(totalAmountPaid)
        
        console.log(`Total slots found: ${transformedSlots.length}`)
        console.log('Slots:', transformedSlots)
        
        // PARALLEL APPROACH: Check payment status for all slots at once
        const slotsWithPaymentsSet = await paymentService.checkMultipleSlotsPaymentStatus(
          transformedSlots.map(slot => ({
            groupId: slot.groupId,
            memberId: slot.memberId,
            monthDate: slot.monthDate
          }))
        )
        
        setSlotsWithPayments(slotsWithPaymentsSet)
        setUnpaidSlots(transformedSlots)
        
        // End performance tracking for Phase 1
        performanceTracker.endPhase(transformedSlots.length, 3 + groups.length) // 3 initial + 1 per group for members
        
      } else {
        console.log('🐌 Default: Using sequential data loading...')
        
        // ORIGINAL SEQUENTIAL APPROACH: Load data one by one
        performanceTracker.startPhase('Default: Sequential Loading')
        
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
                first_name: slot.member?.first_name || '',
                last_name: slot.member?.last_name || ''
              },
              group: {
                id: group.id,
                name: group.name,
                monthly_amount: group.monthlyAmount
              }
            }))
            
            allSlots.push(...transformedSlots)
          } catch (error) {
            console.error(`Error loading slots for group ${group.id}:`, error)
          }
        }
        
        // Calculate total amounts
        let totalAmount = 0
        for (const group of groups) {
          const groupMembers = await groupService.getGroupMembers(group.id)
          totalAmount += groupMembers.length * group.monthlyAmount
        }
        
        const paymentStats = await paymentService.getPaymentStats()
        const totalAmountPaid = paymentStats.pendingAmount + paymentStats.receivedAmount + paymentStats.settledAmount
        
        setTotalAmount(totalAmount)
        setTotalAmountPaid(totalAmountPaid)
        
        console.log(`Total slots found: ${allSlots.length}`)
        console.log('Slots:', allSlots)
        
        // Check payment status for each slot individually
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
        
        // End performance tracking for Default
        const totalQueries = 1 + groups.length + groups.length + 1 + allSlots.length // groups + slots per group + members per group + stats + payment checks
        performanceTracker.endPhase(allSlots.length, totalQueries)
      }
      
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
          aValue = a.member.first_name.toLowerCase()
          bValue = b.member.first_name.toLowerCase()
          break
        case 'lastName':
          aValue = a.member.last_name.toLowerCase()
          bValue = b.member.last_name.toLowerCase()
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
          aValue = a.member.first_name.toLowerCase()
          bValue = b.member.first_name.toLowerCase()
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
          <button 
            onClick={() => {
              const comparison = performanceTracker.getComparison()
              console.log(comparison)
              
              // Show detailed performance info in a more user-friendly way
              const metrics = performanceTracker.getAllMetrics()
              if (metrics.length > 0) {
                const fastest = metrics.reduce((min, current) => 
                  current.duration < min.duration ? current : min
                )
                const currentPhase = isFeatureEnabled('enableOptimizedQueries') ? 'Phase 2' : 
                                   isFeatureEnabled('enableParallelCalls') ? 'Phase 1' : 'Default'
                
                let message = `🚀 Performance Summary:\n\n`
                message += `Current Phase: ${currentPhase}\n`
                message += `Fastest Execution: ${fastest.phase} (${fastest.duration.toFixed(2)}ms)\n\n`
                
                metrics.forEach(metric => {
                  const speedup = fastest.duration > 0 ? (metric.duration / fastest.duration).toFixed(1) : '∞'
                  message += `${metric.phase}:\n`
                  message += `  ⏱️  ${metric.duration.toFixed(2)}ms\n`
                  message += `  📊 ${metric.dataCount} items\n`
                  message += `  🔍 ${metric.queryCount} queries\n`
                  message += `  🚀 ${speedup}x slower\n\n`
                })
                
                message += `📊 Detailed comparison logged to console (F12)`
                alert(message)
              } else {
                alert('No performance data available yet. Try loading the page first.')
              }
            }} 
            className="performance-btn"
            title="Show Performance Comparison"
          >
            📊 Performance
          </button>
        </div>
        
        {/* Performance Status Display */}
        <div className="performance-status-display">
          <div className="status-indicator">
            {isLoading ? (
              <span className="status-loading">🔄 Loading...</span>
            ) : (
              <>
                <span className="status-phase">
                  {isFeatureEnabled('enableOptimizedQueries') ? '🚀 Phase 2' : 
                   isFeatureEnabled('enableParallelCalls') ? '⚡ Phase 1' : '🐌 Default'}
                </span>
                <span className="status-info">
                  {isFeatureEnabled('enableOptimizedQueries') ? 'Single Optimized Queries' :
                   isFeatureEnabled('enableParallelCalls') ? 'Parallel Database Calls' : 'Sequential Loading'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="statistics-section">
        <div className="stat-card stat-card-default">
          <div className="stat-icon">
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">{sortedSlots.length}</div>
            <div className="stat-label">Total Slots</div>
          </div>
        </div>
        <div className="stat-card stat-card-default">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">SRD {formatCurrency(totalAmount)}</div>
            <div className="stat-label">Total Amount</div>
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">SRD {formatCurrency(totalAmountPaid)}</div>
            <div className="stat-label">Total Amount Paid</div>
          </div>
        </div>
        <div className="stat-card stat-card-danger">
          <div className="stat-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-number">SRD {formatCurrency(Math.max(0, totalAmount - totalAmountPaid))}</div>
            <div className="stat-label">Total Amount Due</div>
          </div>
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
                <th>#</th>
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
                             {sortedSlots.map((slot, index) => {
                 const slotKey = `${slot.groupId}-${slot.memberId}-${slot.monthDate}`
                 const hasPayment = slotsWithPayments.has(slotKey)
                 
                 return (
                   <tr 
                     key={slotKey} 
                     className={`table-row ${hasPayment ? 'has-payment' : ''}`}
                   >
                     <td className="row-number">{index + 1}</td>
                                           <td>{slot.member.first_name}</td>
                      <td>{slot.member.last_name}</td>
                     <td>{slot.group.name}</td>
                     <td>{formatMonthDate(slot.monthDate)}</td>
                     <td className="amount">
                       <span className={`amount-label ${hasPayment ? 'paid' : 'unpaid'}`}>
                         SRD {formatCurrency(slot.amount)}
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
