export interface PaymentLog {
  id: number
  paymentId?: number
  memberId?: number
  groupId?: number
  slotId?: number
  action: 'created' | 'updated' | 'deleted' | 'status_changed'
  oldStatus?: string
  newStatus?: string
  oldAmount?: number
  newAmount?: number
  oldPaymentMethod?: string
  newPaymentMethod?: string
  oldNotes?: string
  newNotes?: string
  oldPaymentDate?: string
  newPaymentDate?: string
  oldSenderBankId?: number
  newSenderBankId?: number
  oldReceiverBankId?: number
  newReceiverBankId?: number
  changesSummary?: string
  createdAt: string
  // Since we don't have foreign key joins, these will be undefined
  member?: {
    id: number
    firstName: string
    lastName: string
  }
  group?: {
    id: number
    name: string
  }
  slot?: {
    id: number
    monthDate: string
  }
  senderBank?: {
    id: number
    name: string
  }
  receiverBank?: {
    id: number
    name: string
  }
}

export interface PaymentLogFilters {
  search?: string
  action?: string
  memberId?: number
  groupId?: number
  startDate?: string
  endDate?: string
  status?: string
}
