import { useState, useEffect } from 'react'
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
import './PaymentModal.css'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payment: PaymentFormData) => void
  payment?: Payment
  isEditing?: boolean
  prefillData?: Partial<PaymentFormData>
}

const PaymentModal = ({ isOpen, onClose, onSave, payment, isEditing = false, prefillData }: PaymentModalProps) => {
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicateWarning, setDuplicateWarning] = useState<string>('')

     // Load initial data
   useEffect(() => {
     if (isOpen) {
       loadGroups()
       loadBanks()
       
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
         loadGroups()
         loadBanks()
       }
     }
   }, [isOpen, payment, isEditing, prefillData])

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
           // Check if a payment already exists for this member, group, and slot/month
           const isDuplicate = await paymentService.checkDuplicatePayment(formData)
           if (isDuplicate) {
             setDuplicateWarning('⚠️ A payment for this member, group, and month already exists. Duplicate payments are not allowed.')
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

  const handleInputChange = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Handle cascading updates
    if (field === 'groupId') {
      loadGroupMembers(value)
    } else if (field === 'memberId') {
      loadMemberSlots(value, formData.groupId)
    } else if (field === 'slotId') {
      // Amount is already set when group is selected
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
    
    // Debug logging
    console.log('🔍 Form submission data:', formData)
    
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
      <div className="payment-modal-content payment-modal-container">
        <div className="payment-modal-header">
          <h2>{isEditing ? 'Edit Payment' : 'Record New Payment'}</h2>
          <button className="payment-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="payment-modal-form">
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
             <small className="payment-modal-form-help">
               Debug: formData.memberId = {formData.memberId}, 
               groupMembers count = {groupMembers.length}, 
               first member id = {groupMembers[0]?.member?.id}
             </small>
           </div>

                     {/* Slot Selection */}
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

          {/* Amount (Read-only) */}
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

          {/* Payment Month (YYYY-MM) */}
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
        </form>
      </div>
    </div>
  )
}

export default PaymentModal
