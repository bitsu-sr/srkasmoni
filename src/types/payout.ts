export interface Payout {
  id: number
  memberName: string
  memberId: number
  nationalId: string
  groupName: string
  groupId: number
  monthlyAmount: number
  totalAmount: number
  duration: number
  receiveMonth: string
  status: 'completed' | 'pending' | 'processing' | 'failed'
  paymentDate?: string
  bankName: string
  accountNumber: string
  // New fields for payout details
  lastSlot?: boolean
  administrationFee?: boolean
  payout?: boolean
}

// New interface for payout details modal data
export interface PayoutDetails {
  id?: number
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
export type SortField = 'memberName' | 'groupName' | 'totalAmount' | 'status' | 'receiveMonth'
export type SortDirection = 'asc' | 'desc'

