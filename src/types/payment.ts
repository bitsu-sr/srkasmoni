export interface Payment {
  id: number
  memberId: number
  groupId: number
  slotId: number
  paymentDate: string
  paymentMonth: string
  amount: number
  paymentMethod: 'cash' | 'bank_transfer'
  senderBankId?: number
  receiverBankId?: number
  status: 'not_paid' | 'pending' | 'received' | 'settled'
  notes?: string
  fineAmount: number
  isLatePayment: boolean
  paymentDeadline: string
  transferred: boolean
  createdAt: string
  updatedAt: string
  // Joined data
  member?: Member
  group?: Group
  slot?: PaymentSlot
  senderBank?: Bank
  receiverBank?: Bank
}

export interface PaymentFormData {
  memberId: number
  groupId: number
  slotId: number | string
  paymentDate: string
  paymentMonth: string
  amount: number
  paymentMethod: 'cash' | 'bank_transfer'
  senderBankId?: number
  receiverBankId?: number
  status: 'not_paid' | 'pending' | 'received' | 'settled'
  notes?: string
  fineAmount?: number
  isLatePayment?: boolean
  paymentDeadline?: string
  transferred?: boolean
}

export interface PaymentFilters {
  search?: string
  status?: string
  paymentMethod?: string
  groupId?: number
  memberId?: number
  startDate?: string
  endDate?: string
}

export interface PaymentStats {
  totalPayments: number
  totalAmount: number
  receivedAmount: number
  pendingAmount: number
  notPaidAmount: number
  settledAmount: number
  cashPayments: number
  bankTransferPayments: number
  receivedCount: number
  pendingCount: number
  notPaidCount: number
  settledCount: number
}

// Import types from existing files
import type { Member } from './member'
import type { Group } from './member'
import type { Bank } from './bank'
import type { PaymentSlot } from './paymentSlot'
