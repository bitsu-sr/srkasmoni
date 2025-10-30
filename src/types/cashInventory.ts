// Cash Inventory Types for Financial Management

export interface CashInventory {
  id: number
  denomination: number
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface CashInventoryFormData {
  denomination: number
  quantity: number
}

export interface CashInventoryStats {
  totalCash: number
  denominations: Array<{
    denomination: number
    quantity: number
    subtotal: number
  }>
}

export interface FinancialStats {
  totalAssets: number
  totalCash: number
  topBank1: {
    name: string
    amount: number
  } | null
  topBank2: {
    name: string
    amount: number
  } | null
  allBanks: Array<{
    bankName: string
    totalAmount: number
    paymentCount: number
  }>
}

