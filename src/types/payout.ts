export interface Payout {
  id: number
  slotId: number // References group_members.id - the actual slot
  memberName: string
  memberId: number
  nationalId: string
  groupName: string
  groupId: number
  monthlyAmount: number
  totalAmount: number
  duration: number
  receiveMonth: string
  status: 'completed' | 'pending' | 'processing' | 'failed' | string
  paymentDate?: string
  bankName: string
  accountNumber: string
  // New fields for payout details
  lastSlot?: boolean
  administrationFee?: boolean
  payout?: boolean
  additionalCost?: number
  settledDeduction?: number
  calculatedTotalAmount?: number
  settledDeductionEnabled?: boolean
}

// New interface for payout details modal data
export interface PayoutDetails {
  id?: number
  slotId: number // References group_members.id - the actual slot
  groupId: number
  memberId: number
  monthlyAmount: number
  duration: number
  lastSlot: boolean
  administrationFee: boolean
  payout: boolean
  additionalCost: number
  payoutDate: string
  payoutMonth: string
  baseAmount: number
  settledDeduction: number
  // Payment information
  paymentMethod: 'bank_transfer' | 'cash'
  senderBankId: number | null
  receiverBankId: number | null
  notes?: string
}

export type FilterType = 'all' | 'memberName' | 'groupName' | 'bankName'
export type StatusFilter = 'all' | 'completed' | 'pending' | 'processing' | 'failed'
export type SortField = 'memberName' | 'groupName' | 'totalAmount' | 'toReceive' | 'status' | 'receiveMonth'
export type SortDirection = 'asc' | 'desc'

