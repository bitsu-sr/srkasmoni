import { useState, useEffect, useMemo } from 'react'
import { Plus, X, User, Building2, Calendar, DollarSign, CreditCard, Banknote, Users } from 'lucide-react'
import type { PaymentFormData } from '../types/payment'
import type { Group } from '../types/member'
import type { Bank } from '../types/bank'
import type { GroupMember, PaymentSlot } from '../types/paymentSlot'
import { paymentSlotService } from '../services/paymentSlotService'
import { groupService } from '../services/groupService'
import { bankService } from '../services/bankService'
import './PaymentModalTest.css'

interface TestPaymentData {
  id: string
  formData: PaymentFormData
  timestamp: string
  status: 'draft' | 'saved'
}

const PaymentModalTest = () => {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalVariant, setModalVariant] = useState<'group-first' | 'member-first' | 'multi-group'>('member-first')
  
  // Form data
  const [formData, setFormData] = useState<PaymentFormData>({
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

  // Data state
  const [groups, setGroups] = useState<Group[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [memberSlots, setMemberSlots] = useState<PaymentSlot[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [allMembers, setAllMembers] = useState<any[]>([]) // For member-first variant
  const [memberGroups, setMemberGroups] = useState<Group[]>([]) // For member-first variant
  
  // Multi-group modal state
  const [selectedMemberForMulti, setSelectedMemberForMulti] = useState<any>(null)
  const [memberGroupsForMulti, setMemberGroupsForMulti] = useState<Group[]>([])
  const [selectedGroupsForMulti, setSelectedGroupsForMulti] = useState<Set<number>>(new Set())
  const [groupSlotsForMulti, setGroupSlotsForMulti] = useState<Record<number, PaymentSlot[]>>({})
  const [selectedSlotsForMulti, setSelectedSlotsForMulti] = useState<Record<number, string>>({})
  const [groupAmountsForMulti, setGroupAmountsForMulti] = useState<Record<number, number>>({})
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [memberSearchTerm, setMemberSearchTerm] = useState('')
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false)
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(-1)
  const [isLoadingMemberGroups, setIsLoadingMemberGroups] = useState(false)
  
  // Local storage state
  const [savedPayments, setSavedPayments] = useState<TestPaymentData[]>([])

  // Load initial data
  useEffect(() => {
    loadGroups()
    loadBanks()
    loadSavedPayments()
  }, [])

  // Load all members after groups are loaded
  useEffect(() => {
    if (groups.length > 0) {
      loadAllMembers()
    }
  }, [groups])

  // Close dropdown when clicking outside
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

  // Load saved payments from localStorage
  const loadSavedPayments = () => {
    try {
      const saved = localStorage.getItem('test-payments')
      if (saved) {
        setSavedPayments(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading saved payments:', error)
    }
  }

  // Save payment to localStorage
  const savePaymentToLocal = (paymentData: PaymentFormData) => {
    const testPayment: TestPaymentData = {
      id: `test-${Date.now()}`,
      formData: paymentData,
      timestamp: new Date().toISOString(),
      status: 'saved'
    }
    
    const updatedPayments = [...savedPayments, testPayment]
    setSavedPayments(updatedPayments)
    localStorage.setItem('test-payments', JSON.stringify(updatedPayments))
  }

  // Clear all saved payments
  const clearSavedPayments = () => {
    setSavedPayments([])
    localStorage.removeItem('test-payments')
  }

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

  const loadAllMembers = async () => {
    try {
      console.log('Loading all members for groups:', groups)
      // Load all members across all groups for member-first variant
      const allMembersData = []
      
      for (const group of groups) {
        console.log(`Loading members for group: ${group.name} (ID: ${group.id})`)
        const members = await paymentSlotService.getGroupMembers(group.id)
        console.log(`Found ${members.length} members in group ${group.name}`)
        
        // Include ALL members, even if they appear in multiple groups
        const membersWithGroup = members.map(member => ({
          ...member,
          group: group
        }))
        allMembersData.push(...membersWithGroup)
      }
      console.log(`Total member-group entries loaded: ${allMembersData.length}`)
      setAllMembers(allMembersData)
    } catch (error) {
      console.error('Failed to load all members:', error)
    }
  }

  const loadGroupMembers = async (groupId: number) => {
    if (!groupId) return
    try {
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

  const loadMemberGroups = async (memberId: number) => {
    if (!memberId) return
    try {
      setIsLoadingMemberGroups(true)
      console.log(`Loading groups for member ID: ${memberId}`)
      const startTime = performance.now()
      
      // Use the already loaded allMembers data to find groups for this member
      const memberEntries = allMembers.filter(member => member.memberId === memberId)
      console.log(`Found ${memberEntries.length} entries for member ${memberId}`)
      console.log('Member entries:', memberEntries.map(m => ({ memberId: m.memberId, groupId: m.group.id, groupName: m.group.name })))
      
      const memberGroupsData = memberEntries.map(member => member.group)
      
      // Remove duplicates using Map for better performance and reliability
      const groupMap = new Map()
      memberGroupsData.forEach(group => {
        if (!groupMap.has(group.id)) {
          groupMap.set(group.id, group)
        }
      })
      const uniqueGroups = Array.from(groupMap.values())
      
      const endTime = performance.now()
      console.log(`Found ${uniqueGroups.length} unique groups for member in ${(endTime - startTime).toFixed(2)}ms`)
      console.log('Groups found:', uniqueGroups.map(g => g.name))
      
      setMemberGroups(uniqueGroups)
      // Clear group and slot selections when member changes
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

  const loadMemberSlots = async (memberId: number, groupId: number) => {
    if (!memberId || !groupId) return
    try {
      const slots = await paymentSlotService.getAvailableMonthAssignments(memberId, groupId)
      setMemberSlots(slots)
      // Clear slot selection when member changes, but keep the amount
      setFormData(prev => ({
        ...prev,
        slotId: ''
      }))
    } catch (error) {
      console.error('Failed to load member slots:', error)
      setMemberSlots([])
    }
  }

  // Multi-group modal functions
  const loadMemberForMulti = async (memberId: number) => {
    if (!memberId) return
    try {
      setIsLoadingMemberGroups(true)
      const startTime = performance.now()
      
      // Find member in allMembers data
      const memberEntries = allMembers.filter(member => member.memberId === memberId)
      console.log(`Found ${memberEntries.length} entries for member ${memberId}`)
      
      const memberGroupsData = memberEntries.map(member => member.group)
      
      // Remove duplicates using Map
      const groupMap = new Map()
      memberGroupsData.forEach(group => {
        if (!groupMap.has(group.id)) {
          groupMap.set(group.id, group)
        }
      })
      const uniqueGroups = Array.from(groupMap.values())
      
      const endTime = performance.now()
      console.log(`Found ${uniqueGroups.length} unique groups for member in ${(endTime - startTime).toFixed(2)}ms`)
      
      setMemberGroupsForMulti(uniqueGroups)
      setSelectedMemberForMulti(memberEntries[0]) // Use first entry for member info
      
      // Load slots and amounts for each group
      const slotsPromises = uniqueGroups.map(async (group) => {
        try {
          const slots = await paymentSlotService.getAvailableMonthAssignments(memberId, group.id)
          const amount = await paymentSlotService.getGroupMonthlyAmount(group.id)
          return { groupId: group.id, slots, amount }
        } catch (error) {
          console.error(`Failed to load data for group ${group.id}:`, error)
          return { groupId: group.id, slots: [], amount: 0 }
        }
      })
      
      const groupData = await Promise.all(slotsPromises)
      
      const slotsData: Record<number, PaymentSlot[]> = {}
      const amountsData: Record<number, number> = {}
      
      groupData.forEach(({ groupId, slots, amount }) => {
        slotsData[groupId] = slots
        amountsData[groupId] = amount
      })
      
      setGroupSlotsForMulti(slotsData)
      setGroupAmountsForMulti(amountsData)
      
    } catch (error) {
      console.error('Failed to load member for multi-group:', error)
    } finally {
      setIsLoadingMemberGroups(false)
    }
  }

  const handleGroupToggleForMulti = (groupId: number) => {
    const newSelectedGroups = new Set(selectedGroupsForMulti)
    if (newSelectedGroups.has(groupId)) {
      newSelectedGroups.delete(groupId)
      // Clear slot selection for this group
      const newSelectedSlots = { ...selectedSlotsForMulti }
      delete newSelectedSlots[groupId]
      setSelectedSlotsForMulti(newSelectedSlots)
    } else {
      newSelectedGroups.add(groupId)
    }
    setSelectedGroupsForMulti(newSelectedGroups)
  }

  const handleSlotChangeForMulti = (groupId: number, slotId: string) => {
    setSelectedSlotsForMulti(prev => ({
      ...prev,
      [groupId]: slotId
    }))
  }

  const loadGroupMonthlyAmount = async (groupId: number) => {
    if (!groupId) return
    try {
      console.log(`Loading monthly amount for group ID: ${groupId}`)
      const amount = await paymentSlotService.getGroupMonthlyAmount(groupId)
      console.log(`Loaded amount: ${amount}`)
      setFormData(prev => ({
        ...prev,
        amount
      }))
    } catch (error) {
      console.error('Failed to load group monthly amount:', error)
      setFormData(prev => ({
        ...prev,
        amount: 0
      }))
    }
  }


  const handleInputChange = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Handle cascading updates based on variant
    if (modalVariant === 'group-first') {
      if (field === 'groupId') {
        loadGroupMembers(value)
        loadGroupMonthlyAmount(value)
      } else if (field === 'memberId') {
        loadMemberSlots(value, formData.groupId)
      }
    } else {
      if (field === 'memberId') {
        loadMemberGroups(value)
      } else if (field === 'groupId') {
        console.log(`Member-first variant: Group selected - ID: ${value}, Member ID: ${formData.memberId}`)
        loadMemberSlots(formData.memberId, value)
        loadGroupMonthlyAmount(value)
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
    
    if (!validateForm()) return

    setIsLoading(true)
    try {
      // Save to local storage instead of database
      savePaymentToLocal(formData)
      
      // Reset form
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
      
      setIsModalOpen(false)
      alert('Payment saved to local storage successfully!')
    } catch (error) {
      console.error('Failed to save payment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMultiGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedMemberForMulti || selectedGroupsForMulti.size === 0) {
      alert('Please select a member and at least one group')
      return
    }

    // Validate that all selected groups have slots selected
    const missingSlots = Array.from(selectedGroupsForMulti).filter(groupId => !selectedSlotsForMulti[groupId])
    if (missingSlots.length > 0) {
      alert('Please select slots for all selected groups')
      return
    }

    setIsLoading(true)
    try {
      // Create payments for each selected group
      const payments = Array.from(selectedGroupsForMulti).map(groupId => {
        const amount = groupAmountsForMulti[groupId] || 0
        
        return {
          memberId: selectedMemberForMulti.memberId,
          groupId: groupId,
          slotId: selectedSlotsForMulti[groupId],
          paymentDate: new Date().toLocaleDateString('en-CA'),
          paymentMonth: new Date().toISOString().substring(0, 7),
          amount: amount,
          paymentMethod: 'bank_transfer' as const,
          status: 'pending' as const,
          senderBankId: undefined,
          receiverBankId: undefined,
          notes: `Multi-group payment for ${selectedMemberForMulti.memberName}`
        }
      })

      // Save each payment to local storage
      payments.forEach(payment => {
        savePaymentToLocal(payment)
      })
      
      // Reset multi-group state
      setSelectedMemberForMulti(null)
      setMemberGroupsForMulti([])
      setSelectedGroupsForMulti(new Set())
      setGroupSlotsForMulti({})
      setSelectedSlotsForMulti({})
      setGroupAmountsForMulti({})
      
      setIsModalOpen(false)
      alert(`Successfully saved ${payments.length} payments to local storage!`)
    } catch (error) {
      console.error('Failed to save multi-group payments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const openModal = () => {
    console.log('Opening modal with current variant:', modalVariant)
    console.log('Groups available:', groups.length)
    console.log('All members available:', allMembers.length)
    
    setIsModalOpen(true)
    
    // Reset form data
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
    setMemberGroupsForMulti([])
    setSelectedGroupsForMulti(new Set())
    setGroupSlotsForMulti({})
    setSelectedSlotsForMulti({})
    setGroupAmountsForMulti({})
  }

  const handleWorkflowChange = (newWorkflow: 'group-first' | 'member-first' | 'multi-group') => {
    console.log(`Switching workflow from ${modalVariant} to ${newWorkflow}`)
    setModalVariant(newWorkflow)
    
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
    setMemberGroupsForMulti([])
    setSelectedGroupsForMulti(new Set())
    setGroupSlotsForMulti({})
    setSelectedSlotsForMulti({})
    setGroupAmountsForMulti({})
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const getMemberName = (memberId: number) => {
    const member = allMembers.find(m => m.memberId === memberId)
    return member ? `${member.member.firstName} ${member.member.lastName}` : 'Unknown Member'
  }

  const getGroupName = (groupId: number) => {
    const group = groups.find(g => g.id === groupId)
    return group ? group.name : 'Unknown Group'
  }

  // Filter members based on search term (memoized for performance)
  const filteredMembers = useMemo(() => {
    const matchingMembers = allMembers.filter(member => {
      const fullName = `${member.member.firstName} ${member.member.lastName}`.toLowerCase()
      return fullName.includes(memberSearchTerm.toLowerCase())
    })
    
    // Deduplicate members for display (keep only one entry per member)
    const memberMap = new Map()
    matchingMembers.forEach(member => {
      if (!memberMap.has(member.memberId)) {
        memberMap.set(member.memberId, member)
      }
    })
    
    return Array.from(memberMap.values())
  }, [allMembers, memberSearchTerm])

  // Handle member selection
  const handleMemberSelect = (memberId: number) => {
    handleInputChange('memberId', memberId)
    setMemberSearchTerm('')
    setIsMemberDropdownOpen(false)
    setSelectedMemberIndex(-1)
  }

  // Handle keyboard navigation
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

  return (
    <div className="payment-modal-test-page">
      <div className="payment-modal-test-header">
        <h1>Payment Modal Test Page</h1>
        <p>Test the new payment modal variants without affecting the database</p>
      </div>

      <div className="payment-modal-test-actions">
        <button 
          className="btn btn-primary" 
          onClick={openModal}
        >
          <Plus size={20} />
          Test Payment Modal
        </button>
        <button 
          className="btn btn-danger" 
          onClick={clearSavedPayments}
        >
          Clear Saved Payments
        </button>
      </div>

      {/* Saved Payments Display */}
      <div className="saved-payments-section">
        <h2>Saved Test Payments ({savedPayments.length})</h2>
        {savedPayments.length === 0 ? (
          <p>No test payments saved yet.</p>
        ) : (
          <div className="saved-payments-list">
            {savedPayments.map((payment) => (
              <div key={payment.id} className="saved-payment-card">
                <div className="saved-payment-header">
                  <h3>{getMemberName(payment.formData.memberId)} - {getGroupName(payment.formData.groupId)}</h3>
                  <span className="saved-payment-timestamp">
                    {new Date(payment.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="saved-payment-details">
                  <div className="saved-payment-detail">
                    <strong>Amount:</strong> SRD {payment.formData.amount.toLocaleString()}
                  </div>
                  <div className="saved-payment-detail">
                    <strong>Status:</strong> {payment.formData.status}
                  </div>
                  <div className="saved-payment-detail">
                    <strong>Method:</strong> {payment.formData.paymentMethod}
                  </div>
                  <div className="saved-payment-detail">
                    <strong>Date:</strong> {payment.formData.paymentDate}
                  </div>
                  {payment.formData.notes && (
                    <div className="saved-payment-detail">
                      <strong>Notes:</strong> {payment.formData.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Modal */}
      {isModalOpen && (
        <div className="payment-modal-overlay">
          <div className="payment-modal-content payment-modal-container">
            <div className="payment-modal-header">
              <h2>Test Payment Modal</h2>
              <button className="payment-modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={modalVariant === 'multi-group' ? handleMultiGroupSubmit : handleSubmit} className="payment-modal-form">
              {/* Workflow Selection */}
              <div className="workflow-selection-section">
                <label htmlFor="workflowSelect">
                  <Building2 size={16} />
                  Payment Workflow *
                </label>
                <select
                  id="workflowSelect"
                  value={modalVariant}
                  onChange={(e) => handleWorkflowChange(e.target.value as 'group-first' | 'member-first' | 'multi-group')}
                  className="workflow-dropdown"
                >
                  <option value="group-first">
                    <Building2 size={16} />
                    Group First - Select group, then member, then slot
                  </option>
                  <option value="member-first">
                    <Users size={16} />
                    Member First - Select member, then group, then slot
                  </option>
                  <option value="multi-group">
                    <Plus size={16} />
                    Multi-Group - Select member, then multiple groups
                  </option>
                </select>
                <small className="payment-modal-form-help">
                  Choose how you want to record the payment
                </small>
              </div>

              {/* Group-First Variant */}
              {modalVariant === 'group-first' && (
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
                      onChange={(e) => handleInputChange('groupId', Number(e.target.value))}
                      className={errors.groupId ? 'error' : ''}
                    >
                      <option value={0}>Select a group</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    {errors.groupId && <span className="payment-modal-error-message">{errors.groupId}</span>}
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
                  </div>
                </>
              )}

              {/* Member-First Variant */}
              {modalVariant === 'member-first' && (
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
                      Available members: {allMembers.length} | Groups loaded: {groups.length} | Showing: {filteredMembers.length}
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
                        : `Available groups: ${memberGroups.length}`
                      }
                    </small>
                  </div>
                </>
              )}

              {/* Multi-Group Variant */}
              {modalVariant === 'multi-group' && (
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
                            setMemberGroupsForMulti([])
                            setSelectedGroupsForMulti(new Set())
                            setGroupSlotsForMulti({})
                            setSelectedSlotsForMulti({})
                            setGroupAmountsForMulti({})
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
                      Select a member to see their groups
                    </small>
                  </div>

                  {/* Group Selection for Multi-Group */}
                  {selectedMemberForMulti && (
                    <div className="payment-modal-form-group full-width">
                      <label>
                        <Building2 size={16} />
                        Select Groups to Pay For *
                      </label>
                      {isLoadingMemberGroups ? (
                        <div className="payment-modal-loading">Loading groups...</div>
                      ) : (
                        <div className="multi-group-selection">
                          {memberGroupsForMulti.map(group => {
                            const hasSlots = groupSlotsForMulti[group.id] && groupSlotsForMulti[group.id].length > 0
                            const isSelected = selectedGroupsForMulti.has(group.id)
                            const amount = groupAmountsForMulti[group.id] || 0
                            
                            return (
                              <div key={group.id} className={`multi-group-item ${!hasSlots ? 'no-slots' : ''} ${isSelected ? 'selected' : ''}`}>
                                <div className="multi-group-main-row">
                                  <label className="multi-group-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleGroupToggleForMulti(group.id)}
                                      disabled={!hasSlots}
                                    />
                                    <span className="multi-group-info">
                                      <span className="multi-group-name">{group.name}</span>
                                      <span className="multi-group-amount">SRD {amount.toLocaleString()}</span>
                                    </span>
                                  </label>
                                  
                                  {isSelected && hasSlots && (
                                    <div className="multi-group-slot-selection">
                                      <label htmlFor={`slot-${group.id}`}>Slot:</label>
                                      <select
                                        id={`slot-${group.id}`}
                                        value={selectedSlotsForMulti[group.id] || ''}
                                        onChange={(e) => handleSlotChangeForMulti(group.id, e.target.value)}
                                      >
                                        <option value="">Choose slot</option>
                                        {groupSlotsForMulti[group.id]?.map(slot => (
                                          <option key={slot.id} value={slot.id}>
                                            {paymentSlotService.formatMonthDate(slot.monthDate)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                                
                                {!hasSlots && (
                                  <div className="multi-group-no-slots">
                                    No available slots for this group
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <small className="payment-modal-form-help">
                        {selectedGroupsForMulti.size > 0 
                          ? `Selected ${selectedGroupsForMulti.size} group(s)`
                          : 'Select one or more groups to pay for'
                        }
                      </small>
                    </div>
                  )}
                </>
              )}

              {/* Slot Selection (Common to both variants) - Hidden for multi-group */}
              {modalVariant !== 'multi-group' && (
                <div className="payment-modal-form-group">
                  <label htmlFor="slotId">
                    <Calendar size={16} />
                    Slot (Month-Year) *
                  </label>
                  <select
                    id="slotId"
                    value={formData.slotId || ''}
                    onChange={(e) => handleInputChange('slotId', e.target.value)}
                    disabled={!formData.memberId || !formData.groupId}
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
              {modalVariant !== 'multi-group' && (
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
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.paymentDate ? 'error' : ''}
                />
                {errors.paymentDate && <span className="payment-modal-error-message">{errors.paymentDate}</span>}
              </div>

              {/* Payment Month */}
              <div className="payment-modal-form-group">
                <label htmlFor="paymentMonth">
                  <Calendar size={16} />
                  Payment Month
                </label>
                <input
                  type="month"
                  id="paymentMonth"
                  value={formData.paymentMonth}
                  onChange={(e) => handleInputChange('paymentMonth', e.target.value)}
                />
                <small className="payment-modal-form-help">Defaults to current month. Editable.</small>
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
              </div>

              {/* Bank Selection Fields */}
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

              {/* Test Notice */}
              <div className="payment-modal-test-notice full-width">
                <p>🧪 This is a test modal - data will be saved to local storage only, not the database.</p>
              </div>

              {/* Form Actions */}
              <div className="payment-modal-form-actions">
                <button type="button" className="payment-modal-btn payment-modal-btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="payment-modal-btn" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save to Local Storage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentModalTest
