export interface Payout {
  id: number
  memberName: string
  memberId: number
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
}

export type FilterType = 'all' | 'memberName' | 'groupName' | 'bankName'
export type StatusFilter = 'all' | 'completed' | 'pending' | 'processing' | 'failed'
export type SortField = 'memberName' | 'groupName' | 'totalAmount' | 'status' | 'receiveMonth'
export type SortDirection = 'asc' | 'desc'

