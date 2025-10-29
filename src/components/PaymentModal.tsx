import { useState, useEffect, useMemo } from 'react'
import { X, User, Building2, Calendar, DollarSign, CreditCard, Banknote } from 'lucide-react'
import type { Payment, PaymentFormData } from '../types/payment'
import type { Group } from '../types/member'
import type { Bank } from '../types/bank'
import type { GroupMember, PaymentSlot } from '../types/paymentSlot'
import { paymentSlotService } from '../services/paymentSlotService'
import { groupService } from '../services/groupService'
import { bankService } from '../services/bankService'
import { paymentService } from '../services/paymentService'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './PaymentModal.css'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payment: PaymentFormData) => void
  payment?: Payment
  isEditing?: boolean
  prefillData?: Partial<PaymentFormData>
  workflow?: 'group-first' | 'member-first' | 'multi-group'
  onWorkflowChange?: (workflow: 'group-first' | 'member-first' | 'multi-group') => void
}

const PaymentModal = ({ isOpen, onClose, onSave, payment, isEditing = false, prefillData, workflow = 'member-first', onWorkflowChange }: PaymentModalProps) => {
  const { user } = useAuth();
  
  // Check if user has permission to create/edit payments
  const canManagePayments = user?.role === 'admin';
  
  const [formData, setFormData] = useState<PaymentFormData>({
     memberId: 0,
     groupId: 0,
     slotId: '',
     paymentDate: new Date().toLocaleDateString('en-CA'), // Use local timezone, format: YYYY-MM-DD
     paymentMonth: new Date().toISOString().substring(0, 7), // Default to current month (YYYY-MM)
     amount: 0,
     paymentMethod: 'bank_transfer',
     status: 'pending',
     senderBankId: undefined,
     receiverBankId: undefined,
     notes: ''
   })

  const [groups, setGroups] = useState<Group[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [memberSlots, setMemberSlots] = useState<PaymentSlot[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicateWarning, setDuplicateWarning] = useState<string>('')
  
  // Filtered data based on active groups/members
  const [activeGroups, setActiveGroups] = useState<Group[]>([])
  const [activeGroupIds, setActiveGroupIds] = useState<Set<number>>(new Set())
  
  // Member-first workflow state
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [memberGroups, setMemberGroups] = useState<Group[]>([])
  const [memberSearchTerm, setMemberSearchTerm] = useState('')
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false)
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(-1)
  const [isLoadingMemberGroups, setIsLoadingMemberGroups] = useState(false)
  
  // Multi-group workflow state
  const [selectedMemberForMulti, setSelectedMemberForMulti] = useState<any>(null)
  const [groupSlotCombinations, setGroupSlotCombinations] = useState<Array<{
    groupId: number
    groupName: string
    slotId: string
    slotMonth: string
    amount: number
    combinationKey: string
  }>>([])
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set())
  const [existingPayments, setExistingPayments] = useState<Record<string, boolean>>({})
  const [multiGroupPaymentInfo, setMultiGroupPaymentInfo] = useState<{
    senderBankId?: number
    receiverBankId?: number
    paymentDate: string
    paymentMonth: string
    paymentMethod: 'bank_transfer' | 'cash'
    status: 'pending' | 'received' | 'settled'
    notes: string
  }>({
    paymentDate: new Date().toLocaleDateString('en-CA'),
    paymentMonth: new Date().toISOString().substring(0, 7),
    paymentMethod: 'bank_transfer',
    status: 'pending',
    notes: ''
  })

  // Helper function to check if a group is active for a given payment month
  const isGroupActiveForMonth = (group: Group, paymentMonth: string): boolean => {
    let isActive = true
    
    // Check if group has started
    if (group.startDate) {
      const startMonth = group.startDate.substring(0, 7)
      if (paymentMonth < startMonth) {
        isActive = false
      }
    }
    
    // Check if group has ended
    if (isActive && group.endDate) {
      const endMonth = group.endDate.substring(0, 7)
      if (paymentMonth > endMonth) {
        isActive = false
      }
    }
    
    return isActive
  }

  // Filter groups based on payment month
  const filterActiveGroups = (groupsData: Group[], paymentMonth: string) => {
    const filtered = groupsData.filter(group => isGroupActiveForMonth(group, paymentMonth))
    const activeIds = new Set(filtered.map(g => g.id))
    setActiveGroups(filtered)
    setActiveGroupIds(activeIds)
    return filtered
  }

     // Load initial data
   useEffect(() => {
     if (isOpen) {
       setIsInitialLoading(true)
       
      const loadInitialData = async () => {
        try {
          // Load groups and banks in parallel
          const [groupsData, banksData] = await Promise.all([
            groupService.getAllGroups(),
            bankService.getAllBanks()
          ])
          
          setGroups(groupsData)
          setBanks(banksData)
          
          // Filter active groups based on payment month
          const filtered = filterActiveGroups(groupsData, formData.paymentMonth)
          
          // Load all members for member-first and multi-group workflows
          if (workflow === 'member-first' || workflow === 'multi-group') {
            await loadAllMembersWithGroups(filtered)
          }
        } catch (error) {
          console.error('Failed to load initial data:', error)
        } finally {
          setIsInitialLoading(false)
        }
      }
       
       loadInitialData()
       
       if (prefillData) {
         // Handle prefill data (e.g., from Payments Due page)
         setFormData(prev => ({
           ...prev,
           ...prefillData
         }))
         
                  // Load cascading data if groupId is provided
         if (prefillData.groupId) {
           loadGroupMembers(prefillData.groupId)
           loadGroupMonthlyAmount(prefillData.groupId)
         }
         
         // Load member slots if both groupId and memberId are provided
         if (prefillData.groupId && prefillData.memberId) {
           loadMemberSlots(prefillData.memberId, prefillData.groupId)
         }
                    } else if (payment && isEditing) {
         // Set the form data with existing payment values
         setFormData({
           memberId: payment.memberId,
           groupId: payment.groupId,
           slotId: payment.slotId,
           paymentDate: payment.paymentDate,
           paymentMonth: payment.paymentMonth,
           amount: payment.amount,
           paymentMethod: payment.paymentMethod,
           status: payment.status,
           senderBankId: payment.senderBankId,
           receiverBankId: payment.receiverBankId,
           notes: payment.notes || ''
         })
         
         // Set the member data directly from the payment to avoid clearing
         if (payment.member) {
           // Use payment.memberId as the member ID since payment.member.id is undefined
           const memberId = payment.member.id || payment.memberId
           
           setGroupMembers([{
             id: Date.now() + Math.random(), // Generate temporary ID
             groupId: payment.groupId,
             memberId: payment.memberId,
             assignedMonthDate: '',
             member: {
               id: memberId, // Use the corrected member ID
               firstName: payment.member.firstName,
               lastName: payment.member.lastName,
               birthDate: '',
               birthplace: '',
               address: '',
               city: '',
               phone: '',
               email: '',
               nationalId: '',
               nationality: '',
               occupation: '',
               bankName: '',
               accountNumber: '',
               dateOfRegistration: '',
               totalReceived: 0,
               lastPayment: '',
               nextPayment: '',
               status: 'pending',
               notes: null,
               created_at: '',
               updated_at: ''
             },
             createdAt: new Date().toISOString()
           }])
         }
         
         // Load the existing slot data for this payment
         if (payment.slot) {
           setMemberSlots([{
             id: payment.slot.id,
             groupId: payment.slot.groupId,
             memberId: payment.slot.memberId,
             monthDate: payment.slot.monthDate,
             amount: payment.slot.amount,
             dueDate: payment.slot.dueDate,
             createdAt: payment.slot.createdAt
           }])
         }
         
         // Load cascading data for editing (but don't override existing data)
         // Groups and banks are already loaded in the initial data loading
       }
     }
   }, [isOpen, payment, isEditing, prefillData, workflow])

  // Re-filter groups and members when payment month changes
  useEffect(() => {
    if (groups.length > 0 && formData.paymentMonth) {
      const filtered = filterActiveGroups(groups, formData.paymentMonth)
      
      // Reload members for member-first and multi-group workflows with active groups
      if (workflow === 'member-first' || workflow === 'multi-group') {
        loadAllMembersWithGroups(filtered)
      }
    }
  }, [formData.paymentMonth])

  // Re-filter for multi-group workflow when its payment month changes
  useEffect(() => {
    if (workflow === 'multi-group' && groups.length > 0 && multiGroupPaymentInfo.paymentMonth) {
      filterActiveGroups(groups, multiGroupPaymentInfo.paymentMonth)
      
      // Reload member data if a member is already selected
      if (selectedMemberForMulti) {
        loadMemberForMulti(selectedMemberForMulti.memberId)
      }
    }
  }, [multiGroupPaymentInfo.paymentMonth])

  // Load all members after groups are loaded for member-first workflow
  // This useEffect is now handled by the initial data loading and paymentMonth change effect
  // which properly filters to only active groups
  useEffect(() => {
    if (workflow === 'member-first' && activeGroups.length > 0 && allMembers.length === 0) {
      loadAllMembersWithGroups(activeGroups)
    }
  }, [activeGroups, workflow])

   // Ensure amount is loaded whenever groupId changes
   useEffect(() => {
     if (formData.groupId && formData.groupId !== 0) {
       loadGroupMonthlyAmount(formData.groupId)
     }
   }, [formData.groupId])

   // Check for duplicate payment when form data changes
   useEffect(() => {
     const checkForDuplicates = async () => {
       if (formData.memberId && formData.groupId && formData.slotId && !isEditing) {
         try {
          // Check if a payment exists for this member, group, and slot for the current month
          const isDuplicate = await paymentService.checkDuplicatePayment(formData)
          if (isDuplicate) {
            setDuplicateWarning('⚠️ A payment for this member, group, and slot exists for the current month. Duplicate payments for the same month are not allowed.')
          } else {
            setDuplicateWarning('')
          }
         } catch (error) {
           console.error('Error checking for duplicates:', error)
           setDuplicateWarning('')
         }
       } else {
         setDuplicateWarning('')
       }
     }

     checkForDuplicates()
   }, [formData.memberId, formData.groupId, formData.slotId, isEditing])

   // Close dropdown when clicking outside (member-first workflow)
   useEffect(() => {
     const handleClickOutside = (event: MouseEvent) => {
       const target = event.target as Element
       if (!target.closest('.searchable-dropdown-container')) {
         setIsMemberDropdownOpen(false)
       }
     }

     if (isMemberDropdownOpen) {
       document.addEventListener('mousedown', handleClickOutside)
     }

     return () => {
       document.removeEventListener('mousedown', handleClickOutside)
     }
   }, [isMemberDropdownOpen])


     const loadGroupMembers = async (groupId: number) => {
    if (!groupId) return
    try {
      // Only load members if the group is active for the payment month
      if (!activeGroupIds.has(groupId)) {
        setGroupMembers([])
        return
      }
      
      const members = await paymentSlotService.getGroupMembers(groupId)
      setGroupMembers(members)
      // Clear member and slot selections when group changes
      setFormData(prev => ({
        ...prev,
        memberId: 0,
        slotId: '',
        amount: 0
      }))
      setMemberSlots([])
    } catch (error) {
      console.error('Failed to load group members:', error)
    }
  }

  const loadMemberSlots = async (memberId: number, groupId: number) => {
    if (!memberId || !groupId) return
    try {
      let slots
      
      // If we're editing an existing payment or have prefill data with a slotId, 
      // get existing slots from payment_slots table
      if (isEditing || (prefillData && prefillData.slotId)) {
        slots = await paymentSlotService.getMemberSlots(memberId, groupId)
      } else {
        // For new payments, get available month assignments from group_members table
        slots = await paymentSlotService.getAvailableMonthAssignments(memberId, groupId)
      }
      
             setMemberSlots(slots)
       // Clear slot selection when member changes, but keep the amount
       setFormData(prev => ({
         ...prev,
         slotId: ''
         // Don't reset amount - it should stay as the group's monthly amount
       }))
    } catch (error) {
      console.error('Failed to load member slots:', error)
      setMemberSlots([])
    }
  }

     const loadGroupMonthlyAmount = async (groupId: number) => {
     if (!groupId) return
     try {
       const amount = await paymentSlotService.getGroupMonthlyAmount(groupId)
       setFormData(prev => ({
         ...prev,
         amount
       }))
     } catch (error) {
       console.error('Failed to load group monthly amount:', error)
       // Set a default amount to prevent 0 from showing
       setFormData(prev => ({
         ...prev,
         amount: 0
       }))
     }
   }

  // Member-first workflow functions
  const loadAllMembersWithGroups = async (groupsData: Group[]) => {
    try {
      // Process all groups in parallel for better performance
      const groupPromises = groupsData.map(async (group) => {
        try {
          const members = await paymentSlotService.getGroupMembers(group.id)
          
          // Batch check: Get all member IDs and query their assignments in one go
          const memberIds = members.map(m => m.memberId)
          
          // Query all assignments for all members in this group at once
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .from('group_members')
            .select('member_id, assigned_month_date')
            .eq('group_id', group.id)
            .in('member_id', memberIds)
          
          if (assignmentsError) {
            console.error(`Failed to fetch assignments for group ${group.id}:`, assignmentsError)
            return []
          }
          
          // Create a map of member_id to whether they have assignments
          const memberHasSlots = new Map<number, boolean>()
          assignmentsData?.forEach((assignment: any) => {
            if (assignment.assigned_month_date) {
              memberHasSlots.set(assignment.member_id, true)
            }
          })
          
          // Filter members who have at least one assignment
          const validMembers = members
            .filter(member => memberHasSlots.get(member.memberId))
            .map(member => ({
              ...member,
              group: group,
              hasSlots: true
            }))
          
          return validMembers
        } catch (error) {
          console.error(`Failed to load members for group ${group.id}:`, error)
          return []
        }
      })
      
      const allGroupMembers = await Promise.all(groupPromises)
      const allMembersData = allGroupMembers.flat()
      
      setAllMembers(allMembersData)
    } catch (error) {
      console.error('Failed to load all members:', error)
    }
  }

  const loadMemberGroups = async (memberId: number) => {
    if (!memberId) return
    try {
      setIsLoadingMemberGroups(true)
      
      const memberEntries = allMembers.filter(member => member.memberId === memberId)
      
      const memberGroupsData = memberEntries.map(member => member.group)
      
      const groupMap = new Map()
      memberGroupsData.forEach(group => {
        if (!groupMap.has(group.id)) {
          groupMap.set(group.id, group)
        }
      })
      const uniqueGroups = Array.from(groupMap.values())
      
      // Filter to only show active groups for the payment month
      const activeGroupsForMember = uniqueGroups.filter(group => 
        isGroupActiveForMonth(group, formData.paymentMonth)
      )
      
      setMemberGroups(activeGroupsForMember)
      setFormData(prev => ({
        ...prev,
        groupId: 0,
        slotId: '',
        amount: 0
      }))
      setMemberSlots([])
    } catch (error) {
      console.error('Failed to load member groups:', error)
    } finally {
      setIsLoadingMemberGroups(false)
    }
  }

  // Filter members based on search term (memoized for performance)
  const filteredMembers = useMemo(() => {
    const matchingMembers = allMembers.filter(member => {
      const fullName = `${member.member.firstName} ${member.member.lastName}`.toLowerCase()
      return fullName.includes(memberSearchTerm.toLowerCase())
    })
    
    const memberMap = new Map()
    matchingMembers.forEach(member => {
      if (!memberMap.has(member.memberId)) {
        memberMap.set(member.memberId, member)
      }
    })
    
    return Array.from(memberMap.values())
  }, [allMembers, memberSearchTerm])

  const getMemberName = (memberId: number) => {
    const member = allMembers.find(m => m.memberId === memberId)
    return member ? `${member.member.firstName} ${member.member.lastName}` : 'Unknown Member'
  }

  const handleMemberSelect = (memberId: number) => {
    handleInputChange('memberId', memberId)
    setMemberSearchTerm('')
    setIsMemberDropdownOpen(false)
    setSelectedMemberIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isMemberDropdownOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedMemberIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedMemberIndex(prev => 
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedMemberIndex >= 0 && filteredMembers[selectedMemberIndex]) {
          handleMemberSelect(filteredMembers[selectedMemberIndex].memberId)
        }
        break
      case 'Escape':
        setIsMemberDropdownOpen(false)
        setSelectedMemberIndex(-1)
        break
    }
  }

  // Multi-group workflow functions
  const loadMemberForMulti = async (memberId: number) => {
    if (!memberId) return
    try {
      setIsLoadingMemberGroups(true)
      
      // Find member in allMembers data
      const memberEntries = allMembers.filter(member => member.memberId === memberId)
      
      const memberGroupsData = memberEntries.map(member => member.group)
      
      // Remove duplicates using Map
      const groupMap = new Map()
      memberGroupsData.forEach(group => {
        if (!groupMap.has(group.id)) {
          groupMap.set(group.id, group)
        }
      })
      const uniqueGroups = Array.from(groupMap.values())
      
      // Filter to only show active groups for the payment month
      const activeGroupsForMember = uniqueGroups.filter(group => 
        isGroupActiveForMonth(group, multiGroupPaymentInfo.paymentMonth)
      )
      
      setSelectedMemberForMulti(memberEntries[0]) // Use first entry for member info
      
      // Load slots and amounts for each active group
      const slotsPromises = activeGroupsForMember.map(async (group) => {
        try {
          const slots = await paymentSlotService.getAvailableMonthAssignments(memberId, group.id)
          const amount = await paymentSlotService.getGroupMonthlyAmount(group.id)
          return { groupId: group.id, groupName: group.name, slots, amount }
        } catch (error) {
          console.error(`Failed to load data for group ${group.id}:`, error)
          return { groupId: group.id, groupName: group.name, slots: [], amount: 0 }
        }
      })
      
      const groupData = await Promise.all(slotsPromises)
      
      // Create individual group/slot combinations
      const combinations: Array<{
        groupId: number
        groupName: string
        slotId: string
        slotMonth: string
        amount: number
        combinationKey: string
      }> = []
      
      groupData.forEach(({ groupId, groupName, slots, amount }) => {
        slots.forEach(slot => {
          // Format month for display
          const [year, month] = slot.monthDate.split('-').map(Number)
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const slotMonth = `${monthNames[month - 1]} ${year}`
          
          const combinationKey = `${groupId}-${slot.id}`
          
          combinations.push({
            groupId,
            groupName,
            slotId: String(slot.id),
            slotMonth,
            amount,
            combinationKey
          })
        })
      })
      
      setGroupSlotCombinations(combinations)
      
    } catch (error) {
      console.error('Failed to load member for multi-group:', error)
    } finally {
      setIsLoadingMemberGroups(false)
    }
  }

  const handleCombinationToggle = (combinationKey: string) => {
    const combination = groupSlotCombinations.find(c => c.combinationKey === combinationKey)
    if (!combination || !selectedMemberForMulti) return
    
    const paymentKey = `${selectedMemberForMulti.memberId}-${combination.groupId}-${combination.slotId}`
    const hasExistingPayment = existingPayments[paymentKey]
    
    // Don't allow selection if payment already exists
    if (hasExistingPayment) {
      return
    }
    
    const newSelectedCombinations = new Set(selectedCombinations)
    if (newSelectedCombinations.has(combinationKey)) {
      newSelectedCombinations.delete(combinationKey)
    } else {
      newSelectedCombinations.add(combinationKey)
      
      // Check for existing payment when combination is selected
      checkExistingPayment(selectedMemberForMulti.memberId, combination.groupId, combination.slotId)
    }
    setSelectedCombinations(newSelectedCombinations)
  }

  const handleSelectAllCombinations = () => {
    if (!selectedMemberForMulti) return
    
    // Get all combinations that don't have existing payments
    const availableCombinations = groupSlotCombinations.filter(combination => {
      const paymentKey = `${selectedMemberForMulti.memberId}-${combination.groupId}-${combination.slotId}`
      return !existingPayments[paymentKey]
    })
    
    // Check if all available combinations are already selected
    const allSelected = availableCombinations.every(combination => 
      selectedCombinations.has(combination.combinationKey)
    )
    
    if (allSelected) {
      // Deselect all
      setSelectedCombinations(new Set())
    } else {
      // Select all available combinations
      const newSelectedCombinations = new Set<string>()
      availableCombinations.forEach(combination => {
        newSelectedCombinations.add(combination.combinationKey)
        // Check for existing payment
        checkExistingPayment(selectedMemberForMulti.memberId, combination.groupId, combination.slotId)
      })
      setSelectedCombinations(newSelectedCombinations)
    }
  }

  const checkExistingPayment = async (memberId: number, groupId: number, slotId: string) => {
    try {
      const paymentKey = `${memberId}-${groupId}-${slotId}`
      
      // Check if we already have this payment checked
      if (existingPayments[paymentKey] !== undefined) {
        return
      }
      
      // Find the combination to get the slot month
      const combination = groupSlotCombinations.find(c => 
        c.groupId === groupId && c.slotId === slotId
      )
      
      if (!combination) return
      
      // Get current month for payment_month comparison
      const currentMonth = new Date().toISOString().substring(0, 7)
      
      // Parse the slot month back to YYYY-MM format for database query
      const [monthName, year] = combination.slotMonth.split(' ')
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthNumber = monthNames.indexOf(monthName) + 1
      const monthDate = `${year}-${monthNumber.toString().padStart(2, '0')}`
      
      // Check for existing payments for this member, group, and month using the same logic as other workflows
      // We need to join with payment_slots to get the month_date and check payment_month
      const { data: paymentResults, error } = await supabase
        .from('payments')
        .select(`
          id,
          payment_slots!inner(
            month_date
          )
        `)
        .eq('member_id', memberId)
        .eq('group_id', groupId)
        .eq('payment_slots.month_date', monthDate)
        .eq('payment_month', currentMonth)
      
      if (error) {
        console.error('Error querying payments:', error)
        setExistingPayments(prev => ({
          ...prev,
          [paymentKey]: false
        }))
        return
      }
      
      const hasExistingPayment = paymentResults && paymentResults.length > 0
      
      setExistingPayments(prev => ({
        ...prev,
        [paymentKey]: hasExistingPayment
      }))
      
      // If payment exists, remove it from selected combinations
      if (hasExistingPayment) {
        const combination = groupSlotCombinations.find(c => 
          c.groupId === groupId && c.slotId === slotId
        )
        if (combination) {
          setSelectedCombinations(prev => {
            const newSet = new Set(prev)
            newSet.delete(combination.combinationKey)
            return newSet
          })
        }
      }
      
    } catch (error) {
      console.error('Error checking existing payment:', error)
    }
  }

  const handleMultiGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedMemberForMulti || selectedCombinations.size === 0) {
      alert('Please select a member and at least one group/slot combination')
      return
    }

    // Validate bank information
    if (multiGroupPaymentInfo.paymentMethod === 'bank_transfer' && (!multiGroupPaymentInfo.senderBankId || !multiGroupPaymentInfo.receiverBankId)) {
      alert('Please select both sender and receiver banks')
      return
    }

    setIsLoading(true)
    try {
      // Create payments for each selected combination
      const payments = await Promise.all(Array.from(selectedCombinations).map(async (combinationKey) => {
        const combination = groupSlotCombinations.find(c => c.combinationKey === combinationKey)
        if (!combination) return null
        
        // Parse the slot month back to YYYY-MM format for database query
        const [monthName, year] = combination.slotMonth.split(' ')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthNumber = monthNames.indexOf(monthName) + 1
        const monthDate = `${year}-${monthNumber.toString().padStart(2, '0')}`
        
        try {
          // First check if the payment slot already exists
          const existingSlots = await paymentSlotService.getMemberSlots(selectedMemberForMulti.memberId, combination.groupId)
          const existingSlot = existingSlots.find(slot => slot.monthDate === monthDate)
          
          let slotId: number
          
          if (existingSlot) {
            // Use the existing slot ID
            slotId = existingSlot.id
          } else {
            // Create a new payment slot
            const newSlot = await paymentSlotService.createPaymentSlot({
              groupId: combination.groupId,
              memberId: selectedMemberForMulti.memberId,
              monthDate: monthDate,
              amount: combination.amount,
              dueDate: new Date().toISOString().split('T')[0] // Set to today's date as default
            })
            
            // Use the new slot ID
            slotId = newSlot.id
          }
          
          return {
            memberId: selectedMemberForMulti.memberId,
            groupId: combination.groupId,
            slotId: slotId,
            paymentDate: multiGroupPaymentInfo.paymentDate,
            paymentMonth: multiGroupPaymentInfo.paymentMonth,
            amount: combination.amount,
            paymentMethod: multiGroupPaymentInfo.paymentMethod,
            status: multiGroupPaymentInfo.status,
            senderBankId: multiGroupPaymentInfo.senderBankId,
            receiverBankId: multiGroupPaymentInfo.receiverBankId,
            notes: multiGroupPaymentInfo.notes || `Multi-group payment for ${selectedMemberForMulti.member.firstName} ${selectedMemberForMulti.member.lastName}`
          }
        } catch (error) {
          console.error('Failed to create payment slot for combination:', combinationKey, error)
          throw new Error(`Failed to create payment slot for ${combination.groupName} - ${combination.slotMonth}. Please try again.`)
        }
      }))

      // Save each payment
      for (const payment of payments) {
        if (payment) {
          await paymentService.createPayment(payment)
        }
      }
      
      // Reset multi-group state
      setSelectedMemberForMulti(null)
      setGroupSlotCombinations([])
      setSelectedCombinations(new Set())
      setExistingPayments({})
      setMultiGroupPaymentInfo({
        paymentDate: new Date().toLocaleDateString('en-CA'),
        paymentMonth: new Date().toISOString().substring(0, 7),
        paymentMethod: 'bank_transfer',
        status: 'pending',
        notes: ''
      })
      
      onClose()
      alert(`Successfully created ${payments.length} payments!`)
      
      // Call onSave to trigger parent component refresh
      // The parent component will handle the refresh logic
      if (onSave) {
        onSave({
          memberId: selectedMemberForMulti.memberId,
          groupId: 0, // Not applicable for multi-group
          slotId: '', // Not applicable for multi-group
          paymentDate: multiGroupPaymentInfo.paymentDate,
          paymentMonth: multiGroupPaymentInfo.paymentMonth,
          amount: 0, // Not applicable for multi-group
          paymentMethod: multiGroupPaymentInfo.paymentMethod,
          status: multiGroupPaymentInfo.status,
          senderBankId: multiGroupPaymentInfo.senderBankId,
          receiverBankId: multiGroupPaymentInfo.receiverBankId,
          notes: multiGroupPaymentInfo.notes
        })
      }
    } catch (error) {
      console.error('Failed to save multi-group payments:', error)
      alert('Failed to save payments. Please try again.')
    } finally {
      setIsLoading(false)
     }
   }

  const handleInputChange = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Sync with multi-group payment info when in multi-group workflow
    if (workflow === 'multi-group') {
      setMultiGroupPaymentInfo(prev => ({ ...prev, [field]: value }))
    }

    // Handle cascading updates based on workflow
    if (workflow === 'group-first') {
    if (field === 'groupId') {
      loadGroupMembers(value)
        loadGroupMonthlyAmount(value)
    } else if (field === 'memberId') {
      loadMemberSlots(value, formData.groupId)
    } else if (field === 'slotId') {
      // Amount is already set when group is selected
      }
    } else {
      // Member-first workflow
      if (field === 'memberId') {
        loadMemberGroups(value)
      } else if (field === 'groupId') {
        loadMemberSlots(formData.memberId, value)
        loadGroupMonthlyAmount(value)
      } else if (field === 'slotId') {
        // Amount is already set when group is selected
      }
    }
  }

       const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.groupId) newErrors.groupId = 'Group is required'
    if (!formData.memberId) newErrors.memberId = 'Member is required'
    if (!formData.slotId) newErrors.slotId = 'Slot is required'
    if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required'
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0'
    
    // Only validate payment method fields if status is not 'settled'
    if (formData.status !== 'settled') {
      if (formData.paymentMethod === 'bank_transfer') {
        if (!formData.senderBankId) newErrors.senderBankId = 'Sender bank is required for bank transfer'
        if (!formData.receiverBankId) newErrors.receiverBankId = 'Receiver bank is required for bank transfer'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

       const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user has permission to create/edit payments
    if (!canManagePayments) {
       alert('You do not have permission to create or edit payments. Only administrators can perform this action.');
       return;
     }
     
     if (!validateForm()) return

     setIsLoading(true)
     try {
       // If this is a new payment and we have a composite slot ID, we need to create a payment_slot first
       let finalFormData = { ...formData }
       
       if (!isEditing && typeof formData.slotId === 'string' && formData.slotId.includes('_')) {
         // This is a new payment with a composite slot ID, create the payment_slot first
         const [groupId, memberId, monthDate] = formData.slotId.split('_')
         
         try {
           // First check if the payment slot already exists
           const existingSlots = await paymentSlotService.getMemberSlots(parseInt(memberId), parseInt(groupId))
           const existingSlot = existingSlots.find(slot => slot.monthDate === monthDate)
           
           if (existingSlot) {
             // Use the existing slot ID
             finalFormData.slotId = existingSlot.id
           } else {
             // Create a new payment slot
             const newSlot = await paymentSlotService.createPaymentSlot({
               groupId: parseInt(groupId),
               memberId: parseInt(memberId),
               monthDate: monthDate,
               amount: formData.amount,
               dueDate: new Date().toISOString().split('T')[0] // Set to today's date as default
             })
             
             // Update the form data with the real slot ID
             finalFormData.slotId = newSlot.id
           }
         } catch (error) {
           console.error('Failed to create payment slot:', error)
           throw new Error('Failed to create payment slot. Please try again.')
         }
       } else if (isEditing && typeof formData.slotId === 'string') {
         // For edits: if slotId is a string, handle safely to avoid DB bigint errors
         const slotIdStr = formData.slotId.trim()
         if (/^\d+$/.test(slotIdStr)) {
           // Coerce numeric string to number
           ;(finalFormData as any).slotId = Number(slotIdStr)
         } else if (slotIdStr.includes('_')) {
           // Handle composite format during edit as well (resolve/create real slot)
           const [groupId, memberId, monthDate] = slotIdStr.split('_')
           try {
             const existingSlots = await paymentSlotService.getMemberSlots(parseInt(memberId), parseInt(groupId))
             const existingSlot = existingSlots.find(slot => slot.monthDate === monthDate)
             if (existingSlot) {
               ;(finalFormData as any).slotId = existingSlot.id
             } else {
               const newSlot = await paymentSlotService.createPaymentSlot({
                 groupId: parseInt(groupId),
                 memberId: parseInt(memberId),
                 monthDate: monthDate,
                 amount: formData.amount,
                 dueDate: new Date().toISOString().split('T')[0]
               })
               ;(finalFormData as any).slotId = newSlot.id
             }
           } catch (error) {
             console.error('Failed to resolve slot during edit:', error)
             // If resolution fails, do not send slotId to avoid 400
             delete (finalFormData as any).slotId
           }
         } else {
           // Unknown non-numeric format like "10-2025": do not send slotId in update
           delete (finalFormData as any).slotId
         }
       }
       
       await onSave(finalFormData)
       onClose()
     } catch (error) {
       console.error('Failed to save payment:', error)
     } finally {
       setIsLoading(false)
     }
   }

     const handleGroupChange = async (groupId: number) => {
     handleInputChange('groupId', groupId)
     // Load the monthly amount immediately when group changes
     await loadGroupMonthlyAmount(groupId)
   }

  if (!isOpen) return null

  return (
    <div className="payment-modal-overlay">
      {/* Loading Overlay */}
      {(isInitialLoading || isLoadingMemberGroups || isWorkflowLoading) && (
        <div className="payment-modal-loading-overlay">
          <div className="payment-modal-loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <p className="payment-modal-loading-text">
            {isInitialLoading ? 'Loading payment data...' : 
             isWorkflowLoading ? 'Loading member data...' : 
             'Loading member groups...'}
          </p>
        </div>
      )}
      
      
      <div className="payment-modal-content payment-modal-container">
        <div className="payment-modal-header">
          <h2>
            {isEditing ? 'Edit Payment' : 'Record New Payment'}
            {workflow === 'member-first' && (
              <span className="workflow-indicator"> - Member First</span>
            )}
          </h2>
          <button className="payment-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={workflow === 'multi-group' ? handleMultiGroupSubmit : handleSubmit} className="payment-modal-form">
          {/* Workflow Selection */}
          <div className="workflow-selection-section">
            <label htmlFor="workflowSelect">
              <Building2 size={16} />
              Payment Workflow *
            </label>
            <select
              id="workflowSelect"
              value={workflow}
              onChange={(e) => {
                const newWorkflow = e.target.value as 'group-first' | 'member-first' | 'multi-group'
                
                // Notify parent component of workflow change
                if (onWorkflowChange) {
                  onWorkflowChange(newWorkflow)
                }
                
                // Reset form data when switching workflows
                setFormData({
                  memberId: 0,
                  groupId: 0,
                  slotId: '',
                  paymentDate: new Date().toLocaleDateString('en-CA'),
                  paymentMonth: new Date().toISOString().substring(0, 7),
                  amount: 0,
                  paymentMethod: 'bank_transfer',
                  status: 'pending',
                  senderBankId: undefined,
                  receiverBankId: undefined,
                  notes: ''
                })
                
                // Clear dependent data
                setGroupMembers([])
                setMemberGroups([])
                setMemberSlots([])
                setErrors({})
                setMemberSearchTerm('')
                setIsMemberDropdownOpen(false)
                setSelectedMemberIndex(-1)
                
                // Reset multi-group specific state
                setSelectedMemberForMulti(null)
                setGroupSlotCombinations([])
                setSelectedCombinations(new Set())
                setExistingPayments({})
                setMultiGroupPaymentInfo({
        paymentDate: new Date().toLocaleDateString('en-CA'),
        paymentMonth: new Date().toISOString().substring(0, 7),
        paymentMethod: 'bank_transfer',
        status: 'pending',
        notes: ''
      })
                
                // Update workflow
                if (newWorkflow === 'member-first' || newWorkflow === 'multi-group') {
                  setIsWorkflowLoading(true)
                  loadAllMembersWithGroups(groups).finally(() => {
                    setIsWorkflowLoading(false)
                  })
                }
              }}
              className="workflow-dropdown"
            >
              <option value="group-first">
                Group First - Select group, then member, then slot
              </option>
              <option value="member-first">
                Member First - Select member, then group, then slot
              </option>
              <option value="multi-group">
                Multi-Group - Select member, then multiple groups
              </option>
            </select>
            <small className="payment-modal-form-help">
              Choose how you want to record the payment
            </small>
          </div>

          {/* Group-First Workflow */}
          {workflow === 'group-first' && (
            <>
          {/* Group Selection */}
          <div className="payment-modal-form-group">
            <label htmlFor="groupId">
              <Building2 size={16} />
              Group *
            </label>
            <select
              id="groupId"
              value={formData.groupId}
              onChange={(e) => handleGroupChange(Number(e.target.value))}
              className={errors.groupId ? 'error' : ''}
            >
              <option value={0}>Select a group</option>
              {activeGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {errors.groupId && <span className="payment-modal-error-message">{errors.groupId}</span>}
            <small className="payment-modal-form-help">
              Showing only active groups for {formData.paymentMonth}
            </small>
          </div>

                     {/* Member Selection */}
           <div className="payment-modal-form-group">
             <label htmlFor="memberId">
               <User size={16} />
               Group Member *
             </label>
             <select
               id="memberId"
               value={formData.memberId || ''}
               onChange={(e) => handleInputChange('memberId', Number(e.target.value))}
               disabled={!formData.groupId}
               className={errors.memberId ? 'error' : ''}
             >
               <option value="">Select a member</option>
               {groupMembers.map((member, index) => (
                 <option key={`member-${member.groupId}-${member.memberId}-${index}`} value={member.memberId}>
                   {member.member.firstName} {member.member.lastName}
                 </option>
               ))}
             </select>
             {errors.memberId && <span className="payment-modal-error-message">{errors.memberId}</span>}
             <small className="payment-modal-form-help">
                  Available members: {groupMembers.length}
             </small>
           </div>
            </>
          )}

          {/* Member-First Workflow */}
          {workflow === 'member-first' && (
            <>
              {/* Member Selection - Searchable Dropdown */}
              <div className="payment-modal-form-group">
                <label htmlFor="memberSearch">
                  <User size={16} />
                  Member *
                </label>
                <div className="searchable-dropdown-container">
                  <input
                    type="text"
                    id="memberSearch"
                    value={memberSearchTerm || (formData.memberId ? getMemberName(formData.memberId) : '')}
                    onChange={(e) => {
                      setMemberSearchTerm(e.target.value)
                      setIsMemberDropdownOpen(true)
                      setSelectedMemberIndex(-1)
                      if (e.target.value === '') {
                        handleInputChange('memberId', 0)
                      }
                    }}
                    onFocus={() => setIsMemberDropdownOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for a member..."
                    className={`searchable-dropdown-input ${errors.memberId ? 'error' : ''}`}
                    autoComplete="off"
                  />
                  {isMemberDropdownOpen && (
                    <div className="searchable-dropdown-list">
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((member, index) => (
                          <div
                            key={`member-${member.memberId}-${index}`}
                            className={`searchable-dropdown-item ${index === selectedMemberIndex ? 'selected' : ''}`}
                            onClick={() => handleMemberSelect(member.memberId)}
                          >
                            <div className="member-name">
                              {member.member.firstName} {member.member.lastName}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="searchable-dropdown-no-results">
                          No members found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {errors.memberId && <span className="payment-modal-error-message">{errors.memberId}</span>}
                <small className="payment-modal-form-help">
                  Available members: {allMembers.length} | Showing: {filteredMembers.length}
                </small>
              </div>

              {/* Group Selection */}
              <div className="payment-modal-form-group">
                <label htmlFor="groupId">
                  <Building2 size={16} />
                  Available Groups *
                </label>
                <select
                  id="groupId"
                  value={formData.groupId}
                  onChange={(e) => handleInputChange('groupId', Number(e.target.value))}
                  disabled={!formData.memberId || isLoadingMemberGroups}
                  className={errors.groupId ? 'error' : ''}
                >
                  <option value={0}>
                    {isLoadingMemberGroups ? 'Loading groups...' : 'Select a group'}
                  </option>
                  {memberGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {errors.groupId && <span className="payment-modal-error-message">{errors.groupId}</span>}
                <small className="payment-modal-form-help">
                  {isLoadingMemberGroups 
                    ? 'Loading available groups...' 
                    : `Showing only active groups for ${formData.paymentMonth} (${memberGroups.length} available)`
                  }
                </small>
              </div>
            </>
          )}

          {/* Multi-Group Workflow */}
          {workflow === 'multi-group' && (
            <>
              {/* Member Selection for Multi-Group */}
              <div className="payment-modal-form-group">
                <label htmlFor="memberSearchMulti">
                  <User size={16} />
                  Select Member *
                </label>
                <div className="searchable-dropdown-container">
                  <input
                    type="text"
                    id="memberSearchMulti"
                    value={memberSearchTerm || (selectedMemberForMulti ? `${selectedMemberForMulti.member.firstName} ${selectedMemberForMulti.member.lastName}` : '')}
                    onChange={(e) => {
                      setMemberSearchTerm(e.target.value)
                      setIsMemberDropdownOpen(true)
                      setSelectedMemberIndex(-1)
                      if (e.target.value === '') {
                        setSelectedMemberForMulti(null)
                        setGroupSlotCombinations([])
                        setSelectedCombinations(new Set())
                        setExistingPayments({})
                        setMultiGroupPaymentInfo({
        paymentDate: new Date().toLocaleDateString('en-CA'),
        paymentMonth: new Date().toISOString().substring(0, 7),
        paymentMethod: 'bank_transfer',
        status: 'pending',
        notes: ''
      })
                      }
                    }}
                    onFocus={() => setIsMemberDropdownOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for a member..."
                    className={`searchable-dropdown-input ${!selectedMemberForMulti ? 'error' : ''}`}
                    autoComplete="off"
                  />
                  {isMemberDropdownOpen && (
                    <div className="searchable-dropdown-list">
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((member, index) => (
                          <div
                            key={`member-multi-${member.memberId}-${index}`}
                            className={`searchable-dropdown-item ${index === selectedMemberIndex ? 'selected' : ''}`}
                            onClick={() => {
                              handleMemberSelect(member.memberId)
                              loadMemberForMulti(member.memberId)
                            }}
                          >
                            <div className="member-name">
                              {member.member.firstName} {member.member.lastName}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="searchable-dropdown-no-results">
                          No members found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <small className="payment-modal-form-help">
                  Select a member to see their active groups for {multiGroupPaymentInfo.paymentMonth}
                </small>
              </div>

              {/* Group/Slot Combinations for Multi-Group */}
              {selectedMemberForMulti && (
                <div className="payment-modal-form-group full-width">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0 }}>
                      <Building2 size={16} />
                      Select Group/Slot Combinations to Pay For *
                    </label>
                    {!isLoadingMemberGroups && groupSlotCombinations.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllCombinations}
                        className="payment-modal-btn payment-modal-btn-secondary"
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '13px',
                          marginLeft: '10px'
                        }}
                      >
                        {groupSlotCombinations.filter(combination => {
                          const paymentKey = selectedMemberForMulti ? `${selectedMemberForMulti.memberId}-${combination.groupId}-${combination.slotId}` : ''
                          return !existingPayments[paymentKey]
                        }).every(combination => selectedCombinations.has(combination.combinationKey))
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    )}
                  </div>
                  {isLoadingMemberGroups ? (
                    <div className="payment-modal-loading">Loading combinations...</div>
                  ) : (
                    <div className="multi-group-selection">
                      {groupSlotCombinations.length === 0 ? (
                        <div className="multi-group-no-combinations">
                          No available group/slot combinations for this member
                        </div>
                      ) : (
                        groupSlotCombinations.map(combination => {
                          const isSelected = selectedCombinations.has(combination.combinationKey)
                          const paymentKey = selectedMemberForMulti ? `${selectedMemberForMulti.memberId}-${combination.groupId}-${combination.slotId}` : ''
                          const hasExistingPayment = paymentKey ? existingPayments[paymentKey] : false
                          
                          return (
                            <div key={combination.combinationKey} className={`multi-group-item ${isSelected ? 'selected' : ''} ${hasExistingPayment ? 'has-existing-payment' : ''}`}>
                              <div className="multi-group-main-row">
                                <label className="multi-group-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleCombinationToggle(combination.combinationKey)}
                                    disabled={hasExistingPayment}
                                  />
                                  <span className="multi-group-info">
                                    <span className="multi-group-name">{combination.groupName}</span>
                                    <span className="multi-group-slot">{combination.slotMonth}</span>
                                    <span className="multi-group-amount">SRD {combination.amount.toLocaleString()}</span>
                                  </span>
                                </label>
                              </div>
                              
                              {hasExistingPayment && (
                                <div className="multi-group-existing-payment-warning">
                                  ⚠️ Payment already exists for this member, group, and slot combination
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                  <small className="payment-modal-form-help">
                    {selectedCombinations.size > 0 
                      ? `Selected ${selectedCombinations.size} combination(s)`
                      : 'Select one or more group/slot combinations to pay for'
                    }
                  </small>
                </div>
              )}

            </>
          )}

                     {/* Slot Selection - Hidden for multi-group */}
           {workflow !== 'multi-group' && (
           <div className="payment-modal-form-group">
             <label htmlFor="slotId">
               <Calendar size={16} />
               Slot (Month-Year) *
             </label>
             <select
               id="slotId"
               value={formData.slotId || ''}
               onChange={(e) => handleInputChange('slotId', e.target.value)}
               disabled={!formData.memberId}
               className={errors.slotId ? 'error' : ''}
             >
               <option value="">Select a slot</option>
               {memberSlots.map(slot => (
                 <option key={`slot-${slot.id}`} value={slot.id}>
                   {paymentSlotService.formatMonthDate(slot.monthDate)}
                 </option>
               ))}
             </select>
             {errors.slotId && <span className="payment-modal-error-message">{errors.slotId}</span>}
             <small className="payment-modal-form-help">Available slots: {memberSlots.length}</small>
           </div>
           )}

          {/* Amount (Read-only) - Hidden for multi-group */}
          {workflow !== 'multi-group' && (
          <div className="payment-modal-form-group">
            <label htmlFor="amount">
              <DollarSign size={16} />
              Amount *
            </label>
            <input
              type="text"
              id="amount"
              value={`SRD ${formData.amount.toLocaleString()}`}
              readOnly
              className="payment-modal-readonly"
            />
            <small className="payment-modal-form-help">Amount is locked to group's monthly amount</small>
          </div>
          )}

          {/* Payment Date */}
          <div className="payment-modal-form-group">
            <label htmlFor="paymentDate">
              <Calendar size={16} />
              Payment Date *
            </label>
            <input
              type="date"
              id="paymentDate"
              value={workflow === 'multi-group' ? multiGroupPaymentInfo.paymentDate : formData.paymentDate}
              onChange={(e) => {
                if (workflow === 'multi-group') {
                  setMultiGroupPaymentInfo(prev => ({ ...prev, paymentDate: e.target.value }))
                } else {
                  handleInputChange('paymentDate', e.target.value)
                }
              }}
              max={new Date().toISOString().split('T')[0]}
              className={errors.paymentDate ? 'error' : ''}
            />
            {errors.paymentDate && <span className="payment-modal-error-message">{errors.paymentDate}</span>}
          </div>

          {/* Payment Month (YYYY-MM) */}
          <div className="payment-modal-form-group">
            <label htmlFor="paymentMonth">
              <Calendar size={16} />
              Payment Month
            </label>
            <input
              type="month"
              id="paymentMonth"
              value={workflow === 'multi-group' ? multiGroupPaymentInfo.paymentMonth : formData.paymentMonth}
              onChange={(e) => {
                if (workflow === 'multi-group') {
                  setMultiGroupPaymentInfo(prev => ({ ...prev, paymentMonth: e.target.value }))
                } else {
                  handleInputChange('paymentMonth', e.target.value)
                }
              }}
            />
            <small className="payment-modal-form-help">
              {workflow === 'multi-group' 
                ? 'Changes will filter available groups and members' 
                : 'Defaults to current month. Editable.'}
            </small>
          </div>

          {/* Payment Method Toggle */}
          <div className="payment-modal-form-group full-width">
            <label>
              Payment Method 
              {formData.status !== 'settled' && <span className="required-asterisk">*</span>}
            </label>
            <div className="payment-modal-method-toggle">
              <button
                type="button"
                className={`payment-modal-toggle-option ${formData.paymentMethod === 'bank_transfer' ? 'active' : ''}`}
                onClick={() => handleInputChange('paymentMethod', 'bank_transfer')}
              >
                <CreditCard size={16} />
                Bank Transfer
              </button>
              <button
                type="button"
                className={`payment-modal-toggle-option ${formData.paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => handleInputChange('paymentMethod', 'cash')}
              >
                <Banknote size={16} />
                Cash
              </button>
            </div>
            {formData.status === 'settled' && (
              <small className="payment-modal-form-help">
                Payment Method is optional when status is set to "Settled"
              </small>
            )}
            {formData.status === 'settled' && formData.paymentMethod === 'bank_transfer' && (
              <small className="payment-modal-form-help">
                Bank details are optional when status is "Settled"
              </small>
            )}
          </div>

          {/* Bank Selection Fields (only visible for bank transfer) */}
          {formData.paymentMethod === 'bank_transfer' && (
            <>
              <div className="payment-modal-form-group">
                <label htmlFor="senderBankId">
                  <CreditCard size={16} />
                  Sender's Bank 
                  {formData.status !== 'settled' && <span className="required-asterisk">*</span>}
                </label>
                <select
                  id="senderBankId"
                  value={formData.senderBankId || ''}
                  onChange={(e) => handleInputChange('senderBankId', Number(e.target.value) || undefined)}
                  className={errors.senderBankId ? 'error' : ''}
                >
                  <option value="">Select sender's bank</option>
                  {banks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                {errors.senderBankId && <span className="payment-modal-error-message">{errors.senderBankId}</span>}
              </div>

              <div className="payment-modal-form-group">
                <label htmlFor="receiverBankId">
                  <CreditCard size={16} />
                  Receiver's Bank 
                  {formData.status !== 'settled' && <span className="required-asterisk">*</span>}
                </label>
                <select
                  id="receiverBankId"
                  value={formData.receiverBankId || ''}
                  onChange={(e) => handleInputChange('receiverBankId', Number(e.target.value) || undefined)}
                  className={errors.receiverBankId ? 'error' : ''}
                >
                  <option value="">Select receiver's bank</option>
                  {banks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                {errors.receiverBankId && <span className="payment-modal-error-message">{errors.receiverBankId}</span>}
              </div>
            </>
          )}

          {/* Status Selection */}
          <div className="payment-modal-form-group">
            <label htmlFor="status">Status *</label>
            <select
              id="status"
              value={formData.status || 'pending'}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              <option value="not_paid">Not Paid</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="settled">Settled</option>
            </select>
          </div>

          {/* Notes */}
          <div className="payment-modal-form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              placeholder="Add any additional notes..."
            />
          </div>

                     {/* Duplicate Payment Warning */}
           {duplicateWarning && (
             <div className="payment-modal-duplicate-warning full-width">
               <p>{duplicateWarning}</p>
             </div>
           )}

           {/* Permission Warning */}
           {!canManagePayments && (
             <div className="payment-modal-permission-warning full-width">
               <p>⚠️ Only administrators can create or edit payments. You have view-only access.</p>
             </div>
           )}

           {/* Form Actions */}
           <div className="payment-modal-form-actions">
             <div className="payment-modal-actions-left">
               {workflow === 'multi-group' && selectedCombinations.size > 0 && (
                 <div className="payment-modal-total-amount">
                   <span className="total-label">Total:</span>
                   <span className="total-amount">
                     SRD {Array.from(selectedCombinations)
                       .map(combinationKey => {
                         const combination = groupSlotCombinations.find(c => c.combinationKey === combinationKey)
                         return combination ? combination.amount : 0
                       })
                       .reduce((sum, amount) => sum + amount, 0)
                       .toLocaleString()}
                   </span>
                 </div>
               )}
             </div>
             <div className="payment-modal-actions-right">
             <button type="button" className="payment-modal-btn payment-modal-btn-secondary" onClick={onClose}>
               Cancel
             </button>
             <button 
               type="submit" 
               className="payment-modal-btn" 
               disabled={isLoading || !!duplicateWarning || !canManagePayments}
             >
                              {isLoading ? 'Saving...' : (isEditing ? 'Update Payment' : 'Record Payment')}
             </button>
             </div>
           </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentModal
