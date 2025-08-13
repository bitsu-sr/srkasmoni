import { useState, useEffect } from 'react'
import { X, User, Building2, Calendar, DollarSign, CreditCard, Banknote } from 'lucide-react'
import type { Payment, PaymentFormData } from '../types/payment'
import type { Group } from '../types/member'
import type { Bank } from '../types/bank'
import type { GroupMember, PaymentSlot } from '../types/paymentSlot'
import { paymentSlotService } from '../services/paymentSlotService'
import { groupService } from '../services/groupService'
import { bankService } from '../services/bankService'
import './PaymentModal.css'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (payment: PaymentFormData) => void
  payment?: Payment
  isEditing?: boolean
}

const PaymentModal = ({ isOpen, onClose, onSave, payment, isEditing = false }: PaymentModalProps) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    memberId: 0,
    groupId: 0,
    slotId: 0,
    paymentDate: new Date().toISOString().split('T')[0],
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

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadGroups()
      loadBanks()
      if (payment && isEditing) {
        setFormData({
          memberId: payment.memberId,
          groupId: payment.groupId,
          slotId: payment.slotId,
          paymentDate: payment.paymentDate,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          senderBankId: payment.senderBankId,
          receiverBankId: payment.receiverBankId,
          notes: payment.notes || ''
        })
        // Load cascading data for editing
        loadGroupMembers(payment.groupId)
        loadMemberSlots(payment.memberId, payment.groupId)
      }
    }
  }, [isOpen, payment, isEditing])

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
        slotId: 0,
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
      const slots = await paymentSlotService.getMemberSlots(memberId, groupId)
      setMemberSlots(slots)
      // Clear slot selection when member changes, but keep the amount
      setFormData(prev => ({
        ...prev,
        slotId: 0
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
    if (formData.paymentMethod === 'bank_transfer') {
      if (!formData.senderBankId) newErrors.senderBankId = 'Sender bank is required for bank transfer'
      if (!formData.receiverBankId) newErrors.receiverBankId = 'Receiver bank is required for bank transfer'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save payment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGroupChange = (groupId: number) => {
    handleInputChange('groupId', groupId)
    loadGroupMonthlyAmount(groupId)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content payment-modal">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Payment' : 'Record New Payment'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="payment-form">
          {/* Group Selection */}
          <div className="form-group">
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
            {errors.groupId && <span className="error-message">{errors.groupId}</span>}
          </div>

          {/* Member Selection */}
          <div className="form-group">
            <label htmlFor="memberId">
              <User size={16} />
              Group Member *
            </label>
            <select
              id="memberId"
              value={formData.memberId}
              onChange={(e) => handleInputChange('memberId', Number(e.target.value))}
              disabled={!formData.groupId}
              className={errors.memberId ? 'error' : ''}
            >
              <option value={0}>Select a member</option>
              {groupMembers.map(member => (
                <option key={member.id} value={member.member.id}>
                  {member.member.firstName} {member.member.lastName}
                </option>
              ))}
            </select>
            {errors.memberId && <span className="error-message">{errors.memberId}</span>}
          </div>

          {/* Slot Selection */}
          <div className="form-group">
            <label htmlFor="slotId">
              <Calendar size={16} />
              Slot (Month-Year) *
            </label>
            <select
              id="slotId"
              value={formData.slotId}
              onChange={(e) => handleInputChange('slotId', Number(e.target.value))}
              disabled={!formData.memberId}
              className={errors.slotId ? 'error' : ''}
            >
              <option value={0}>Select a slot</option>
              {memberSlots.map(slot => (
                <option key={slot.id} value={slot.id}>
                  {paymentSlotService.formatMonthDate(slot.monthDate)}
                </option>
              ))}
            </select>
            {errors.slotId && <span className="error-message">{errors.slotId}</span>}
            <small className="form-help">Available slots: {memberSlots.length}</small>
          </div>

          {/* Amount (Read-only) */}
          <div className="form-group">
            <label htmlFor="amount">
              <DollarSign size={16} />
              Amount *
            </label>
            <input
              type="text"
              id="amount"
              value={`SRD ${formData.amount.toLocaleString()}`}
              readOnly
              className="readonly"
            />
            <small className="form-help">Amount is locked to group's monthly amount</small>
          </div>

          {/* Payment Date */}
          <div className="form-group">
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
            {errors.paymentDate && <span className="error-message">{errors.paymentDate}</span>}
          </div>

          {/* Payment Method Toggle */}
          <div className="form-group">
            <label>Payment Method *</label>
            <div className="payment-method-toggle">
              <button
                type="button"
                className={`toggle-option ${formData.paymentMethod === 'bank_transfer' ? 'active' : ''}`}
                onClick={() => handleInputChange('paymentMethod', 'bank_transfer')}
              >
                <CreditCard size={16} />
                Bank Transfer
              </button>
              <button
                type="button"
                className={`toggle-option ${formData.paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => handleInputChange('paymentMethod', 'cash')}
              >
                <Banknote size={16} />
                Cash
              </button>
            </div>
          </div>

          {/* Bank Selection Fields (only visible for bank transfer) */}
          {formData.paymentMethod === 'bank_transfer' && (
            <>
              <div className="form-group">
                <label htmlFor="senderBankId">
                  <CreditCard size={16} />
                  Sender's Bank *
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
                {errors.senderBankId && <span className="error-message">{errors.senderBankId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="receiverBankId">
                  <CreditCard size={16} />
                  Receiver's Bank *
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
                {errors.receiverBankId && <span className="error-message">{errors.receiverBankId}</span>}
              </div>
            </>
          )}

          {/* Status Selection */}
          <div className="form-group">
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
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? 'Saving...' : (isEditing ? 'Update Payment' : 'Record Payment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentModal
